import { Section, Text, Link, Hr, Row, Column } from "@react-email/components";
import { EmailBase, commonStyles, priceStyles } from "./EmailBase";

export interface BookingConfirmedEmailProps {
  userName: string;
  tripName: string;
  bookingId: string;
  participantCount?: number;
  totalPrice?: number;
  baseFare?: number;
  taxBreakdown?: { name: string; percentage: number; amount: number }[];
  paymentType?: string;
  paidAmount?: number;
  remainingBalance?: number;
  advanceDeadline?: string;
}

export const BookingConfirmedEmail = ({
  userName = "Adventurer",
  tripName = "Himalayan Trek",
  bookingId = "BK-123",
  participantCount = 1,
  totalPrice = 0,
  baseFare = 0,
  taxBreakdown = [],
  paymentType,
  paidAmount,
  remainingBalance,
  advanceDeadline,
}: BookingConfirmedEmailProps) => {
  const isAdvance = paymentType === "ADVANCE" && (remainingBalance ?? 0) > 0;

  return (
    <EmailBase
      preview={`Your booking for ${tripName} is confirmed! 🏔️`}
      heading="Booking Confirmed!"
      subheading={`Booking ID: ${bookingId}`}
      theme="orange"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        Pack your bags! Your booking for <strong>{tripName}</strong> has been 
        successfully confirmed. We are excited to have you join us on this adventure.
      </Text>

      {/* Pricing Summary Section */}
      <Section style={priceStyles.container}>
         <Text style={priceStyles.sectionTitle}>Payment Summary</Text>
         <Hr style={priceStyles.hr} />

         <Row style={priceStyles.row}>
            <Column><Text style={priceStyles.label}>Adventure Base Fare (x{participantCount})</Text></Column>
            <Column align="right"><Text style={priceStyles.value}>₹{Number(baseFare).toLocaleString("en-IN")}</Text></Column>
         </Row>

         {taxBreakdown.map((tax) => (
            <Row key={tax.name} style={priceStyles.row}>
               <Column><Text style={priceStyles.label}>{tax.name} ({tax.percentage}%)</Text></Column>
               <Column align="right"><Text style={priceStyles.value}>₹{Number(tax.amount).toLocaleString("en-IN")}</Text></Column>
            </Row>
         ))}

         <Hr style={priceStyles.hr} />
         <Row style={priceStyles.totalRow}>
            <Column><Text style={priceStyles.totalLabel}>{isAdvance ? "Advance Paid" : "Total Paid"}</Text></Column>
            <Column align="right"><Text style={priceStyles.totalValue}>₹{Number(isAdvance ? paidAmount : totalPrice).toLocaleString("en-IN")}</Text></Column>
         </Row>
         {isAdvance && (
            <Row style={priceStyles.row}>
               <Column><Text style={priceStyles.label}>Remaining Balance</Text></Column>
               <Column align="right"><Text style={priceStyles.value}>₹{Number(remainingBalance).toLocaleString("en-IN")}</Text></Column>
            </Row>
         )}
      </Section>

      {isAdvance && advanceDeadline && (
        <Section style={priceStyles.noticeContainer}>
          <Text style={priceStyles.noticeText}>
            ⏰ Please pay your remaining balance of ₹{Number(remainingBalance).toLocaleString("en-IN")} by{" "}
            <strong>{advanceDeadline}</strong> to keep your seat. Bookings not fully
            paid by then are automatically cancelled, and the advance becomes eligible for a refund pending
            admin approval.
          </Text>
        </Section>
      )}

      <Text style={commonStyles.text}>
        You can view your full booking details and download your tax invoice from your dashboard.
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/dashboard" style={commonStyles.button("#f97316")}>
          View Dashboard →
        </Link>
      </Section>

      <Text style={commonStyles.text}>
        See you on the trail!
      </Text>
    </EmailBase>
  );
};

export default BookingConfirmedEmail;
