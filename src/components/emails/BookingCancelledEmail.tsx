import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface BookingCancelledEmailProps {
  userName: string;
  tripName: string;
  bookingId: string;
}

export const BookingCancelledEmail = ({
  userName = "Adventurer",
  tripName = "Himalayan Trek",
  bookingId = "BK-123",
}: BookingCancelledEmailProps) => {
  return (
    <EmailBase
      preview={`Update on your booking for ${tripName} 🏔️`}
      heading="Booking Cancelled"
      subheading={`Booking ID: ${bookingId}`}
      theme="orange"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        This is to confirm that your booking for <strong>{tripName}</strong> has 
        been cancelled.
      </Text>
      <Text style={commonStyles.text}>
        If you are entitled to a refund, it will be processed automatically to 
        your original payment method. You will receive another email once the 
        refund is initiated.
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/experiences" style={commonStyles.button("#f97316")}>
          Explore Other Trips →
        </Link>
      </Section>

      <Text style={commonStyles.text}>
        We hope to see you on another adventure soon!
      </Text>
    </EmailBase>
  );
};

export default BookingCancelledEmail;
