import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface TripCompletedEmailProps {
  userName: string;
  tripName: string;
}

export const TripCompletedEmail = ({
  userName = "Adventurer",
  tripName = "Himalayan Trek",
}: TripCompletedEmailProps) => {
  return (
    <EmailBase
      preview={`Congratulations on completing ${tripName}! 🏔️`}
      heading="Adventure Completed!"
      subheading={tripName}
      theme="orange"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        Congratulations on successfully completing your trip to <strong>{tripName}</strong>! 
        We hope you had an incredible time and made memories that will last a lifetime.
      </Text>
      <Text style={commonStyles.text}>
        We&apos;d love to hear about your experience. Please take a moment to 
        share your feedback or photos with us on social media!
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/dashboard" style={commonStyles.button("#f97316")}>
          Share Your Story →
        </Link>
      </Section>

      <Text style={commonStyles.text}>
        Keep that explorer spirit alive! We can&apos;t wait to see you on your 
        next adventure.
      </Text>
    </EmailBase>
  );
};

export default TripCompletedEmail;
