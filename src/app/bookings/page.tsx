"use client";

import { useEffect, useState, type SVGProps } from "react";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, IndianRupee, Loader2, X, AlertTriangle, MessageCircle } from "lucide-react";
import SaveButton from "@/components/experiences/SaveButton";
import { type RefundBreakdown } from "@/lib/refund-engine";

type TabStatus = "saved" | "pending" | "upcoming" | "past" | "cancelled";

interface SavedItem {
  experience: {
    id: string;
    title: string;
    slug: string;
    images: string[];
    location: string;
    basePrice: number;
    difficulty: string;
    categories: { category: { name: string } }[];
  };
}

interface BookingItem {
  id: string;
  bookingStatus: string;
  paymentStatus: string;
  participantCount: number;
  totalPrice: string;
  paidAmount: string;
  remainingBalance: string;
  cancelledAt?: string | null;
  refundPreference?: string | null;
  refundNote?: string | null;
  cancellationReason?: string | null;
  experience: {
    title: string;
    slug: string;
    images: string[];
    location: string;
    durationDays: number;
    coverImage: string | null;
    cardImage: string | null;
  };
  slot?: {
    date: string;
    whatsAppUrl?: string | null;
  };
  payments: {
    id: string;
    providerOrderId: string | null;
    amount: string;
    status: string;
  }[];
}

interface BookingsData {
  upcoming: BookingItem[];
  pending: BookingItem[];
  past: BookingItem[];
  cancelled: BookingItem[];
}

interface RefundPreviewPanelProps {
  previewData: RefundBreakdown | null;
  isPreviewLoading: boolean;
  preference: "COUPON" | "BANK_REFUND";
}

