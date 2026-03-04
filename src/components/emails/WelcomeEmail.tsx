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

interface WelcomeEmailProps {
  userName: string;
}

export const WelcomeEmail = ({
  userName = "Adventurer",
}: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Param Adventures! 🏔️</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Welcome to Param Adventures! 🏔️</Heading>
            <Text style={subheading}>Your next adventure starts here.</Text>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hey <strong>{userName}</strong> 👋
            </Text>
            <Text style={text}>
              Thanks for joining the Param Adventures community! We curate
              incredible trekking and adventure experiences across India&apos;s
              most breathtaking landscapes.
            </Text>
            <Text style={text}>
              Browse our upcoming trips, pick a date that works for you, invite
              your friends, and let us handle the rest. See you on the trail! 🚶‍♂️
            </Text>

            <Section style={btnContainer}>
              <Link
                href={
                  process.env.NEXT_PUBLIC_APP_URL ||
                  "http://localhost:3000/experiences"
                }
                style={button}
              >
                Explore Adventures →
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

export default WelcomeEmail;

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
