import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findUnique: vi.fn(),
    },
  },
  runWithRetry: vi.fn((fn) => fn()),
}));

vi.mock("@/repositories/booking.repo", () => ({
  BookingRepo: {
    getTaxConfig: vi.fn(),
  },
}));

import { BookingService } from "@/services/booking.service";
import { prisma } from "@/lib/db";
import { BookingRepo } from "@/repositories/booking.repo";

describe("BookingService.calculatePricing", () => {
  it("calculates pricing when extraAmenities is object/array instead of string", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({
      basePrice: 5000,
      extraAmenities: [
        {
          id: "g1",
          name: "Group 1",
          type: "SINGLE",
          options: [{ id: "o1", name: "Option 1", price: 500 }],
        },
      ],
    } as any);

    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue(null);

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "John Doe",
          isPrimary: true,
          email: "john@example.com",
          phoneNumber: "1234567890",
          gender: "MALE",
          dateOfBirth: "1990-01-01",
          selectedAmenities: [{ groupId: "g1", optionId: "o1" }],
        },
      ],
    };

    const result = await BookingService.calculatePricing(bookingInput);
    expect(result.baseFare).toBe(5500); // 5000 + 500
    expect(result.totalPrice).toBe(5500);
    expect(result.taxBreakdown).toEqual([]);
  });

  it("applies taxes successfully when taxConfig is valid JSON", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({
      basePrice: 5000,
      extraAmenities: null,
    } as any);

    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue({
      key: "taxConfig",
      value: JSON.stringify([{ name: "GST", percentage: 5 }]),
    } as any);

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "John Doe",
          isPrimary: true,
          email: "john@example.com",
          phoneNumber: "1234567890",
          gender: "MALE",
          dateOfBirth: "1990-01-01",
        },
      ],
    };

    const result = await BookingService.calculatePricing(bookingInput);
    expect(result.baseFare).toBe(5000);
    expect(result.totalPrice).toBe(5250); // 5000 + 5%
    expect(result.taxBreakdown).toEqual([{ name: "GST", percentage: 5, amount: 250 }]);
  });

  it("handles catch block gracefully when taxConfig contains invalid JSON", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue({
      basePrice: 5000,
      extraAmenities: null,
    } as any);

    vi.mocked(BookingRepo.getTaxConfig).mockResolvedValue({
      key: "taxConfig",
      value: "invalid-json",
    } as any);

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "John Doe",
          isPrimary: true,
          email: "john@example.com",
          phoneNumber: "1234567890",
          gender: "MALE",
          dateOfBirth: "1990-01-01",
        },
      ],
    };

    const result = await BookingService.calculatePricing(bookingInput);
    expect(result.baseFare).toBe(5000);
    expect(result.totalPrice).toBe(5000);
    expect(result.taxBreakdown).toEqual([]);
  });

  it("throws error if experience is not found", async () => {
    vi.mocked(prisma.experience.findUnique).mockResolvedValue(null);

    const bookingInput = {
      experienceId: "exp-invalid",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [],
    };

    await expect(BookingService.calculatePricing(bookingInput)).rejects.toThrow("EXPERIENCE_NOT_FOUND");
  });
});