function RefundPreviewPanel({
  previewData,
  isPreviewLoading,
  preference,
}: Readonly<RefundPreviewPanelProps>) {
  if (isPreviewLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-foreground/50 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Calculating eligible refund details...
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="text-xs text-red-400">
        Failed to load breakdown. Using policy defaults on submit.
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-foreground/60">Trip Cost (Base Fare):</span>
        <span className="font-bold text-foreground">₹{previewData.baseFare.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-foreground/60">
          {preference === "COUPON" ? "GST Component (Refunded as Coupon):" : "GST Component (Non-Refundable):"}
        </span>
        <span className="font-bold text-foreground">₹{previewData.gst.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-foreground/60">
          {preference === "COUPON" ? "Convenience Fee (Refunded as Coupon):" : "Convenience Fee (Non-Refundable):"}
        </span>
        <span className="font-bold text-foreground">₹{previewData.convenienceFee.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex justify-between text-red-400">
        <span>Cancellation Charges ({previewData.cancellationPercent}%):</span>
        <span className="font-bold">-₹{previewData.cancellationCharges.toLocaleString("en-IN")}</span>
      </div>
      
      <div className="border-t border-border/50 pt-2 flex justify-between font-black text-base">
        <span className="text-foreground">Net Refund Amount:</span>
        <span className="text-green-500">₹{previewData.finalRefundAmount.toLocaleString("en-IN")}</span>
      </div>
      
      <p className="text-[10px] text-foreground/45 leading-normal pt-1 italic">
        {preference === "COUPON"
          ? "* GST and Convenience Fee are fully refunded in the form of a travel coupon."
          : "* GST and Convenience Fee are non-refundable for guest-initiated bank refund cancellations."}
      </p>

      <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-bold text-center animate-in fade-in duration-200">
        Confirming: You will receive <strong>₹{previewData.finalRefundAmount.toLocaleString("en-IN")}</strong> {preference === "COUPON" ? "as a Travel Coupon" : "via Bank Transfer"}.
      </div>
    </div>
  );
}

// Cancel Confirmation Modal
function CancelModal({
  booking,
  onClose,
  onSuccess,
}: Readonly<{
  booking: BookingItem;
  onClose: () => void;
  onSuccess: () => void;
}>) {
  const [preference, setPreference] = useState<"COUPON" | "BANK_REFUND">("COUPON");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<RefundBreakdown | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (booking.paymentStatus !== "PAID" && booking.paymentStatus !== "PARTIALLY_PAID") return;
    const fetchPreview = async () => {
      setIsPreviewLoading(true);
      try {
        const res = await fetch(`/api/bookings/${booking.id}/cancel-preview?preference=${preference}`);
        if (!res.ok) throw new Error("Failed to load refund preview");
        const json = await res.json();
        setPreviewData(json);
      } catch (err) {
        console.error(err);
        setPreviewData(null);
      } finally {
        setIsPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [booking.id, booking.paymentStatus, preference]);

  const handleCancel = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-xl font-heading font-bold text-foreground">Cancel Booking</h3>
          </div>
          <button type="button" onClick={onClose} className="text-foreground/40 hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Booking summary */}
          <div className="bg-foreground/5 rounded-xl p-4 border border-border">
            <p className="font-bold text-foreground">{booking.experience.title}</p>
            {booking.slot && (
              <p className="text-foreground/50 text-sm mt-1">
                {formatDate(booking.slot.date)}
              </p>
            )}
            <p className="text-foreground/50 text-sm">
              {booking.participantCount} participant{booking.participantCount > 1 ? "s" : ""} ·{" "}
              ₹{Number(booking.totalPrice).toLocaleString()}
            </p>
            {booking.participantCount > 1 && (
              <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2">
                <p className="text-xs text-foreground/70">
                  💡 <strong>Need to cancel only some of the guests?</strong> Instead of cancelling the whole booking here, you can select individual guest slots.
                </p>
                <Link
                  href={`/bookings/${booking.id}/success#guests`}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start"
                >
                  Go to Guest List & Cancel Individually &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Policy notice */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-amber-400 text-sm font-semibold mb-1">📋 Cancellation Policy</p>
            <p className="text-foreground/60 text-xs leading-relaxed">
              Refunds are subject to our terms and conditions. Depending on how close to the trip date you cancel,
              we may issue a partial coupon or partial bank refund. No full refunds are guaranteed.
              Our team will review and respond within 5–7 business days.
            </p>
          </div>

          {/* Refund preference */}
          {(booking.paymentStatus === "PAID" || booking.paymentStatus === "PARTIALLY_PAID") && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground/70">Refund Preference</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPreference("COUPON")}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    preference === "COUPON"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/60 hover:border-foreground/30"
                  }`}
                >
                  🎟️ Adventure Coupon
                </button>
                <button
                  type="button"
                  onClick={() => setPreference("BANK_REFUND")}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    preference === "BANK_REFUND"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/60 hover:border-foreground/30"
                  }`}
                >
                  🏦 Bank Refund
                </button>
              </div>
              <p className="text-foreground/40 text-xs">
                {preference === "COUPON"
                  ? "A coupon code will be emailed to you for use on any future booking."
                  : "Amount will be transferred to your original payment method (subject to T&C)."}
              </p>
            </div>
          )}

          {/* Refund Breakdown Panel */}
          {(booking.paymentStatus === "PAID" || booking.paymentStatus === "PARTIALLY_PAID") && (
            <div className="bg-foreground/5 border border-border/80 rounded-2xl p-5 text-left space-y-3">
              <span className="text-[10px] font-black text-foreground/45 uppercase tracking-widest block">Refund Breakdown Preview</span>
              <RefundPreviewPanel
                previewData={previewData}
                isPreviewLoading={isPreviewLoading}
                preference={preference}
              />
            </div>
          )}

          {/* Optional reason */}
          <div className="space-y-1.5">
            <label htmlFor="cancel-reason" className="text-sm font-bold text-foreground/60">
              Reason (Optional)
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us why you're cancelling..."
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-20 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-foreground/60 font-bold hover:bg-foreground/5 border border-border transition-colors"
            >
              Keep Booking
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 shadow-lg shadow-red-500/20"
            >
              {isSubmitting ? "Cancelling…" : "Yes, Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PayBalanceModalProps {
  booking: BookingItem;
  onClose: () => void;
  onSuccess: () => void;
  razorpayKeyId: string;
}

function PayBalanceModal({
  booking,
  onClose,
  onSuccess,
  razorpayKeyId,
}: Readonly<PayBalanceModalProps>) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupons, setAppliedCoupons] = useState<{ id: string; code: string; balance: number }[]>([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveCoupon = (couponId: string) => {
    setAppliedCoupons((prev) => prev.filter((c) => c.id !== couponId));
  };

  const totalPrice = Number(booking.remainingBalance);
  const couponDiscount = appliedCoupons.reduce((sum, c) => sum + c.balance, 0);
  const finalPriceToPay = Math.max(0, totalPrice - couponDiscount);

  const handleApplyCoupon = async () => {
    setCouponLoading(true);
    setCouponError(null);
    try {
      const remainingToDiscount = totalPrice - couponDiscount;
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          paymentAmount: remainingToDiscount
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to validate coupon.");

      if (appliedCoupons.some(c => c.code.toUpperCase() === couponCode.toUpperCase().trim())) {
        throw new Error("Coupon already applied.");
      }

      setAppliedCoupons(prev => [...prev, data.coupon]);
      setCouponCode("");
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleProceed = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const isFullyPaidByCoupon = finalPriceToPay <= 0.01;
      if (!isFullyPaidByCoupon) {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error("Failed to load Razorpay script.");
      }

      const res = await fetch(`/api/bookings/${booking.id}/pay-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliedCoupons: appliedCoupons.map(c => c.code)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate payment.");

      if (data.fullyPaidByCoupon) {
        alert("Payment Successful (Fully covered by Coupons)!");
        onSuccess();
        onClose();
        return;
      }

      const { orderId, amount, currency, keyId } = data;
      const RazorpayCtor = globalThis.window.Razorpay;
      if (!RazorpayCtor) {
        throw new Error("Payment gateway is unavailable.");
      }

      const rzp = new RazorpayCtor({
        key: keyId || razorpayKeyId || "",
        amount,
        currency,
        order_id: orderId,
        name: "Param Adventures",
        description: `Balance - ${booking.experience.title}`,
        theme: { color: "#D4AF37" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/bookings/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: booking.id,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);
            alert("Payment Successful!");
            onSuccess();
            onClose();
          } catch (err: any) {
            alert("Payment verification failed: " + err.message);
          }
        },
        modal: {
          ondismiss: () => setIsSubmitting(false),
        },
      });
      rzp.open();

    } catch (err: any) {
      setError(err.message || "Failed to process payment.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-xl font-heading font-bold text-foreground">Pay Remaining Balance</h3>
          <button type="button" onClick={onClose} className="text-foreground/40 hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-foreground/5 rounded-xl p-4 space-y-1.5 text-sm text-left">
            <p className="text-foreground"><strong>Trek:</strong> {booking.experience.title}</p>
            <p className="text-foreground"><strong>Outstanding Balance:</strong> ₹{totalPrice.toLocaleString("en-IN")}</p>
            {appliedCoupons.length > 0 && (
              <p className="text-primary"><strong>Coupon Discount:</strong> - ₹{couponDiscount.toLocaleString("en-IN")}</p>
            )}
            <p className="text-foreground border-t border-border pt-1.5 mt-1 text-base"><strong>Net Payable:</strong> <span className="font-black text-primary">₹{finalPriceToPay.toLocaleString("en-IN")}</span></p>
          </div>

          <div className="space-y-3 pt-2">
            <span className="block text-xs font-black uppercase tracking-wider text-foreground/50 text-left">
              Apply Travel Vouchers & Coupons
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponError(null);
                }}
                placeholder="Enter coupon code (e.g. PARAM-XXXXXX)"
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-foreground/30 uppercase"
              />
              <button
                type="button"
                disabled={couponLoading || !couponCode.trim()}
                onClick={handleApplyCoupon}
                className="px-4 py-2 bg-foreground text-background dark:bg-foreground dark:text-background rounded-xl font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center min-w-[70px]"
              >
                {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
              </button>
            </div>
            {couponError && (
              <p className="text-xs text-red-500 text-left font-semibold">{couponError}</p>
            )}

            {appliedCoupons.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {appliedCoupons.map((coupon) => (
                  <div key={coupon.id} className="flex justify-between items-center bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs">
                    <span className="font-bold text-primary flex items-center gap-1">
                      🎟️ {coupon.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">- ₹{coupon.balance.toLocaleString("en-IN")}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoupon(coupon.id)}
                        className="text-red-500 hover:text-red-700 transition-colors text-[10px] font-bold uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-xs font-semibold text-left">{error}</p>}

          <div className="flex gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5 text-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleProceed}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₹${finalPriceToPay.toLocaleString("en-IN")}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (globalThis.window?.Razorpay !== undefined) {
      resolve(true);
      return;
    }

    const razorpayUrl = new URL("https://checkout.razorpay.com/v1/checkout.js");
    const isTrustedRazorpayHost =
      razorpayUrl.protocol === "https:" && razorpayUrl.hostname === "checkout.razorpay.com";

    if (!isTrustedRazorpayHost) {
      resolve(false);
      return;
    }

    const script = document.createElement("script");
    // Razorpay does not recommend SRI for checkout.js because the file is updated frequently.
    // Mitigation: load only from fixed HTTPS origin and strict referrer policy.
    script.src = razorpayUrl.toString(); // NOSONAR
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getPaymentStatusColor(status: string) {
  if (status === "PAID") return "text-green-500";
  if (status === "PARTIALLY_PAID") return "text-amber-500";
  if (status === "REFUND_PENDING") return "text-orange-500";
  if (status === "REFUNDED") return "text-green-500/80";
  return "text-foreground/50";
}

function getPaymentStatusLabel(status: string) {
  if (status === "PARTIALLY_PAID") return "Partially Paid";
  if (status === "REFUND_PENDING") return "Refund Pending";
  if (status === "REFUNDED") return "Refunded";
  return status;
}

export default function BookingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabStatus>("upcoming");

  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [bookings, setBookings] = useState<BookingsData>({
    upcoming: [],
    pending: [],
    past: [],
    cancelled: [],
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<BookingItem | null>(null);
  const [payingBalanceBooking, setPayingBalanceBooking] = useState<BookingItem | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>("");

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [wishRes, bookRes] = await Promise.all([
        fetch("/api/wishlist"),
        fetch("/api/bookings/my"),
      ]);

      if (wishRes.ok) {
        const wishData = await wishRes.json();
        setSaved(wishData.saved || []);
      }
      if (bookRes.ok) {
        const bookData = await bookRes.json();
        setBookings({
          upcoming: bookData.upcoming || [],
          pending: bookData.pending || [],
          past: bookData.past || [],
          cancelled: bookData.cancelled || [],
        });
        if (bookData.razorpayKeyId) {
          setRazorpayKeyId(bookData.razorpayKeyId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch bookings data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [user, authLoading]);

  if (authLoading)
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center">
        <h2 className="text-2xl font-bold mb-4">
          Please log in to view your bookings
        </h2>
        <Link
          href="/login?redirect=/bookings"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold"
        >
          Log In
        </Link>
      </div>
    );
  }

  const handlePayPending = async (booking: BookingItem) => {
    const payment = booking.payments.find((p) => p.providerOrderId);
    if (!payment?.providerOrderId) {
      alert("No valid Razorpay order ID found for this booking.");
      return;
    }

    setProcessingId(booking.id);
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert("Failed to load payment gateway.");
      setProcessingId(null);
      return;
    }

    const keyId = razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

    const RazorpayCtor = globalThis.window.Razorpay;
    if (!RazorpayCtor) {
      alert("Payment gateway is unavailable.");
      setProcessingId(null);
      return;
    }

    const rzp = new RazorpayCtor({
      key: keyId,
      amount: Math.round(Number.parseFloat(payment.amount) * 100),
      order_id: payment.providerOrderId,
      name: "Param Adventures",
      description: booking.experience.title,
      theme: { color: "#D4AF37" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch("/api/bookings/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error);

          alert("Payment Successful!");
          globalThis.location.reload();
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          alert("Payment verification failed: " + message);
        } finally {
          setProcessingId(null);
        }
      },
      modal: {
        ondismiss: () => setProcessingId(null),
      },
    });
    rzp.open();
  };

  // handlePayBalance removed as unused, balance payments now handled in PayBalanceModal

  const tabs = [
    { id: "saved", label: "Wishlist", count: saved.length },
    { id: "upcoming", label: "Upcoming", count: bookings.upcoming.length },
    { id: "pending", label: "Pending", count: bookings.pending.length },
    { id: "past", label: "Past", count: bookings.past.length },
    { id: "cancelled", label: "Cancelled", count: bookings.cancelled.length },
  ];

  const refundStatusLabel = (b: BookingItem) => {
    if (b.paymentStatus === "REFUNDED") return { label: "Refunded", color: "text-green-400" };
    if (b.paymentStatus === "REFUND_PENDING") return { label: "Refund Pending", color: "text-amber-400" };
    return { label: "No Refund Due", color: "text-foreground/40" };
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-32 pb-20">
      {cancellingBooking && (
        <CancelModal
          booking={cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          onSuccess={() => {
            setCancellingBooking(null);
            fetchData();
          }}
        />
      )}

      {payingBalanceBooking && (
        <PayBalanceModal
          booking={payingBalanceBooking}
          onClose={() => setPayingBalanceBooking(null)}
          onSuccess={() => {
            setPayingBalanceBooking(null);
            fetchData();
          }}
          razorpayKeyId={razorpayKeyId}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-heading font-black text-foreground mb-8">
          My Bookings
        </h1>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 border-b border-border pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabStatus)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
              }`}
            >
              {t.label}{" "}
              {t.count > 0 && (
                <span className="ml-1 opacity-80">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Wishlist Section */}
            {activeTab === "saved" &&
              (saved.length === 0 ? (
                <EmptyState
                  title="Your wishlist is empty"
                  msg="Save experiences you love to easily find them later."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {saved.map((item) => (
                    <div
                      key={item.experience.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden relative group"
                    >
                      <div className="h-48 relative block">
                        <Image
                          src={
                            item.experience.images[0] ||
                            "https://picsum.photos/800/600"
                          }
                          alt="Experience"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <SaveButton
                          experienceId={item.experience.id}
                          initialSaved={true}
                          className="top-4 right-4 z-10"
                        />
                        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
                          {item.experience.difficulty}
                        </div>
                      </div>
                      <div className="p-5 flex flex-col gap-3">
                        <h3 className="font-heading font-bold text-xl line-clamp-1">
                          {item.experience.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-foreground/60">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />{" "}
                            {item.experience.location}
                          </span>
                          <span className="flex items-center gap-1 font-bold text-foreground">
                            <IndianRupee className="w-4 h-4" />{" "}
                            {Number(item.experience.basePrice).toLocaleString()}
                          </span>
                        </div>
                        <Link
                          href={`/experiences/${item.experience.slug}`}
                          className="mt-2 w-full text-center py-2.5 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

            {/* Bookings Render */}
            {activeTab !== "saved" &&
              (bookings[activeTab].length === 0 ? (
                <EmptyState
                  title={`No ${activeTab} trips`}
                  msg="Explore our upcoming adventures and book your next journey!"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookings[activeTab].map((b) => (
                    <div
                      key={b.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
                    >
                      <div className="relative w-full h-40">
                        <Image
                          src={
                            b.experience.images[0] ||
                            "https://picsum.photos/800/600"
                          }
                          fill
                          className="object-cover"
                          alt="Exp"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent"></div>
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <h3 className="font-heading font-bold text-lg line-clamp-1">
                            {b.experience.title}
                          </h3>
                          {b.slot && (
                            <p className="text-sm opacity-90">
                              {formatDate(b.slot.date)}
                            </p>
                          )}
                        </div>
                        {activeTab === "cancelled" && (
                          <div className="absolute top-3 right-3 bg-red-500/80 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                            CANCELLED
                          </div>
                        )}
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-4 text-sm">
                          <span className="text-foreground/60 flex items-center gap-1">
                            <Clock className="w-4 h-4" />{" "}
                            {b.experience.durationDays} Days
                          </span>
                          <span className="font-bold">
                            ₹{Number(b.totalPrice).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mb-2">
                          Participants: <strong>{b.participantCount}</strong>
                        </p>
                        <div className="text-xs space-y-1 mb-4 border-t border-border/30 pt-3">
                          <div className="flex justify-between">
                            <span className="text-foreground/60">Status:</span>
                            <span className={`font-bold ${getPaymentStatusColor(b.paymentStatus)}`}>
                              {getPaymentStatusLabel(b.paymentStatus)}
                            </span>
                          </div>
                          {b.paymentStatus === "PARTIALLY_PAID" && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-foreground/60">Paid:</span>
                                <span className="font-semibold text-green-500">₹{Number(b.paidAmount).toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-foreground/60">Remaining:</span>
                                <span className="font-bold text-red-400">₹{Number(b.remainingBalance).toLocaleString("en-IN")}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Cancelled tab: show richer info */}
                        {activeTab === "cancelled" && (
                          <div className="space-y-2 mb-4">
                            <div className={`text-xs font-bold ${refundStatusLabel(b).color}`}>
                              📋 {refundStatusLabel(b).label}
                            </div>
                            {b.refundPreference && (
                              <div className="text-xs text-foreground/50">
                                Preference: {b.refundPreference === "COUPON" ? "🎟️ Adventure Coupon" : "🏦 Bank Refund"}
                              </div>
                            )}
                            {b.refundNote && (
                              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
                                <p className="text-green-400 text-xs font-bold">
                                  {b.refundPreference === "COUPON" ? "Coupon Code:" : "Bank UTR:"}
                                </p>
                                <p className="text-green-300 text-sm font-mono font-bold">{b.refundNote}</p>
                              </div>
                            )}
                            <p className="text-xs text-foreground/40">
                              Need help?{" "}
                              <a
                                href="mailto:booking@paramadventures.in"
                                className="text-primary hover:underline"
                              >
                                Contact us
                              </a>
                            </p>
                          </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2">
                          {(() => {
                            if (activeTab === "pending") {
                              return (
                                <>
                                  <button
                                    disabled={processingId === b.id}
                                    onClick={() => handlePayPending(b)}
                                    className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center disabled:opacity-50"
                                  >
                                    {processingId === b.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                      "Complete Payment"
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCancellingBooking(b)}
                                    className="w-full py-2.5 text-red-400 font-bold rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors text-sm"
                                  >
                                    Cancel Booking
                                  </button>
                                </>
                              );
                            }
                            if (activeTab === "past") {
                              return (
                                <>
                                  <Link
                                    href={`/bookings/${b.id}/success`}
                                    className="w-full text-center py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold rounded-xl transition"
                                  >
                                    Booking Details
                                  </Link>
                                  <Link
                                    href={`/experiences/${b.experience.slug}`}
                                    className="w-full text-center py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-xl transition"
                                  >
                                    Write a Review
                                  </Link>
                                </>
                              );
                            }
                            if (activeTab === "cancelled") {
                              return (
                                <Link
                                  href={`/bookings/${b.id}/success`}
                                  className="w-full text-center py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold rounded-xl transition"
                                >
                                  View Details
                                </Link>
                              );
                            }
                            // upcoming
                            return (
                              <>
                                {b.slot?.whatsAppUrl && (
                                  <a
                                    href={b.slot.whatsAppUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-950/45 transition-colors text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs"
                                  >
                                    <MessageCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    Join WhatsApp Group
                                  </a>
                                )}
                                {b.paymentStatus === "PARTIALLY_PAID" && (
                                  <button
                                    disabled={processingId === b.id}
                                    onClick={() => setPayingBalanceBooking(b)}
                                    className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center disabled:opacity-50"
                                  >
                                    {processingId === b.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                      `Pay Remaining Balance (₹${Number(b.remainingBalance).toLocaleString("en-IN")})`
                                    )}
                                  </button>
                                )}
                                <Link
                                  href={`/bookings/${b.id}/success`}
                                  className="w-full text-center py-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground font-bold rounded-xl transition"
                                >
                                  Booking Details
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setCancellingBooking(b)}
                                  className="w-full py-2.5 text-red-400 font-bold rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors text-sm"
                                >
                                  Cancel Booking
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, msg }: Readonly<{ title: string; msg: string }>) {
  return (
    <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-foreground/5">
      <CompassIcon className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-foreground/50 mb-6">{msg}</p>
      <Link
        href="/experiences"
        className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg shadow-primary/20"
      >
        Explore Experiences
      </Link>
    </div>
  );
}

function CompassIcon(props: Readonly<SVGProps<SVGSVGElement>>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
