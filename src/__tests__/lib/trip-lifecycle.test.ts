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
    user: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return {
    prisma: mockPrisma,
    runWithRetry: vi.fn((fn) => fn()),
  };
});

vi.mock("@/lib/email", () => ({
  sendManagerUnassignedAlert: vi.fn(),
  sendTrekLeadUnassignedAlert: vi.fn(),
}));

import {
  autoCompletePastTrips,
  autoStartTrips,
  sendStaffingEscalationAlerts,
} from "@/lib/trip-lifecycle";
import { prisma } from "@/lib/db";
import { sendManagerUnassignedAlert, sendTrekLeadUnassignedAlert } from "@/lib/email";

const mockFindMany = vi.mocked(prisma.slot.findMany);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockSlotUpdateDirect = vi.mocked(prisma.slot.update);
const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockSendManagerAlert = vi.mocked(sendManagerUnassignedAlert);
const mockSendTrekLeadAlert = vi.mocked(sendTrekLeadUnassignedAlert);

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

  it("defaults durationDays to 1 when slot.experience is null", async () => {
    const pastSlotDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    mockFindMany.mockResolvedValue([
      {
        id: "slot-no-exp",
        date: pastSlotDate,
        status: "UPCOMING",
        experience: null,
        bookings: [],
      },
    ] as any);

    const mockSlotUpdate = vi.fn().mockResolvedValue({});
    const mockBookingUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
    const mockParticipantUpdateMany = vi.fn().mockResolvedValue({ count: 0 });

    mockTransaction.mockImplementation(async (cb: any) =>
      cb({
        slot: { update: mockSlotUpdate },
        booking: { updateMany: mockBookingUpdateMany },
        bookingParticipant: { updateMany: mockParticipantUpdateMany },
      })
    );

    const result = await autoCompletePastTrips();

    expect(result).toEqual({ completedCount: 1, unlockedBookingsCount: 0 });
  });

  it("handles catch block gracefully and returns zeros on error", async () => {
    mockFindMany.mockRejectedValue(new Error("Database connection error"));

    const result = await autoCompletePastTrips();

    expect(result).toEqual({ completedCount: 0, unlockedBookingsCount: 0 });
  });
});

describe("Trip Lifecycle Module - autoStartTrips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 0 startedCount when no candidate slots match criteria", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await autoStartTrips();

    expect(result).toEqual({ startedCount: 0, skippedUnstaffedCount: 0 });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "UPCOMING", date: { lte: expect.any(Date) } } }),
    );
    expect(mockSlotUpdateDirect).not.toHaveBeenCalled();
  });

  it("starts a staffed UPCOMING slot whose date has arrived", async () => {
    mockFindMany.mockResolvedValue([
      { id: "slot-1", assignments: [{ id: "assignment-1" }] },
    ] as any);
    mockSlotUpdateDirect.mockResolvedValue({} as any);

    const result = await autoStartTrips();

    expect(result).toEqual({ startedCount: 1, skippedUnstaffedCount: 0 });
    expect(mockSlotUpdateDirect).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: expect.objectContaining({ status: "ACTIVE", startedAt: expect.any(Date) }),
    });
  });

  it("skips a slot with no Trek Lead assigned, leaving it at UPCOMING", async () => {
    mockFindMany.mockResolvedValue([
      { id: "slot-unstaffed", assignments: [] },
    ] as any);

    const result = await autoStartTrips();

    expect(result).toEqual({ startedCount: 0, skippedUnstaffedCount: 1 });
    expect(mockSlotUpdateDirect).not.toHaveBeenCalled();
  });

  it("processes a mix of staffed and unstaffed slots independently", async () => {
    mockFindMany.mockResolvedValue([
      { id: "slot-staffed", assignments: [{ id: "a1" }] },
      { id: "slot-unstaffed", assignments: [] },
      { id: "slot-staffed-2", assignments: [{ id: "a2" }] },
    ] as any);
    mockSlotUpdateDirect.mockResolvedValue({} as any);

    const result = await autoStartTrips();

    expect(result).toEqual({ startedCount: 2, skippedUnstaffedCount: 1 });
    expect(mockSlotUpdateDirect).toHaveBeenCalledTimes(2);
  });

  it("handles catch block gracefully and returns zeros on error", async () => {
    mockFindMany.mockRejectedValue(new Error("Database connection error"));

    const result = await autoStartTrips();

    expect(result).toEqual({ startedCount: 0, skippedUnstaffedCount: 0 });
  });
});

