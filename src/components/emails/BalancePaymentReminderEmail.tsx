import { Section, Text, Link, Hr, Row, Column } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

export interface BalancePaymentReminderEmailProps {
  userName: string;
  tripName: string;
  bookingId: string;
  remainingBalance: number;
  paidAmount: number;
  totalPrice: number;
  deadlineDate: string;
  isFinalReminder?: boolean;
}

export const BalancePaymentReminderEmail = ({
  userName = "Adventurer",
  tripName = "Himalayan Trek",
  bookingId = "BK-123",
  remainingBalance = 0,
  paidAmount = 0,
  totalPrice = 0,
  deadlineDate = "",
  isFinalReminder = false,
}: BalancePaymentReminderEmailProps) => {
  return (
    <EmailBase
      preview={
        isFinalReminder
          ? `Final reminder: ₹${Number(remainingBalance).toLocaleString("en-IN")} due tomorrow for ${tripName}`
          : `Reminder: ₹${Number(remainingBalance).toLocaleString("en-IN")} balance due for ${tripName}`
      }
      heading={isFinalReminder ? "Final Payment Reminder" : "Payment Reminder"}
      subheading={`Booking ID: ${bookingId}`}
      theme={isFinalReminder ? "gold" : "orange"}
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        {isFinalReminder ? (
          <>
            This is a final reminder that your remaining balance for <strong>{tripName}</strong> is due
            by <strong>{deadlineDate}</strong>. If it isn&apos;t received by then, your booking will be
            automatically cancelled and your advance payment becomes eligible for a refund, pending admin
            approval.
          </>
        ) : (
          <>
            Just a heads-up: your remaining balance for <strong>{tripName}</strong> is due by{" "}
            <strong>{deadlineDate}</strong>. Please pay before then to keep your seat.
          </>
        )}
      </Text>

      <Section style={priceContainer}>
        <Text style={sectionTitle}>Payment Summary</Text>
        <Hr style={hr} />

        <Row style={priceRow}>
          <Column><Text style={priceLabel}>Total Trip Cost</Text></Column>
          <Column align="right"><Text style={priceValue}>₹{Number(totalPrice).toLocaleString("en-IN")}</Text></Column>
        </Row>
        <Row style={priceRow}>
          <Column><Text style={priceLabel}>Advance Paid</Text></Column>
          <Column align="right"><Text style={priceValue}>₹{Number(paidAmount).toLocaleString("en-IN")}</Text></Column>
        </Row>

        <Hr style={hr} />
        <Row style={totalRow}>
          <Column><Text style={totalLabel}>Remaining Balance</Text></Column>
          <Column align="right"><Text style={totalValue}>₹{Number(remainingBalance).toLocaleString("en-IN")}</Text></Column>
        </Row>
      </Section>

      <Section style={noticeContainer}>
        <Text style={noticeText}>
          ⏰ Due by <strong>{deadlineDate}</strong>. Bookings not fully paid by then are automatically
          cancelled, and the advance becomes eligible for a refund pending admin approval.
        </Text>
      </Section>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/bookings" style={commonStyles.button(isFinalReminder ? "#D4AF37" : "#f97316", isFinalReminder ? "#0a0a0a" : "#ffffff")}>
          Pay Remaining Balance →
        </Link>
      </Section>
    </EmailBase>
  );
};

const priceContainer = {
  backgroundColor: "#f9fafb",
  padding: "24px",
  borderRadius: "16px",
  margin: "20px 0",
  border: "1px solid #e5e7eb",
};

const sectionTitle = {
  fontSize: "14px",
  fontWeight: "900",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "#4b5563",
  margin: "0 0 12px 0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "12px 0",
};

const priceRow = {
  margin: "4px 0",
};

const priceLabel = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0",
};

const priceValue = {
  fontSize: "13px",
  color: "#111827",
  margin: "0",
  fontWeight: "600",
};

const totalRow = {
  marginTop: "8px",
};

const totalLabel = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#111827",
  margin: "0",
};

const totalValue = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#f97316",
  margin: "0",
};

const noticeContainer = {
  backgroundColor: "#fffbeb",
  padding: "16px 20px",
  borderRadius: "12px",
  margin: "16px 0",
  border: "1px solid #fde68a",
};

const noticeText = {
  fontSize: "13px",
  color: "#92400e",
  margin: "0",
  lineHeight: "1.5",
};

export default BalancePaymentReminderEmail;
