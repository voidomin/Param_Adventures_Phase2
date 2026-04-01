import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendRefundResolved,
  sendWelcomeEmail,
  sendRoleAssignedEmail,
  sendTripCompletedEmail,
  sendResetPasswordEmail,
  sendAdminInviteEmail,
} from "@/lib/email";

// Mock the rendering engine to prevent React components from rendering real HTML
// which is slow and unnecessary for testing the email dispatch logic.
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>mocked email content</html>"),
}));

const { mockProvider } = vi.hoisted(() => ({
  mockProvider: {
    send: vi.fn().mockResolvedValue({ id: "mock-id" }),
  },
}));

vi.mock("@/lib/email/factory", () => ({
  emailFactory: {
    getProvider: vi.fn().mockResolvedValue({
      provider: mockProvider,
      from: "test@paramadventures.in",
    }),
  },
}));

// We test the fallback "console logging" branch since our tests run without SMTP env variables.
describe("Email Utilities", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sends booking confirmation emails", async () => {
    await sendBookingConfirmation({
      userName: "Jane Doe",
      userEmail: "jane@test.com",
      experienceTitle: "Chadar Trek",
      slotDate: "2024-01-01",
      participantCount: 2,
      totalPrice: 50000,
      bookingId: "b-123",
    });

    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "jane@test.com",
      subject: expect.stringContaining("Booking Confirmed"),
    }));
  });

  it("sends booking cancellation emails", async () => {
    await sendBookingCancellation({
      userName: "John Smith",
      userEmail: "john@test.com",
      experienceTitle: "Spiti Valley",
      slotDate: "2024-05-01",
      refundPreference: "COUPON",
    });

    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      to: "john@test.com",
      subject: expect.stringContaining("Booking Cancelled"),
    }));
  });

  it("sends refund resolved emails (Coupon)", async () => {
    await sendRefundResolved({
      userName: "Alice",
      userEmail: "alice@test.com",
      experienceTitle: "Goechala",
      slotDate: "2024-04-01",
      refundPreference: "COUPON",
      refundNote: "100% coupon issued",
      totalPrice: 20000,
    });

    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("Coupon Issued"),
    }));
  });

  it("sends refund resolved emails (Bank)", async () => {
    await sendRefundResolved({
      userName: "Alice",
      userEmail: "alice@test.com",
      experienceTitle: "Goechala",
      slotDate: "2024-04-01",
      refundPreference: "BANK_REFUND",
      refundNote: "Refund processed",
      totalPrice: 20000,
    });

    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("Refund Processed"),
    }));
  });

  it("sends welcome emails", async () => {
    await sendWelcomeEmail({ userName: "Bob", userEmail: "bob@test.com" });
    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("Welcome"),
    }));
  });

  it("sends role assigned emails", async () => {
    await sendRoleAssignedEmail({ userName: "Eve", userEmail: "eve@test.com", roleName: "TREK_LEAD" });
    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("Role Updated"),
    }));
  });

  it("sends trip completed emails", async () => {
    await sendTripCompletedEmail({ userName: "Eve", userEmail: "eve@test.com", experienceTitle: "Kedarkantha", experienceSlug: "kedarkantha" });
    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("Hope you enjoyed"),
    }));
  });

  it("sends password reset emails", async () => {
    await sendResetPasswordEmail({ userName: "Eve", userEmail: "eve@test.com", resetLink: "https://link" });
    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("Reset your Param Adventures password"),
    }));
  });

  it("sends admin invite emails", async () => {
    await sendAdminInviteEmail({ userName: "Eve", userEmail: "eve@test.com", setupLink: "https://link" });
    expect(mockProvider.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining("Welcome"),
    }));
  });
});
