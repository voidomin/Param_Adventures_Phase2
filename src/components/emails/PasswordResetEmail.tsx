import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface PasswordResetEmailProps {
  userName: string;
  resetLink: string;
}

export const PasswordResetEmail = ({
  userName = "Adventurer",
  resetLink = "#",
}: PasswordResetEmailProps) => {
  return (
    <EmailBase
      preview="Reset your Param Adventures password 🏔️"
      heading="Password Reset Request"
      subheading="No worries, it happens to the best of us."
      theme="gold"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        We received a request to reset the password for your Param Adventures account. 
        Click the button below to choose a new password. This link will expire in 1 hour.
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href={resetLink} style={commonStyles.button("#D4AF37", "#0a0a0a")}>
          Reset Password →
        </Link>
      </Section>

      <Text style={commonStyles.smallText}>
        If you didn&apos;t request this, you can safely ignore this email. 
        Your password won&apos;t change until you access the link above and create a new one.
      </Text>
    </EmailBase>
  );
};

export default PasswordResetEmail;
