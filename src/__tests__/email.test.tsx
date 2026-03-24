import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import React from "react";

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
}));

vi.mock("nodemailer", () => {
  const mockTransporter = {
    sendMail: mockSendMail,
  };
  return {
    default: {
      createTransport: vi.fn(() => mockTransporter),
    },
    createTransport: vi.fn(() => mockTransporter),
  };
});

// Also mock render
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>Email Content</html>"),
}));

// Mock the email components
vi.mock("@/components/emails/BookingConfirmedEmail", () => ({ default: () => <div /> }));
vi.mock("@/components/emails/BookingCancelledEmail", () => ({ default: () => <div /> }));
vi.mock("@/components/emails/RefundResolvedEmail", () => ({ default: () => <div /> }));
vi.mock("@/components/emails/WelcomeEmail", () => ({ default: () => <div /> }));
vi.mock("@/components/emails/RoleAssignedEmail", () => ({ default: () => <div /> }));
vi.mock("@/components/emails/TripCompletedEmail", () => ({ default: () => <div /> }));
vi.mock("@/components/emails/PasswordResetEmail", () => ({ default: () => <div /> }));
vi.mock("@/components/emails/AdminInviteEmail", () => ({ default: () => <div /> }));

describe("email library", () => {
  let emailLib: any;

  beforeAll(async () => {
    // Force environment variables before import
    process.env.SMTP_USER = "test@example.com";
    process.env.SMTP_PASS = "password_123";
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "465";
    
    // Use dynamic import to ensure the top-level code in lib/email.tsx sees the env
    emailLib = await import("../lib/email");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: "123" });
  });

  it("sends booking confirmation email", async () => {
    const data = {
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Trip",
      slotDate: "2024-01-01",
      participantCount: 2,
      totalPrice: 100,
      bookingId: "b1",
    };
    await emailLib.sendBookingConfirmation(data);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("sends booking cancellation email", async () => {
    const data = {
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Trip",
      slotDate: "2024-01-01",
      refundPreference: "COUPON" as const,
    };
    await emailLib.sendBookingCancellation(data);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("sends refund resolved email", async () => {
    const data = {
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Trip",
      slotDate: "2024-01-01",
      refundPreference: "BANK_REFUND" as const,
      refundNote: "UTR123",
      totalPrice: 100,
    };
    await emailLib.sendRefundResolved(data);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("sends welcome email", async () => {
    await emailLib.sendWelcomeEmail({ userName: "Test", userEmail: "test@example.com" });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("sends role assigned email", async () => {
    await emailLib.sendRoleAssignedEmail({ userName: "Test", userEmail: "test@example.com", roleName: "ADMIN" });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("sends trip completed email", async () => {
    await emailLib.sendTripCompletedEmail({ userName: "Test", userEmail: "test@example.com", experienceTitle: "Trip", experienceSlug: "trip" });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("sends reset password email", async () => {
    await emailLib.sendResetPasswordEmail({ userName: "Test", userEmail: "test@example.com", resetLink: "https://reset" });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("sends admin invite email", async () => {
    await emailLib.sendAdminInviteEmail({ userName: "Test", userEmail: "test@example.com", setupLink: "https://setup" });
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("handles sendMail failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSendMail.mockRejectedValueOnce(new Error("SMTP Error"));
    
    await emailLib.sendWelcomeEmail({ userName: "FailureTest", userEmail: "fail@example.com" });
    
    expect(mockSendMail).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });
});
