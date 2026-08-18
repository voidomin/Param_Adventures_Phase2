import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => {
  const mockPrisma = {
    slot: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      updateMany: vi.fn(),
    },
    bookingParticipant: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return {
    prisma: mockPrisma,
    runWithRetry: vi.fn((fn) => fn()),
  };
});

import { autoCompletePastTrips } from "@/lib/trip-lifecycle";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.slot.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);

describe("Trip Lifecycle Module - autoCompletePastTrips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 completedCount when no candidate slots match criteria", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await autoCompletePastTrips();

    expect(result).toEqual({ completedCount: 0, unlockedBookingsCount: 0 });
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("auto-completes past slots 24h after trek end date and unlocks bookings", async () => {
    const pastSlotDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    mockFindMany.mockResolvedValue([
      {
        id: "slot-1",
        date: pastSlotDate,
        status: "UPCOMING",
        experience: { durationDays: 1 },
        bookings: [{ id: "b1", attended: false, canReview: false }],
      },
    ] as any);

    const mockSlotUpdate = vi.fn().mockResolvedValue({});
    const mockBookingUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const mockParticipantUpdateMany = vi.fn().mockResolvedValue({ count: 4 });

    mockTransaction.mockImplementation(async (cb: any) =>
      cb({
        slot: { update: mockSlotUpdate },
        booking: { updateMany: mockBookingUpdateMany },
        bookingParticipant: { updateMany: mockParticipantUpdateMany },
      })
    );

    const result = await autoCompletePastTrips();

    expect(result).toEqual({ completedCount: 1, unlockedBookingsCount: 2 });
    expect(mockSlotUpdate).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: expect.objectContaining({ status: "COMPLETED" }),
    });
    expect(mockBookingUpdateMany).toHaveBeenCalledWith({
      where: { slotId: "slot-1", bookingStatus: "CONFIRMED" },
      data: { canReview: true, attended: true },
    });
  });

  it("skips auto-completion if multi-day trek has not reached +24h past trek end", async () => {
    const recentSlotDate = new Date(Date.now() - 20 * 60 * 60 * 1000); // Started 20 hours ago

    mockFindMany.mockResolvedValue([
      {
        id: "slot-multi-day",
        date: recentSlotDate,
        status: "TREK_STARTED",
        experience: { durationDays: 3 }, // 3-day trek, so ends in 2.5 days
        bookings: [],
      },
    ] as any);

    const result = await autoCompletePastTrips();

    expect(result).toEqual({ completedCount: 0, unlockedBookingsCount: 0 });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("handles catch block gracefully and returns zeros on error", async () => {
    mockFindMany.mockRejectedValue(new Error("Database connection error"));

    const result = await autoCompletePastTrips();

    expect(result).toEqual({ completedCount: 0, unlockedBookingsCount: 0 });
  });
});
