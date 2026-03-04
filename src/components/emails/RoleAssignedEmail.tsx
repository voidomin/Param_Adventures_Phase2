import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";

interface RoleAssignedProps {
  userName: string;
  roleName: string;
}

export const RoleAssignedEmail = ({
  userName = "Team Member",
  roleName = "TRIP_MANAGER",
}: RoleAssignedProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Role Update: You are now a {roleName.replaceAll("_", " ")}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Role Updated</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hey <strong>{userName}</strong>,<br />
              An admin has updated your account permissions. You have been
              assigned the role of:
            </Text>

            <Section style={badgeContainer}>
              <Text style={badge}>{roleName.replaceAll("_", " ")}</Text>
            </Section>

            <Text style={text}>
              You can now log in to the dashboard to access your new tools and
              responsibilities.
            </Text>

            <Section style={btnContainer}>
              <Link
                href={
                  process.env.NEXT_PUBLIC_APP_URL ||
                  "http://localhost:3000/dashboard"
                }
                style={button}
              >
                Go to Dashboard →
              </Link>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Param Adventures •
              paramadventures.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default RoleAssignedEmail;

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
  backgroundColor: "#22c55e",
  padding: "32px 40px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "800",
  margin: 0,
};

const content = {
  padding: "40px",
  textAlign: "center" as const,
};

const text = {
  color: "#e0e0e0",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const badgeContainer = {
  margin: "32px 0",
};

const badge = {
  backgroundColor: "#22c55e20",
  border: "1px solid #22c55e50",
  borderRadius: "8px",
  color: "#22c55e",
  display: "inline-block",
  fontSize: "20px",
  fontWeight: "800",
  padding: "12px 24px",
};

const btnContainer = {
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
};

const footerText = {
  color: "#666",
  fontSize: "12px",
  margin: 0,
};
