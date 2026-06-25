import { describe, expect, it, vi, beforeEach } from "vitest";
import { BookingRepo } from "@/repositories/booking.repo";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      create: vi.fn(),
    },
  },
}));

describe("BookingRepo.createBooking", () => {
  const mockTx = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      create: vi.fn(),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user profile with missing fields from the primary participant", async () => {
    mockTx.user.findUnique.mockResolvedValue({
      name: "",
      phoneNumber: "0000000000",
      gender: null,
      dateOfBirth: null,
      bloodGroup: "",
      emergencyContactName: null,
      emergencyContactNumber: null,
      emergencyRelationship: null,
      age: null,
    });

    mockTx.booking.create.mockResolvedValue({ id: "bk-1" });

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "Jane Doe",
          isPrimary: true,
          email: "jane@example.com",
          phoneNumber: "+919876543210",
          gender: "FEMALE",
          dateOfBirth: "1995-05-15",
          bloodGroup: "O+",
          emergencyContactName: "Emergency Contact",
          emergencyContactNumber: "+919999999999",
          emergencyRelationship: "Brother",
        },
      ],
    };

    await BookingRepo.createBooking(mockTx, "user-123", bookingInput, {
      totalPrice: 100,
      baseFare: 100,
      taxBreakdown: [],
    });

    // Verify mockTx.user.findUnique was called
    expect(mockTx.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-123" },
      select: expect.any(Object),
    });

    // Verify mockTx.user.update was called with correct mapped data
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: {
        name: "Jane Doe",
        phoneNumber: "+919876543210",
        gender: "FEMALE",
        dateOfBirth: new Date("1995-05-15"),
        age: expect.any(Number),
        bloodGroup: "O+",
        emergencyContactName: "Emergency Contact",
        emergencyContactNumber: "+919999999999",
        emergencyRelationship: "Brother",
      },
    });

    // Verify mockTx.booking.create was called
    expect(mockTx.booking.create).toHaveBeenCalled();
  });

  it("does not update user profile if all fields are already populated", async () => {
    mockTx.user.findUnique.mockResolvedValue({
      name: "Already Set",
      phoneNumber: "+911234567890",
      gender: "MALE",
      dateOfBirth: new Date("1990-01-01"),
      bloodGroup: "AB+",
      emergencyContactName: "Emergency Contact Name",
      emergencyContactNumber: "+911111111111",
      emergencyRelationship: "Spouse",
      age: 36,
    });

    mockTx.booking.create.mockResolvedValue({ id: "bk-2" });

    const bookingInput = {
      experienceId: "exp-1",
      slotId: "slot-1",
      participantCount: 1,
      paymentType: "FULL" as const,
      participants: [
        {
          name: "Jane Doe",
          isPrimary: true,
          email: "jane@example.com",
          phoneNumber: "+919876543210",
          gender: "FEMALE",
          dateOfBirth: "1995-05-15",
          bloodGroup: "O+",
          emergencyContactName: "Emergency Contact",
          emergencyContactNumber: "+919999999999",
          emergencyRelationship: "Brother",
        },
      ],
    };

    await BookingRepo.createBooking(mockTx, "user-123", bookingInput, {
      totalPrice: 100,
      baseFare: 100,
      taxBreakdown: [],
    });

    // Verify mockTx.user.update was not called
    expect(mockTx.user.update).not.toHaveBeenCalled();
  });
});
