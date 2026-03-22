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

interface PasswordResetEmailProps {
  userName: string;
  resetLink: string;
}

export const PasswordResetEmail = ({
  userName = "Adventurer",
  resetLink = "#",
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your Param Adventures password 🏔️</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Password Reset Request</Heading>
            <Text style={subheading}>No worries, it happens to the best of us.</Text>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hey <strong>{userName}</strong> 👋
            </Text>
            <Text style={text}>
              We received a request to reset the password for your Param Adventures account. 
              Click the button below to choose a new password. This link will expire in 1 hour.
            </Text>

            <Section style={btnContainer}>
              <Link href={resetLink} style={button}>
                Reset Password →
              </Link>
            </Section>

            <Text style={smallText}>
              If you didn&apos;t request this, you can safely ignore this email. 
              Your password won&apos;t change until you access the link above and create a new one.
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

export default PasswordResetEmail;

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
  background: "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)",
  padding: "40px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#0a0a0a",
  fontSize: "28px",
  fontWeight: "800",
  margin: "0 0 8px",
};

const subheading = {
  color: "#0a0a0a",
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
  backgroundColor: "#D4AF37",
  borderRadius: "12px",
  color: "#0a0a0a",
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
