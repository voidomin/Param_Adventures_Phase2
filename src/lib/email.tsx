import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import BookingConfirmedEmail from "@/components/emails/BookingConfirmedEmail";
import BookingCancelledEmail from "@/components/emails/BookingCancelledEmail";
import RefundResolvedEmail from "@/components/emails/RefundResolvedEmail";
import WelcomeEmail from "@/components/emails/WelcomeEmail";
import RoleAssignedEmail from "@/components/emails/RoleAssignedEmail";
import TripCompletedEmail from "@/components/emails/TripCompletedEmail";
import PasswordResetEmail from "@/components/emails/PasswordResetEmail";
import AdminInviteEmail from "@/components/emails/AdminInviteEmail";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { Resend } from "resend";
import React from "react";

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

// ─── TRANSPORT SELECTION ─────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const useResend = !!RESEND_API_KEY;
const useSES = !useResend && !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

// ─── SMTP CONFIGURATION ──────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || "smtp.zoho.com";
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_SECURE = parseBoolean(process.env.SMTP_SECURE) ?? (SMTP_PORT === 465);

// ─── INITIALIZATION ──────────────────────────────────────
let sesClient: SESClient | null = null;
let resendClient: Resend | null = null;

if (useResend) {
  console.log("[EMAIL_INIT] Using Resend API (HTTPS) for email delivery.");
  resendClient = new Resend(RESEND_API_KEY);
} else if (useSES) {
  console.log("[EMAIL_INIT] Using AWS SES SDK (HTTPS) for email delivery.");
  sesClient = new SESClient({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
} else {
  console.log(`[EMAIL_INIT] Using standard SMTP (${SMTP_HOST}:${SMTP_PORT}).`);
}

// ─── FROM EMAIL HELPER ──────────────────────────────────
// Resend is strict: "Name <email@domain.com>" or "email@domain.com"
function getFromEmail(): string {
  const envFrom = (process.env.SMTP_FROM || "").trim();
  if (envFrom) return envFrom;
  return "Param Adventures <booking@paramadventures.in>";
}

const FROM_EMAIL = getFromEmail();

/**
 * High-performance email dispatcher with multiple fallbacks
 */
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const isReady = useResend || useSES || !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!isReady) {
    const msg = "Email credentials (Resend, SES, or SMTP) not configured.";
    console.warn(`⚠️ ${msg} Logging email to console.`);
    console.log(`To: ${to}\nSubject: ${subject}\n--- Content ---\n${html.substring(0, 200)}...\n---`);
    if (process.env.NODE_ENV === "production") throw new Error(msg);
    return;
  }

  // 1. Resend (Primary Cloud Transport - Bypasses all Port Blocking)
  if (useResend && resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });
      if (error) throw error;
      console.log(`✅ Email sent via Resend: ${data?.id} to ${to}`);
      return;
    } catch (err) {
      console.error(`❌ Resend Failure:`, err);
      throw err;
    }
  }

  // 2. Standard Transporter (SES or SMTP Fallback)
  const transporter = nodemailer.createTransport(
    (useSES && sesClient
      ? {
          SES: { ses: sesClient, aws: { SendRawEmailCommand } },
        }
      : {
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_SECURE,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          pool: true,
          maxConnections: 5,
          family: Number.parseInt(process.env.SMTP_FAMILY || "0", 10),
          tls: {
            rejectUnauthorized:
              parseBoolean(process.env.SMTP_REJECT_UNAUTHORIZED) ??
              process.env.NODE_ENV === "production",
            minVersion: (process.env.SMTP_TLS_MIN_VERSION || "TLSv1.2") as any,
          },
        }) as any
  );

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent: ${info.messageId} to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err);
    throw err;
  }
}

// ─── TYPES ─────────────────────────────────────────────

interface BookingEmailData {
  userName: string;
  userEmail: string;
  experienceTitle: string;
  slotDate: string;
  participantCount: number;
  totalPrice: number;
  bookingId: string;
}

interface BookingCancelledData {
  userName: string;
  userEmail: string;
  experienceTitle: string;
  slotDate: string;
  refundPreference: "COUPON" | "BANK_REFUND";
}

