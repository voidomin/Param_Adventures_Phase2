import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface VerifyEmailEmailProps {
  userName: string;
  verifyLink: string;
}

export const VerifyEmailEmail = ({
  userName = "Adventurer",
  verifyLink = "#",
}: VerifyEmailEmailProps) => {
  return (
    <EmailBase
      preview="Verify your email to finish setting up your Param Adventures account 🏔️"
      heading="Confirm Your Email"
      subheading="One quick step before you can book your first trip."
      theme="gold"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        Thanks for signing up! Please confirm this is your email address by clicking the
        button below. This link expires in 24 hours.
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href={verifyLink} style={commonStyles.button("#D4AF37", "#0a0a0a")}>
          Verify Email →
        </Link>
      </Section>

      <Text style={commonStyles.smallText}>
        If you didn&apos;t create this account, you can safely ignore this email.
      </Text>
    </EmailBase>
  );
};

export default VerifyEmailEmail;
