import { Section, Text, Link, Hr, Row, Column } from "@react-email/components";
import { EmailBase, commonStyles, priceStyles } from "./EmailBase";

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
            This is a friendly reminder that your remaining balance for <strong>{tripName}</strong> is due
            by <strong>{deadlineDate}</strong>. Please complete your payment before departure to confirm your trip details.
          </>
        ) : (
          <>
            Just a heads-up: your remaining balance for <strong>{tripName}</strong> is due by{" "}
            <strong>{deadlineDate}</strong>. Please complete your payment before departure to confirm your trip details.
          </>
        )}
      </Text>

      <Section style={priceStyles.container}>
        <Text style={priceStyles.sectionTitle}>Payment Summary</Text>
        <Hr style={priceStyles.hr} />

        <Row style={priceStyles.row}>
          <Column><Text style={priceStyles.label}>Total Trip Cost</Text></Column>
          <Column align="right"><Text style={priceStyles.value}>₹{Number(totalPrice).toLocaleString("en-IN")}</Text></Column>
        </Row>
        <Row style={priceStyles.row}>
          <Column><Text style={priceStyles.label}>Advance Paid</Text></Column>
          <Column align="right"><Text style={priceStyles.value}>₹{Number(paidAmount).toLocaleString("en-IN")}</Text></Column>
        </Row>

        <Hr style={priceStyles.hr} />
        <Row style={priceStyles.totalRow}>
          <Column><Text style={priceStyles.totalLabel}>Remaining Balance</Text></Column>
          <Column align="right"><Text style={priceStyles.totalValue}>₹{Number(remainingBalance).toLocaleString("en-IN")}</Text></Column>
        </Row>
      </Section>

      <Section style={priceStyles.noticeContainer}>
        <Text style={priceStyles.noticeText}>
          ⏰ Due by <strong>{deadlineDate}</strong>. Please complete your payment prior to departure to ensure smooth trip coordination and onboarding.
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

export default BalancePaymentReminderEmail;
