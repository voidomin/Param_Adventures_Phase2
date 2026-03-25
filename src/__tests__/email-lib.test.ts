import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSendMail, mockRender, mockCreateTransport } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
  mockRender: vi.fn(),
  mockCreateTransport: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
  createTransport: mockCreateTransport,
}));

vi.mock("@react-email/render", () => ({
  render: mockRender,
}));

vi.mock("@/components/emails/BookingConfirmedEmail", () => ({ default: () => null }));
vi.mock("@/components/emails/BookingCancelledEmail", () => ({ default: () => null }));
vi.mock("@/components/emails/RefundResolvedEmail", () => ({ default: () => null }));
vi.mock("@/components/emails/WelcomeEmail", () => ({ default: () => null }));
vi.mock("@/components/emails/RoleAssignedEmail", () => ({ default: () => null }));
vi.mock("@/components/emails/TripCompletedEmail", () => ({ default: () => null }));
vi.mock("@/components/emails/PasswordResetEmail", () => ({ default: () => null }));
vi.mock("@/components/emails/AdminInviteEmail", () => ({ default: () => null }));

type EmailLib = typeof import("@/lib/email");

async function loadEmailLib({
  smtpUser,
  smtpPass,
  smtpPort,
  smtpHost,
  smtpFrom,
}: {
  smtpUser?: string;
  smtpPass?: string;
  smtpPort?: string;
  smtpHost?: string;
  smtpFrom?: string;
}): Promise<EmailLib> {
  vi.resetModules();

  if (smtpUser === undefined) {
    delete process.env.SMTP_USER;
  } else {
    process.env.SMTP_USER = smtpUser;
  }

  if (smtpPass === undefined) {
    delete process.env.SMTP_PASS;
  } else {
    process.env.SMTP_PASS = smtpPass;
  }

  if (smtpPort === undefined) {
    delete process.env.SMTP_PORT;
  } else {
    process.env.SMTP_PORT = smtpPort;
  }
  if (smtpHost === undefined) {
    delete process.env.SMTP_HOST;
  } else {
    process.env.SMTP_HOST = smtpHost;
  }

  if (smtpFrom === undefined) {
    delete process.env.SMTP_FROM;
  } else {
    process.env.SMTP_FROM = smtpFrom;
  }

  mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });

  return import("@/lib/email");
}

