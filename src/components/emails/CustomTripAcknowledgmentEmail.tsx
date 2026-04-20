import * as React from "react";
import { Text, Section, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface CustomTripAcknowledgmentEmailProps {
  userName: string;
}

export const CustomTripAcknowledgmentEmail = ({
  userName = "Adventurer",
}: CustomTripAcknowledgmentEmailProps) => {
  return (
    <EmailBase
      preview="We've received your custom trip request! 🏔️"
      heading="Request Received"
      subheading="Our experts are crafting your perfect journey."
      theme="orange"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        Thank you for reaching out to Param Adventures! We've successfully received your request for a custom planned trip.
      </Text>
      <Text style={commonStyles.text}>
        Our travel designers are currently reviewing your requirements. We take pride in building personalized itineraries that match your group's interests, fitness levels, and preferred pace.
      </Text>
      
      <Section style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '12px', marginBottom: '24px' }}>
        <Text style={{ ...commonStyles.text, margin: 0, fontWeight: 'bold', color: '#111827' }}>
          What's Next?
        </Text>
        <Text style={{ ...commonStyles.text, fontSize: '14px', marginBottom: 0 }}>
          1. We will reach out within 24-48 business hours.<br />
          2. We'll clarify any details over a quick call or email.<br />
          3. You'll receive a draft itinerary and estimate.
        </Text>
      </Section>

      <Text style={commonStyles.text}>
        In the meantime, feel free to check out our existing travel stories for some inspiration!
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/blog" style={commonStyles.button("#f97316")}>
          Read Travel Stories →
        </Link>
      </Section>

      <Text style={commonStyles.text}>
        Adventure is out there!
      </Text>
    </EmailBase>
  );
};

export default CustomTripAcknowledgmentEmail;
