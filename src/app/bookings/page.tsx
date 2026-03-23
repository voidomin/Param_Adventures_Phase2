"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import { Clock, MapPin, IndianRupee, Loader2, X, AlertTriangle } from "lucide-react";
import SaveButton from "@/components/experiences/SaveButton";

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
  };
  slot?: {
    date: string;
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
                {new Date(booking.slot.date).toLocaleDateString("en-IN", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric"
                })}
              </p>
            )}
            <p className="text-foreground/50 text-sm">
              {booking.participantCount} participant{booking.participantCount > 1 ? "s" : ""} ·{" "}
              ₹{Number(booking.totalPrice).toLocaleString()}
            </p>
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
          {booking.paymentStatus === "PAID" && (
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
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[80px] resize-none"
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

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (
      typeof globalThis !== "undefined" &&
      (globalThis as any).Razorpay !== undefined
    ) {
      resolve(true);
      return;
    }
    const script = globalThis.document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js"; // NOSONAR
    script.crossOrigin = "anonymous";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    globalThis.document.body.appendChild(script);
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

    const rzp = new (globalThis as any).Razorpay({
      key: keyId,
      amount: Number.parseInt(payment.amount) * 100,
      order_id: payment.providerOrderId,
      name: "Param Adventures",
      description: booking.experience.title,
      theme: { color: "#D4AF37" },
      handler: async (response: Record<string, string>) => {
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
        } catch (err: any) {
          alert("Payment verification failed: " + err.message);
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
                        <img
                          src={
                            item.experience.images[0] ||
                            "https://picsum.photos/800/600"
                          }
                          alt="Experience"
                          className="w-full h-full object-cover"
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
              (bookings[activeTab as keyof BookingsData].length === 0 ? (
                <EmptyState
                  title={`No ${activeTab} trips`}
                  msg="Explore our upcoming adventures and book your next journey!"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bookings[activeTab as keyof BookingsData].map((b) => (
                    <div
                      key={b.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
                    >
                      <div className="h-40 relative block">
                        <img
                          src={
                            b.experience.images[0] ||
                            "https://picsum.photos/800/600"
                          }
                          className="w-full h-full object-cover"
                          alt="Exp"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
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
                        <p className="text-sm mb-4">
                          Participants: <strong>{b.participantCount}</strong>
                        </p>

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CompassIcon(props: Readonly<any>) {
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
