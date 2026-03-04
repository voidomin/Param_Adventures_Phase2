import { Resend } from "resend";

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

interface WelcomeEmailData {
  userName: string;
  userEmail: string;
}

// ─── HELPERS ───────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ─── BOOKING CONFIRMATION ──────────────────────────────

export async function sendBookingConfirmation(data: BookingEmailData) {
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#0a0a0a;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
                ✅ Booking Confirmed!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#e0e0e0;font-size:16px;margin:0 0 24px;line-height:1.6;">
                Hey <strong style="color:#ffffff;">${data.userName}</strong>,<br>
                Your adventure is locked in! Here are the details:
              </p>

              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;">
                          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Experience</span><br>
                          <span style="color:#ffffff;font-size:16px;font-weight:700;">${data.experienceTitle}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;">
                          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Date</span><br>
                          <span style="color:#D4AF37;font-size:16px;font-weight:700;">${formatDate(data.slotDate)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;">
                          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Participants</span><br>
                          <span style="color:#ffffff;font-size:16px;font-weight:700;">${data.participantCount} Person${data.participantCount > 1 ? "s" : ""}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total Paid</span><br>
                          <span style="color:#22c55e;font-size:20px;font-weight:800;">${formatCurrency(data.totalPrice)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#888;font-size:12px;margin:0;font-family:monospace;">
                Booking ID: ${data.bookingId.slice(0, 8)}...
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="color:#666;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Param Adventures • paramadventures.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `Booking Confirmed — ${data.experienceTitle}`,
      html,
    });

    if (error) {
      console.error("Failed to send booking confirmation:", error);
    } else {
      console.log(`✅ Booking confirmation sent to ${data.userEmail}`);
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}

// ─── BOOKING CANCELLATION ──────────────────────────────

export async function sendBookingCancellation(data: BookingEmailData) {
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
          <tr>
            <td style="background:#dc2626;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">
                Booking Cancelled
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#e0e0e0;font-size:16px;margin:0 0 24px;line-height:1.6;">
                Hey <strong style="color:#ffffff;">${data.userName}</strong>,<br>
                Your booking for <strong style="color:#D4AF37;">${data.experienceTitle}</strong> on <strong>${formatDate(data.slotDate)}</strong> has been cancelled.
              </p>
              <p style="color:#888;font-size:14px;margin:0;line-height:1.6;">
                If this was a mistake or you have questions about a refund, please reach out to us.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} Param Adventures</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `Booking Cancelled — ${data.experienceTitle}`,
      html,
    });

    if (error) {
      console.error("Failed to send cancellation email:", error);
    } else {
      console.log(`📧 Cancellation email sent to ${data.userEmail}`);
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}

// ─── WELCOME EMAIL ─────────────────────────────────────

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
          <tr>
            <td style="background:linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);padding:40px;text-align:center;">
              <h1 style="margin:0 0 8px;color:#0a0a0a;font-size:28px;font-weight:800;">
                Welcome to Param Adventures! 🏔️
              </h1>
              <p style="margin:0;color:#0a0a0a;font-size:14px;opacity:0.8;">
                Your next adventure starts here.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#e0e0e0;font-size:16px;margin:0 0 20px;line-height:1.6;">
                Hey <strong style="color:#ffffff;">${data.userName}</strong> 👋
              </p>
              <p style="color:#aaa;font-size:15px;margin:0 0 28px;line-height:1.7;">
                Thanks for joining the Param Adventures community! We curate incredible trekking and adventure experiences across India's most breathtaking landscapes.
              </p>
              <p style="color:#aaa;font-size:15px;margin:0 0 28px;line-height:1.7;">
                Browse our upcoming trips, pick a date that works for you, invite your friends, and let us handle the rest. See you on the trail! 🚶‍♂️
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);border-radius:12px;padding:14px 32px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/experiences" style="color:#0a0a0a;text-decoration:none;font-weight:800;font-size:15px;">
                      Explore Adventures →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} Param Adventures</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: "Welcome to Param Adventures! 🏔️",
      html,
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
    } else {
      console.log(`🎉 Welcome email sent to ${data.userEmail}`);
    }
  } catch (err) {
    console.error("Email send error:", err);
  }
}
