import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface WelcomeEmailProps {
  userName: string;
}

export const WelcomeEmail = ({
  userName = "Adventurer",
}: WelcomeEmailProps) => {
  return (
    <EmailBase
      preview="Welcome to Param Adventures! 🏔️"
      heading="Welcome Aboard!"
      subheading="Your journey into the wild starts here."
      theme="orange"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        We&apos;re thrilled to have you join our community of adventure seekers. 
        Param Adventures is dedicated to bringing you the most authentic and 
        unforgettable trekking experiences across the Himalayas.
      </Text>
      <Text style={commonStyles.text}>
        From the snow-capped peaks of Kedarkantha to the lush valleys of Hampta Pass, 
        your next great adventure is just a click away.
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/experiences" style={commonStyles.button("#f97316")}>
          Explore Treks →
        </Link>
      </Section>

      <Text style={commonStyles.text}>
        If you have any questions or need help planning your first trip, 
        our team is always here to help.
      </Text>
    </EmailBase>
  );
};

export default WelcomeEmail;
