import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface AdminInviteEmailProps {
  userName: string;
  setupLink: string;
}

export const AdminInviteEmail = ({
  userName = "Admin",
  setupLink = "#",
}: AdminInviteEmailProps) => {
  return (
    <EmailBase
      preview="Welcome to the Param Adventures Admin Team! 🏔️"
      heading="Platform Deployed 🚀"
      subheading="You've been assigned Super Admin access."
      theme="admin"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        We&apos;ve successfully deployed the Param Adventures platform. You have been 
        granted <strong>Super Admin</strong> access to manage the entire ecosystem.
      </Text>
      <Text style={commonStyles.text}>
        To get started, please click the button below to set your account password 
        and access the admin dashboard.
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href={setupLink} style={commonStyles.button("#4F46E5")}>
          Set Your Password →
        </Link>
      </Section>

      <Text style={commonStyles.smallText}>
        This link is unique to your account. For security reasons, please do not 
        share it with anyone else.
      </Text>
    </EmailBase>
  );
};

export default AdminInviteEmail;