interface RefundResolvedData {
  userName: string;
  userEmail: string;
  experienceTitle: string;
  slotDate: string;
  refundPreference: "COUPON" | "BANK_REFUND";
  refundNote: string;
  totalPrice: number;
}

interface WelcomeEmailData {
  userName: string;
  userEmail: string;
}

interface RoleAssignedData {
  userName: string;
  userEmail: string;
  roleName: string;
}

interface TripCompletedData {
  userName: string;
  userEmail: string;
  experienceTitle: string;
  experienceSlug: string;
}

interface PasswordResetData {
  userName: string;
  userEmail: string;
  resetLink: string;
}

interface AdminInviteData {
  userName: string;
  userEmail: string;
  setupLink: string;
}

// ─── SENDERS ───────────────────────────────────────────

export async function sendBookingConfirmation(data: BookingEmailData) {
  try {
    const html = await render(
      <BookingConfirmedEmail
        userName={data.userName}
        tripName={data.experienceTitle}
        bookingId={data.bookingId}
      />,
    );
    await sendEmail({
      to: data.userEmail,
      subject: `Booking Confirmed — ${data.experienceTitle}`,
      html,
    });
  } catch (err) {
    console.error("Email layout error:", err);
  }
}

export async function sendBookingCancellation(data: BookingCancelledData) {
  try {
    const html = await render(
      <BookingCancelledEmail
        userName={data.userName}
        tripName={data.experienceTitle}
        bookingId="N/A"
      />,
    );
    await sendEmail({
      to: data.userEmail,
      subject: `Booking Cancelled — ${data.experienceTitle}`,
      html,
    });
  } catch (err) {
    console.error("Email layout error:", err);
  }
}

export async function sendRefundResolved(data: RefundResolvedData) {
  try {
    const html = await render(
      <RefundResolvedEmail
        userName={data.userName}
        bookingId="N/A"
        amount={data.totalPrice}
      />,
    );
    const label =
      data.refundPreference === "COUPON" ? "Coupon Issued" : "Refund Processed";
    await sendEmail({
      to: data.userEmail,
      subject: `${label} — ${data.experienceTitle}`,
      html,
    });
  } catch (err) {
    console.error("Email layout error (RefundResolved):", err);
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  try {
    const html = await render(<WelcomeEmail {...data} />);
    await sendEmail({
      to: data.userEmail,
      subject: "Welcome to Param Adventures! 🏔️",
      html,
    });
  } catch (err) {
    console.error("Email layout error:", err);
  }
}

export async function sendRoleAssignedEmail(data: RoleAssignedData) {
  try {
    const html = await render(
      <RoleAssignedEmail userName={data.userName} role={data.roleName} />,
    );
    await sendEmail({
      to: data.userEmail,
      subject: `Role Updated: ${data.roleName.replaceAll("_", " ")}`,
      html,
    });
  } catch (err) {
    console.error("Email layout error:", err);
  }
}

export async function sendTripCompletedEmail(data: TripCompletedData) {
  try {
    const html = await render(
      <TripCompletedEmail
        userName={data.userName}
        tripName={data.experienceTitle}
      />,
    );
    await sendEmail({
      to: data.userEmail,
      subject: `Hope you enjoyed ${data.experienceTitle}! 🏔️`,
      html,
    });
  } catch (err) {
    console.error("Email layout error:", err);
  }
}

export async function sendResetPasswordEmail(data: PasswordResetData) {
  try {
    const html = await render(<PasswordResetEmail {...data} />);
    await sendEmail({
      to: data.userEmail,
      subject: "Reset your Param Adventures password 🏔️",
      html,
    });
  } catch (err) {
    console.error("Email layout error:", err);
    throw err;
  }
}

export async function sendAdminInviteEmail(data: AdminInviteData) {
  try {
    const html = await render(<AdminInviteEmail {...data} />);
    await sendEmail({
      to: data.userEmail,
      subject: "Welcome to Param Adventures Admin Team! 🚀",
      html,
    });
  } catch (err) {
    console.error("Email layout error:", err);
  }
}
