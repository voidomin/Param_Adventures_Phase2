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

interface BookingCancelledProps {
  userName: string;
  experienceTitle: string;
  slotDate: string;
  refundPreference?: "COUPON" | "BANK_REFUND";
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const BookingCancelledEmail = ({
  userName = "Adventurer",
  experienceTitle = "Himalayan Trek",
  slotDate = new Date().toISOString(),
  refundPreference = "COUPON",
}: BookingCancelledProps) => {
  const isCoupon = refundPreference === "COUPON";
  return (
    <Html>
      <Head />
      <Preview>Booking Cancelled: {experienceTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Booking Cancelled</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hey <strong>{userName}</strong>,<br />
              Your booking for{" "}
              <strong style={highlight}>{experienceTitle}</strong> on{" "}
              <strong>{formatDate(slotDate)}</strong> has been cancelled.
            </Text>

            <Text style={subText}>
              You have selected a{" "}
              <strong style={highlight}>
                {isCoupon ? "Coupon Code" : "Bank Refund"}
              </strong>
              . Our team will process this within 5–7 business days and you will
              receive another email with the details. If you have any questions,{" "}
              <Link href="mailto:booking@paramadventures.in" style={link}>
                reach out to us
              </Link>
              .
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Param Adventures
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BookingCancelledEmail;

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
  backgroundColor: "#dc2626",
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

const subText = {
  color: "#888",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: 0,
};

const link = {
  color: "#D4AF37",
  textDecoration: "underline",
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