describe("Trip Lifecycle Module - sendStaffingEscalationAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zeros when no candidates in either tier", async () => {
    mockFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await sendStaffingEscalationAlerts();

    expect(result).toEqual({ managerAlertsSent: 0, trekLeadAlertsSent: 0 });
    expect(mockFindMany).toHaveBeenCalledTimes(2);
    expect(mockUserFindMany).not.toHaveBeenCalled();
    expect(mockSendManagerAlert).not.toHaveBeenCalled();
    expect(mockSendTrekLeadAlert).not.toHaveBeenCalled();
    expect(mockSlotUpdateDirect).not.toHaveBeenCalled();
  });

  it("emails every active admin for an unmanaged slot and stamps managerEscalationSentAt", async () => {
    const slotDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    mockFindMany
      .mockResolvedValueOnce([
        { id: "slot-1", date: slotDate, experience: { title: "Kodachadri Trek" } },
      ] as any)
      .mockResolvedValueOnce([]);
    mockUserFindMany.mockResolvedValue([
      { email: "admin1@paramadventures.in" },
      { email: "admin2@paramadventures.in" },
    ] as any);
    mockSlotUpdateDirect.mockResolvedValue({} as any);

    const result = await sendStaffingEscalationAlerts();

    expect(result).toEqual({ managerAlertsSent: 1, trekLeadAlertsSent: 0 });
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", role: { name: { in: ["ADMIN", "SUPER_ADMIN"] } } },
      }),
    );
    expect(mockSendManagerAlert).toHaveBeenCalledTimes(2);
    expect(mockSendManagerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: "admin1@paramadventures.in", tripName: "Kodachadri Trek" }),
    );
    expect(mockSlotUpdateDirect).toHaveBeenCalledWith({
      where: { id: "slot-1" },
      data: { managerEscalationSentAt: expect.any(Date) },
    });
  });

  it("emails the assigned manager for a staffed-but-leaderless slot and stamps trekLeadEscalationSentAt", async () => {
    const slotDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
    mockFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "slot-2",
        date: slotDate,
        experience: { title: "Kudremukh Trek" },
        manager: { name: "Priya", email: "priya@paramadventures.in" },
      },
    ] as any);
    mockSlotUpdateDirect.mockResolvedValue({} as any);

    const result = await sendStaffingEscalationAlerts();

    expect(result).toEqual({ managerAlertsSent: 0, trekLeadAlertsSent: 1 });
    expect(mockUserFindMany).not.toHaveBeenCalled();
    expect(mockSendTrekLeadAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: "priya@paramadventures.in",
        managerName: "Priya",
        tripName: "Kudremukh Trek",
        slotId: "slot-2",
      }),
    );
    expect(mockSlotUpdateDirect).toHaveBeenCalledWith({
      where: { id: "slot-2" },
      data: { trekLeadEscalationSentAt: expect.any(Date) },
    });
  });

  it("skips a tier-2 candidate defensively if it somehow has no manager relation loaded", async () => {
    mockFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "slot-3", date: new Date(), experience: { title: "Orphaned Slot" }, manager: null },
    ] as any);

    const result = await sendStaffingEscalationAlerts();

    expect(result).toEqual({ managerAlertsSent: 0, trekLeadAlertsSent: 0 });
    expect(mockSendTrekLeadAlert).not.toHaveBeenCalled();
    expect(mockSlotUpdateDirect).not.toHaveBeenCalled();
  });

  it("processes both tiers independently in the same run", async () => {
    mockFindMany
      .mockResolvedValueOnce([
        { id: "slot-unmanaged", date: new Date(), experience: { title: "Trip A" } },
      ] as any)
      .mockResolvedValueOnce([
        {
          id: "slot-unstaffed",
          date: new Date(),
          experience: { title: "Trip B" },
          manager: { name: "Raj", email: "raj@paramadventures.in" },
        },
      ] as any);
    mockUserFindMany.mockResolvedValue([{ email: "admin@paramadventures.in" }] as any);
    mockSlotUpdateDirect.mockResolvedValue({} as any);

    const result = await sendStaffingEscalationAlerts();

    expect(result).toEqual({ managerAlertsSent: 1, trekLeadAlertsSent: 1 });
    expect(mockSlotUpdateDirect).toHaveBeenCalledTimes(2);
  });

  it("handles catch block gracefully and returns zeros on error", async () => {
    mockFindMany.mockRejectedValue(new Error("Database connection error"));

    const result = await sendStaffingEscalationAlerts();

    expect(result).toEqual({ managerAlertsSent: 0, trekLeadAlertsSent: 0 });
  });
});
