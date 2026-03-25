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
} from "@react-email/components";

interface EmailBaseProps {
  preview: string;
  heading: string;
  subheading?: string;
  children: React.ReactNode;
  theme?: "orange" | "admin" | "gold";
}

export const EmailBase = ({
  preview,
  heading,
  subheading,
  children,
  theme = "orange",
}: EmailBaseProps) => {
  let headerGradient = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
  if (theme === "admin") {
    headerGradient = "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)";
  } else if (theme === "gold") {
    headerGradient = "linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)";
  }

  let headingColor = "#ffffff";
  if (theme === "gold") {
    headingColor = "#0a0a0a";
  }

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, background: headerGradient }}>
            <Heading style={{ ...h1, color: headingColor }}>{heading}</Heading>
            {subheading && <Text style={{ ...subText, color: headingColor }}>{subheading}</Text>}
          </Section>

          <Section style={content}>
            {children}
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

export const commonStyles = {
  text: {
    color: "#e0e0e0",
    fontSize: "16px",
    lineHeight: "1.6",
    marginBottom: "20px",
  },
  button: (backgroundColor: string, color: string = "#ffffff") => ({
    backgroundColor,
    borderRadius: "12px",
    color,
    display: "inline-block" as const,
    fontSize: "15px",
    fontWeight: "800",
    padding: "14px 32px",
    textDecoration: "none",
  }),
  btnContainer: {
    textAlign: "center" as const,
    marginTop: "32px",
    marginBottom: "32px",
  },
  smallText: {
    color: "#888",
    fontSize: "14px",
    lineHeight: "1.5",
    marginTop: "32px",
  },
};

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
  padding: "40px",
  textAlign: "center" as const,
};

const h1 = {
  fontSize: "28px",
  fontWeight: "800",
  margin: "0 0 8px",
};

const subText = {
  fontSize: "14px",
  opacity: 0.8,
  margin: "0",
};

const content = {
  padding: "40px",
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
