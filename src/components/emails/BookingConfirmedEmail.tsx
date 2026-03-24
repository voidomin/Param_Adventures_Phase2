import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface BookingConfirmedEmailProps {
  userName: string;
  tripName: string;
  bookingId: string;
}

export const BookingConfirmedEmail = ({
  userName = "Adventurer",
  tripName = "Himalayan Trek",
  bookingId = "BK-123",
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
      <Text style={commonStyles.text}>
        You can view your booking details and download your itinerary from your 
        dashboard.
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/dashboard" style={commonStyles.button("#f97316")}>
          View Booking Details →
        </Link>
      </Section>

      <Text style={commonStyles.text}>
        See you on the trail!
      </Text>
    </EmailBase>
  );
};

export default BookingConfirmedEmail;
