import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles } from "./EmailBase";

interface RefundResolvedEmailProps {
  userName: string;
  bookingId: string;
  amount: number;
  couponCode?: string;
  expiryDate?: string;
}

export const RefundResolvedEmail = ({
  userName = "Adventurer",
  bookingId = "BK-123",
  amount = 0,
  couponCode,
  expiryDate,
}: RefundResolvedEmailProps) => {
  const isCoupon = !!couponCode;

  return (
    <EmailBase
      preview={isCoupon ? `Your Travel Coupon for ${bookingId} has been issued 🎟️` : `Your refund for ${bookingId} has been processed 🏔️`}
      heading={isCoupon ? "Travel Coupon Issued" : "Refund Processed"}
      subheading={`Booking ID: ${bookingId.split("-")[0].toUpperCase()}`}
      theme={isCoupon ? "gold" : "orange"}
    >
      <Text style={commonStyles.text}>
        Hey <strong>{userName}</strong> 👋
      </Text>
      
      {isCoupon ? (
        <>
          <Text style={commonStyles.text}>
            We&apos;ve successfully issued you a Travel Coupon worth <strong>₹{amount.toLocaleString("en-IN")}</strong> as requested for your booking cancellation.
          </Text>
          <Section style={{ padding: "20px", backgroundColor: "#f3f4f6", borderRadius: "12px", border: "2px dashed #4f46e5", textAlign: "center", margin: "20px 0" }}>
            <Text style={{ margin: 0, fontSize: "10px", color: "#6b7280", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Your Coupon Code</Text>
            <Text style={{ margin: "8px 0 0 0", fontSize: "24px", color: "#4f46e5", fontWeight: "900", letterSpacing: "1.5px", fontFamily: "monospace" }}>{couponCode}</Text>
            {expiryDate && (
              <Text style={{ margin: "8px 0 0 0", fontSize: "11px", color: "#6b7280" }}>Expiry Date: <strong>{expiryDate}</strong></Text>
            )}
          </Section>
          <Text style={commonStyles.text}>
            You can easily redeem this coupon code during checkout for your next adventure. Please note that coupons can only be applied to bookings of equal or higher value.
          </Text>
        </>
      ) : (
        <Text style={commonStyles.text}>
          We&apos;ve successfully processed your refund for amount <strong>₹{amount.toLocaleString("en-IN")}</strong>. 
          The funds should appear in your original payment method within 5-7 business days.
        </Text>
      )}

      <Text style={commonStyles.text}>
        Thank you for your patience during this process. We hope to see you on 
        another adventure soon!
      </Text>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/experiences" style={commonStyles.button(isCoupon ? "#4f46e5" : "#f97316")}>
          Browse More Trips →
        </Link>
      </Section>

      <Text style={commonStyles.smallText}>
        If you have any questions regarding this refund, please reply to this 
        email or contact our support team.
      </Text>
    </EmailBase>
  );
};

export default RefundResolvedEmail;
