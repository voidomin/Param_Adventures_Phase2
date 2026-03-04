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

interface BookingEmailProps {
  userName: string;
  experienceTitle: string;
  slotDate: string;
  participantCount: number;
  totalPrice: number;
  bookingId: string;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN")}`;
};

export const BookingConfirmedEmail = ({
  userName = "Adventurer",
  experienceTitle = "Himalayan Trek",
  slotDate = new Date().toISOString(),
  participantCount = 1,
  totalPrice = 5000,
  bookingId = "BK-12345",
}: BookingEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>✅ Booking Confirmed: {experienceTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>✅ Booking Confirmed!</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hey <strong>{userName}</strong>,<br />
              Your adventure is locked in! Here are the details:
            </Text>

            <Section style={detailsCard}>
              <Text style={detailRow}>
                <span style={label}>Experience</span>
                <br />
                <span style={value}>{experienceTitle}</span>
              </Text>
              <Text style={detailRow}>
                <span style={label}>Date</span>
                <br />
                <span style={dateValue}>{formatDate(slotDate)}</span>
              </Text>
              <Text style={detailRow}>
                <span style={label}>Participants</span>
                <br />
                <span style={value}>
                  {participantCount} Person{participantCount > 1 ? "s" : ""}
                </span>
              </Text>
              <Text style={{ ...detailRow, borderBottom: "none" }}>
                <span style={label}>Total Paid</span>
                <br />
                <span style={priceValue}>{formatCurrency(totalPrice)}</span>
              </Text>
            </Section>

            <Text style={footerNote}>
              Booking ID: {bookingId.slice(0, 8)}...
            </Text>
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

export default BookingConfirmedEmail;

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
  padding: "32px 40px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#0a0a0a",
  fontSize: "24px",
  fontWeight: "800",
  letterSpacing: "-0.5px",
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

const detailsCard = {
  backgroundColor: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: "12px",
  padding: "20px",
  marginBottom: "24px",
};

const detailRow = {
  borderBottom: "1px solid #2a2a2a",
  margin: "0 0 16px",
  paddingBottom: "16px",
};

const label = {
  color: "#888",
  fontSize: "12px",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const value = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
};

const dateValue = {
  ...value,
  color: "#D4AF37",
};

const priceValue = {
  ...value,
  color: "#22c55e",
  fontSize: "20px",
  fontWeight: "800",
};

const footerNote = {
  color: "#888",
  fontFamily: "monospace",
  fontSize: "12px",
  margin: 0,
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
