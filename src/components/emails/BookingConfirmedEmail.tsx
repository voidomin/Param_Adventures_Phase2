import { Section, Text, Link, Hr, Row, Column } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

export interface BookingConfirmedEmailProps {
  userName: string;
  tripName: string;
  bookingId: string;
  participantCount?: number;
  totalPrice?: number;
  baseFare?: number;
  taxBreakdown?: { name: string; percentage: number; amount: number }[];
}

export const BookingConfirmedEmail = ({
  userName = "Adventurer",
  tripName = "Himalayan Trek",
  bookingId = "BK-123",
  participantCount = 1,
  totalPrice = 0,
  baseFare = 0,
  taxBreakdown = [],
}: BookingConfirmedEmailProps) => {
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
      <Section style={priceContainer}>
         <Text style={sectionTitle}>Payment Summary</Text>
         <Hr style={hr} />
         
         <Row style={priceRow}>
            <Column><Text style={priceLabel}>Adventure Base Fare (x{participantCount})</Text></Column>
            <Column align="right"><Text style={priceValue}>₹{Number(baseFare).toLocaleString("en-IN")}</Text></Column>
         </Row>

         {taxBreakdown.map((tax, index) => (
            <Row key={index} style={priceRow}>
               <Column><Text style={priceLabel}>{tax.name} ({tax.percentage}%)</Text></Column>
               <Column align="right"><Text style={priceValue}>₹{Number(tax.amount).toLocaleString("en-IN")}</Text></Column>
            </Row>
         ))}

         <Hr style={hr} />
         <Row style={totalRow}>
            <Column><Text style={totalLabel}>Total Paid</Text></Column>
            <Column align="right"><Text style={totalValue}>₹{Number(totalPrice).toLocaleString("en-IN")}</Text></Column>
         </Row>
      </Section>

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

export default BookingConfirmedEmail;
