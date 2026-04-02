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
import { emailFactory } from "./email/factory";

// ─── EMAIL TYPES ───────────────────────────────────────

export interface BookingEmailData {
  userName: string;
  userEmail: string;
  experienceTitle: string;
  slotDate: string;
  participantCount: number;
  totalPrice: number;
  baseFare?: number;
  taxBreakdown?: { name: string; percentage: number; amount: number }[];
  bookingId: string;
}

export interface BookingCancelledData {
  userName: string;
  userEmail: string;
  experienceTitle: string;
  slotDate: string;
  refundPreference: "COUPON" | "BANK_REFUND";
}

export interface RefundResolvedData {
  userName: string;
  userEmail: string;
  experienceTitle: string;
  slotDate: string;
  refundPreference: "COUPON" | "BANK_REFUND";
  refundNote: string;
  totalPrice: number;
}

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
}

export interface RoleAssignedData {
  userName: string;
  userEmail: string;
  roleName: string;
}

export interface TripCompletedData {
  userName: string;
  userEmail: string;
  experienceTitle: string;
  experienceSlug: string;
}

export interface PasswordResetData {
  userName: string;
  userEmail: string;
  resetLink: string;
}

export interface AdminInviteData {
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
  try {
    const { provider, from } = await emailFactory.getProvider();
    await provider.send({ to, subject, html, from });
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err);
    // In production we throw to allow callers to handle/log failure
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
  }
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  try {
    const html = await render(
      <BookingConfirmedEmail
        userName={data.userName}
        tripName={data.experienceTitle}
        bookingId={data.bookingId}
        participantCount={data.participantCount}
        totalPrice={data.totalPrice}
        baseFare={data.baseFare}
        taxBreakdown={data.taxBreakdown}
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
