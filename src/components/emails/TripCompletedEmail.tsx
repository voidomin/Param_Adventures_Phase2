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

interface TripCompletedProps {
  userName: string;
  experienceTitle: string;
  experienceSlug: string;
}

export const TripCompletedEmail = ({
  userName = "Adventurer",
  experienceTitle = "Himalayan Trek",
  experienceSlug = "himalayan-trek",
}: TripCompletedProps) => {
  return (
    <Html>
      <Head />
      <Preview>Hope you enjoyed {experienceTitle}! 🏔️</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Welcome Back! 🏕️</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hey <strong>{userName}</strong>,<br />
              We hope you had an absolutely incredible time on the{" "}
              <strong style={highlight}>{experienceTitle}</strong> trek!
            </Text>

            <Text style={text}>
              We are constantly striving to improve our adventures and provide
              the best possible experience. We would love to hear your thoughts
              and see your photos from the trail.
            </Text>

            <Section style={btnContainer}>
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/experiences/${experienceSlug}`}
                style={button}
              >
                Write a Review ✨
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

export default TripCompletedEmail;

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
  margin: 0,
};

const content = {
  padding: "40px",
};

const text = {
  color: "#e0e0e0",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const highlight = {
  color: "#D4AF37",
};

const btnContainer = {
  textAlign: "center" as const,
  marginTop: "32px",
};

const button = {
  backgroundColor: "#ffffff",
  border: "1px solid #e0e0e0",
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
  margin: 0,
};
