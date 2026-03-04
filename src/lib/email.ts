import { Resend } from "resend";
import { render } from "@react-email/render";
import BookingConfirmedEmail from "@/components/emails/BookingConfirmedEmail";
import BookingCancelledEmail from "@/components/emails/BookingCancelledEmail";
import WelcomeEmail from "@/components/emails/WelcomeEmail";
import RoleAssignedEmail from "@/components/emails/RoleAssignedEmail";
import TripCompletedEmail from "@/components/emails/TripCompletedEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Param Adventures <onboarding@resend.dev>";

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

// ─── SENDERS ───────────────────────────────────────────

export async function sendBookingConfirmation(data: BookingEmailData) {
  try {
    const html = await render(BookingConfirmedEmail(data));

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `Booking Confirmed — ${data.experienceTitle}`,
      html,
    });

    if (error) console.error("Failed to send booking confirmation:", error);
    else console.log(`✅ Booking confirmation sent to ${data.userEmail}`);
  } catch (err) {
    console.error("Email send error:", err);
  }
}

export async function sendBookingCancellation(data: BookingCancelledData) {
  try {
    const html = await render(BookingCancelledEmail(data));

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `Booking Cancelled — ${data.experienceTitle}`,
      html,
    });

    if (error) console.error("Failed to send cancellation email:", error);
    else console.log(`📧 Cancellation email sent to ${data.userEmail}`);
  } catch (err) {
    console.error("Email send error:", err);
  }
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  try {
    const html = await render(WelcomeEmail(data));

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: "Welcome to Param Adventures! 🏔️",
      html,
    });

    if (error) console.error("Failed to send welcome email:", error);
    else console.log(`🎉 Welcome email sent to ${data.userEmail}`);
  } catch (err) {
    console.error("Email send error:", err);
  }
}

export async function sendRoleAssignedEmail(data: RoleAssignedData) {
  try {
    const html = await render(RoleAssignedEmail(data));

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `Role Updated: ${data.roleName.replace(/_/g, " ")}`,
      html,
    });

    if (error) console.error("Failed to send role assigned email:", error);
    else console.log(`🛡️ Role assignment email sent to ${data.userEmail}`);
  } catch (err) {
    console.error("Email send error:", err);
  }
}

export async function sendTripCompletedEmail(data: TripCompletedData) {
  try {
    const html = await render(TripCompletedEmail(data));

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `Hope you enjoyed ${data.experienceTitle}! 🏔️`,
      html,
    });

    if (error) console.error("Failed to send trip completed email:", error);
    else console.log(`🏕️ Trip completed email sent to ${data.userEmail}`);
  } catch (err) {
    console.error("Email send error:", err);
  }
}
