import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface RefundResolvedEmailProps {
  userName: string;
  bookingId: string;
  amount: number;
}

export const RefundResolvedEmail = ({
  userName = "Adventurer",
  bookingId = "BK-123",
  amount = 0,
}: RefundResolvedEmailProps) => {
  return (
    <EmailBase
      preview={`Your refund for ${bookingId} has been processed 🏔️`}
      heading="Refund Processed"
      subheading={`Booking ID: ${bookingId}`}
      theme="orange"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        We&apos;ve successfully processed your refund for amount <strong>₹{amount}</strong>. 
        The funds should appear in your original payment method within 5-7 business days.
      </Text>
      <Text style={commonStyles.text}>
        Thank you for your patience during this process. We hope to see you on 
        another adventure soon!
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/experiences" style={commonStyles.button("#f97316")}>
          Browse More Trips →
        </Link>
      </Section>

      <Text style={commonStyles.smallText}>
        If you have any questions regarding this refund, please reply to this 
        email or contact our support team.
      </Text>
    </EmailBase>
  );
};

export default RefundResolvedEmail;
