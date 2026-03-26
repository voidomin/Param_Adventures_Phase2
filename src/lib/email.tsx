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
import React from "react";

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

// ─── SMTP CONFIGURATION ──────────────────────────────────
// Note: smtp.zoho.com is generally more reliable on cloud platforms than .in
const SMTP_HOST = process.env.SMTP_HOST || "smtp.zoho.com";
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_SECURE = parseBoolean(process.env.SMTP_SECURE) ?? (SMTP_PORT === 465);

console.log(`[SMTP_INIT] Attempting connection to ${SMTP_HOST}:${SMTP_PORT} (Secure: ${SMTP_SECURE})`);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // ─── Reliability & Performance ──────────────────────────
  pool: true,
  maxConnections: 3,
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 45000,
  // ─── Network Compatibility ──────────────────────────────
  // @ts-ignore - family is recognized at runtime but may cause issues with certain @types versions
  family: 4,               
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  },
  debug: true,
  logger: true,
} as any);

const FROM_EMAIL =
  process.env.SMTP_FROM || "Param Adventures <booking@paramadventures.in>";

// check if we are ready to send
const isReady = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

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

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!isReady) {
    const msg = "SMTP credentials not configured.";
    console.warn(`⚠️ ${msg} Logging email to console.`);
    console.log(
      `To: ${to}\nSubject: ${subject}\n--- Content --- \n${html.substring(0, 200)}...\n---`,
    );

    // In production we should fail loudly so API handlers can surface the issue.
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
    return;
  }

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
