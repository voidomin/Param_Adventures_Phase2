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

// We test the fallback "console logging" branch since our tests run without SMTP env variables.
describe("Email Utilities", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs booking confirmation emails via fallback warning", async () => {
    await sendBookingConfirmation({
      userName: "Jane Doe",
      userEmail: "jane@test.com",
      experienceTitle: "Chadar Trek",
      slotDate: "2024-01-01",
      participantCount: 2,
      totalPrice: 50000,
      bookingId: "b-123",
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith("⚠️ SMTP credentials not configured. Logging email to console.");
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("To: jane@test.com"));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Subject: Booking Confirmed — Chadar Trek"));
  });

  it("logs booking cancellation emails", async () => {
    await sendBookingCancellation({
      userName: "John Smith",
      userEmail: "john@test.com",
      experienceTitle: "Spiti Valley",
      slotDate: "2024-05-01",
      refundPreference: "COUPON",
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("To: john@test.com"));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Subject: Booking Cancelled — Spiti Valley"));
  });

  it("logs refund resolved emails (Coupon)", async () => {
    await sendRefundResolved({
      userName: "Alice",
      userEmail: "alice@test.com",
      experienceTitle: "Goechala",
      slotDate: "2024-04-01",
      refundPreference: "COUPON",
      refundNote: "100% coupon issued",
      totalPrice: 20000,
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Subject: Coupon Issued — Goechala"));
  });

  it("logs refund resolved emails (Bank)", async () => {
    await sendRefundResolved({
      userName: "Alice",
      userEmail: "alice@test.com",
      experienceTitle: "Goechala",
      slotDate: "2024-04-01",
      refundPreference: "BANK_REFUND",
      refundNote: "Refund processed",
      totalPrice: 20000,
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Subject: Refund Processed — Goechala"));
  });

  it("logs welcome emails", async () => {
    await sendWelcomeEmail({ userName: "Bob", userEmail: "bob@test.com" });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Subject: Welcome to Param Adventures! 🏔️"));
  });

  it("logs role assigned emails", async () => {
    await sendRoleAssignedEmail({ userName: "Eve", userEmail: "eve@test.com", roleName: "TREK_LEAD" });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Subject: Role Updated: TREK LEAD"));
  });

  it("logs trip completed emails", async () => {
    await sendTripCompletedEmail({ userName: "Eve", userEmail: "eve@test.com", experienceTitle: "Kedarkantha", experienceSlug: "kedarkantha" });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Hope you enjoyed Kedarkantha!"));
  });

  it("logs password reset emails", async () => {
    await sendResetPasswordEmail({ userName: "Eve", userEmail: "eve@test.com", resetLink: "http://link" });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Reset your Param Adventures password"));
  });

  it("logs admin invite emails", async () => {
    await sendAdminInviteEmail({ userName: "Eve", userEmail: "eve@test.com", setupLink: "http://link" });
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Welcome to Param Adventures Admin Team!"));
  });
});
