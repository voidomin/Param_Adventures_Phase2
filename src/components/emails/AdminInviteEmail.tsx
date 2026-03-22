import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface AdminInviteEmailProps {
  userName: string;
  setupLink: string;
}

export const AdminInviteEmail = ({
  userName = "Admin",
  setupLink = "#",
}: AdminInviteEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to the Param Adventures Admin Team! 🏔️</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Platform Deployed 🚀</Heading>
            <Text style={subheading}>You&apos;ve been assigned Super Admin access.</Text>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hey <strong>{userName}</strong> 👋
            </Text>
            <Text style={text}>
              We&apos;ve successfully deployed the Param Adventures platform. You have been 
              granted <strong>Super Admin</strong> access to manage the entire ecosystem.
            </Text>
            <Text style={text}>
              To get started, please click the button below to set your account password 
              and access the admin dashboard.
            </Text>

            <Section style={btnContainer}>
              <Link href={setupLink} style={button}>
                Set Your Password →
              </Link>
            </Section>

            <Text style={smallText}>
              This link is unique to your account. For security reasons, please do not 
              share it with anyone else.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Param Adventures • paramadventures.in
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AdminInviteEmail;

const main = {
  backgroundColor: "#0a0a0a",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  padding: "40px 20px",
};

const container = {
  backgroundColor: "#141414",
  border: "1px solid #2a2a2a",
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden",
};

const header = {
  background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)", // Distinct purple/indigo for admin
  padding: "40px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "800",
  margin: "0 0 8px",
};

const subheading = {
  color: "#ffffff",
  fontSize: "14px",
  opacity: 0.8,
  margin: "0",
};

const content = {
  padding: "40px",
};

const text = {
  color: "#e0e0e0",
  fontSize: "16px",
  lineHeight: "1.6",
  marginBottom: "20px",
};

const smallText = {
  color: "#888",
  fontSize: "14px",
  lineHeight: "1.5",
  marginTop: "32px",
};

const btnContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
};

const button = {
  backgroundColor: "#4F46E5",
  borderRadius: "12px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "800",
  padding: "14px 32px",
  textDecoration: "none",
};

const footer = {
  borderTop: "1px solid #2a2a2a",
  padding: "24px 40px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#666",
  fontSize: "12px",
  margin: "0",
};
