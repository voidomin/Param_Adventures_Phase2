import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface RoleAssignedEmailProps {
  userName: string;
  role: string;
}

export const RoleAssignedEmail = ({
  userName = "User",
  role = "Manager",
}: RoleAssignedEmailProps) => {
  return (
    <EmailBase
      preview={`Your role has been updated to ${role} 🏔️`}
      heading="Role Updated"
      subheading={`New Permissions Assigned: ${role}`}
      theme="admin"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        An administrator has updated your access level on the Param Adventures platform. 
        You have been granted the <strong>{role}</strong> role.
      </Text>
      <Text style={commonStyles.text}>
        You can now access new features and management tools associated with your 
        new permissions.
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/login" style={commonStyles.button("#4F46E5")}>
          Go to Dashboard →
        </Link>
      </Section>

      <Text style={commonStyles.smallText}>
        If you believe this change was made in error, please contact your 
        system administrator immediately.
      </Text>
    </EmailBase>
  );
};

export default RoleAssignedEmail;