describe("lib/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: "message-1" });
    mockRender.mockResolvedValue("<html>Email Content</html>");
  });

  it("logs and skips SMTP when credentials are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const emailLib = await loadEmailLib({
      smtpUser: undefined,
      smtpPass: undefined,
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    await emailLib.sendWelcomeEmail({ userName: "Test", userEmail: "test@example.com" });

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("sends booking confirmation with expected subject", async () => {
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    await emailLib.sendBookingConfirmation({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Everest Base Camp",
      slotDate: "2026-03-25",
      participantCount: 2,
      totalPrice: 10000,
      bookingId: "b1",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Booking Confirmed — Everest Base Camp",
      }),
    );
  });

  it("sends booking cancellation", async () => {
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    await emailLib.sendBookingCancellation({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Kedarkantha",
      slotDate: "2026-03-25",
      refundPreference: "COUPON",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Booking Cancelled — Kedarkantha",
      }),
    );
  });

  it("sends refund resolved with coupon label", async () => {
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    await emailLib.sendRefundResolved({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Har Ki Dun",
      slotDate: "2026-03-25",
      refundPreference: "COUPON",
      refundNote: "N/A",
      totalPrice: 5400,
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Coupon Issued — Har Ki Dun",
      }),
    );
  });

  it("sends refund resolved with bank label", async () => {
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    await emailLib.sendRefundResolved({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Har Ki Dun",
      slotDate: "2026-03-25",
      refundPreference: "BANK_REFUND",
      refundNote: "UTR123",
      totalPrice: 5400,
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Refund Processed — Har Ki Dun",
      }),
    );
  });

  it("sends role-assigned email with normalized role name", async () => {
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    await emailLib.sendRoleAssignedEmail({
      userName: "Test",
      userEmail: "test@example.com",
      roleName: "TREK_LEAD",
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Role Updated: TREK LEAD",
      }),
    );
  });

  it("sends trip completed, reset password and admin invite emails", async () => {
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    await emailLib.sendTripCompletedEmail({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Brahmatal",
      experienceSlug: "brahmatal",
    });
    await emailLib.sendResetPasswordEmail({
      userName: "Test",
      userEmail: "test@example.com",
      resetLink: "https://example.com/reset",
    });
    await emailLib.sendAdminInviteEmail({
      userName: "Test",
      userEmail: "test@example.com",
      setupLink: "https://example.com/setup",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(3);
  });

  it("handles transporter sendMail errors gracefully", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });
    mockSendMail.mockRejectedValueOnce(new Error("smtp down"));

    await emailLib.sendWelcomeEmail({ userName: "Test", userEmail: "test@example.com" });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("handles render errors gracefully", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });
    mockRender.mockRejectedValueOnce(new Error("render failed"));

    await emailLib.sendBookingConfirmation({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Everest Base Camp",
      slotDate: "2026-03-25",
      participantCount: 2,
      totalPrice: 10000,
      bookingId: "b1",
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("handles render errors for booking cancellation", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });
    mockRender.mockRejectedValueOnce(new Error("render failed"));

    await emailLib.sendBookingCancellation({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Kedarkantha",
      slotDate: "2026-03-25",
      refundPreference: "COUPON",
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("handles render errors for refund resolved", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });
    mockRender.mockRejectedValueOnce(new Error("render failed"));

    await emailLib.sendRefundResolved({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Har Ki Dun",
      slotDate: "2026-03-25",
      refundPreference: "BANK_REFUND",
      refundNote: "UTR123",
      totalPrice: 5400,
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("handles render errors for welcome, role, trip, reset and admin invite senders", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    mockRender.mockRejectedValueOnce(new Error("render failed"));
    await emailLib.sendWelcomeEmail({ userName: "Test", userEmail: "test@example.com" });

    mockRender.mockRejectedValueOnce(new Error("render failed"));
    await emailLib.sendRoleAssignedEmail({ userName: "Test", userEmail: "test@example.com", roleName: "TREK_LEAD" });

    mockRender.mockRejectedValueOnce(new Error("render failed"));
    await emailLib.sendTripCompletedEmail({
      userName: "Test",
      userEmail: "test@example.com",
      experienceTitle: "Brahmatal",
      experienceSlug: "brahmatal",
    });

    mockRender.mockRejectedValueOnce(new Error("render failed"));
    await emailLib.sendResetPasswordEmail({
      userName: "Test",
      userEmail: "test@example.com",
      resetLink: "https://example.com/reset",
    });

    mockRender.mockRejectedValueOnce(new Error("render failed"));
    await emailLib.sendAdminInviteEmail({
      userName: "Test",
      userEmail: "test@example.com",
      setupLink: "https://example.com/setup",
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("uses default host/from and secure false when SMTP port is not 465", async () => {
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpPort: "587",
      smtpHost: undefined,
      smtpFrom: undefined,
    });

    await emailLib.sendWelcomeEmail({ userName: "Test", userEmail: "test@example.com" });

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.zoho.in",
        port: 587,
        secure: false,
        auth: {
          user: "user",
          pass: "pass",
        },
      }),
    );

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Param Adventures <booking@paramadventures.in>",
      }),
    );
  });

  it("uses default SMTP port 465 and secure true when port is unset", async () => {
    const emailLib = await loadEmailLib({
      smtpUser: "user",
      smtpPass: "pass",
      smtpPort: undefined,
      smtpHost: "smtp.test.com",
      smtpFrom: "Sender <sender@example.com>",
    });

    await emailLib.sendWelcomeEmail({ userName: "Test", userEmail: "test@example.com" });

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.test.com",
        port: 465,
        secure: true,
      }),
    );
  });
});
