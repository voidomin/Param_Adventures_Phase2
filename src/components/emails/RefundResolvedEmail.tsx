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

interface RefundResolvedProps {
  userName: string;
  experienceTitle: string;
  slotDate: string;
  refundPreference: "COUPON" | "BANK_REFUND";
  refundNote: string;
  totalPrice: number;
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const RefundResolvedEmail = ({
  userName = "Adventurer",
  experienceTitle = "Himalayan Trek",
  slotDate = new Date().toISOString(),
  refundPreference = "COUPON",
  refundNote = "",
  totalPrice = 0,
}: RefundResolvedProps) => {
  const isCoupon = refundPreference === "COUPON";

  return (
    <Html>
      <Head />
      <Preview>
        Refund Processed: {experienceTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>
              {isCoupon ? "🎟️ Coupon Issued" : "💸 Refund Processed"}
            </Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>
              Hey <strong>{userName}</strong>,
              <br />
              We have processed your refund request for{" "}
              <strong style={highlight}>{experienceTitle}</strong> on{" "}
              <strong>{formatDate(slotDate)}</strong>. Here are your details:
            </Text>

            <Section style={detailBox}>
              <Text style={detailRow}>
                <strong>Booking Amount:</strong> ₹{totalPrice.toLocaleString()}
              </Text>
              <Text style={detailRow}>
                <strong>Refund Type:</strong>{" "}
                {isCoupon ? "Adventure Coupon" : "Bank Transfer"}
              </Text>
              <Text style={detailRow}>
                <strong>{isCoupon ? "Coupon Code:" : "Reference (UTR):"}</strong>{" "}
                <span style={highlight}>{refundNote}</span>
              </Text>
            </Section>

            {isCoupon ? (
              <Text style={subText}>
                Apply this coupon code on your next booking at checkout and the
                discount will be applied automatically. Coupons are valid for 12
                months from today.
              </Text>
            ) : (
              <Text style={subText}>
                The refund has been initiated to your original payment method.
                Please allow 5–7 business days for it to reflect in your account.
              </Text>
            )}

            <Text style={subText}>
              Questions?{" "}
              <Link href="mailto:booking@paramadventures.in" style={link}>
                Contact our support team
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

export default RefundResolvedEmail;

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
  backgroundColor: "#D4AF37",
  padding: "32px 40px",
  textAlign: "center" as const,
};
const h1 = {
  color: "#0a0a0a",
  fontSize: "24px",
  fontWeight: "800",
  margin: 0,
};
const content = { padding: "40px" };
const text = {
  color: "#e0e0e0",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};
const highlight = { color: "#D4AF37" };
const detailBox = {
  backgroundColor: "#1e1e1e",
  borderRadius: "12px",
  padding: "20px 24px",
  marginBottom: "24px",
};
const detailRow = {
  color: "#e0e0e0",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 8px",
};
const subText = {
  color: "#888",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 12px",
};
const link = { color: "#D4AF37", textDecoration: "underline" };
const footer = {
  borderTop: "1px solid #2a2a2a",
  padding: "24px 40px",
  textAlign: "center" as const,
};
const footerText = { color: "#666", fontSize: "12px", margin: 0 };
