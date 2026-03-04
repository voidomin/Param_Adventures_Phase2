"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  CalendarDays,
  Users,
  IndianRupee,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Slot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
}

interface BookingModalProps {
  experienceId: string;
  experienceTitle: string;
  experienceSlug: string;
  basePrice: number;
  maxCapacity: number;
  onClose: () => void;
}

type Step = "slots" | "summary" | "processing" | "success" | "error";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((globalThis as any).Razorpay !== undefined) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
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

export default function BookingModal({
  experienceId,
  experienceTitle,
  experienceSlug,
  basePrice,
  maxCapacity,
  onClose,
}: Readonly<BookingModalProps>) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [participants, setParticipants] = useState(1);
  const [step, setStep] = useState<Step>("slots");
  const [errorMsg, setErrorMsg] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [slotPage, setSlotPage] = useState(0);
  const SLOTS_PER_PAGE = 4;

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/experiences/${experienceSlug}/slots`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [experienceSlug]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const totalPrice = basePrice * participants;
  const visibleSlots = slots.slice(
    slotPage * SLOTS_PER_PAGE,
    (slotPage + 1) * SLOTS_PER_PAGE,
  );
  const totalPages = Math.ceil(slots.length / SLOTS_PER_PAGE);

  async function handleProceedToPay() {
    setStep("processing");
    setErrorMsg("");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setErrorMsg(
        "Failed to load payment gateway. Please check your internet connection.",
      );
      setStep("error");
      return;
    }

    try {
      // Create booking + Razorpay order
      const bookRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          slotId: selectedSlot!.id,
          participantCount: participants,
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok)
        throw new Error(bookData.error || "Failed to create booking.");

      const { bookingId: bId, orderId, amount, currency, keyId } = bookData;
      setBookingId(bId);

      // Launch Razorpay checkout
      const rzp = new (globalThis as any).Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Param Adventures",
        description: experienceTitle,
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
                bookingId: bId,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);
            setStep("success");
          } catch (err: unknown) {
            setErrorMsg(
              err instanceof Error
                ? err.message
                : "Payment verification failed.",
            );
            setStep("error");
          }
        },
        modal: {
          ondismiss: () => {
            // User closed modal without paying — go back to summary
            setStep("summary");
          },
        },
      });
      rzp.open();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">
              Book Experience
            </h2>
            <p className="text-xs text-foreground/50 mt-0.5 truncate max-w-[280px]">
              {experienceTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors text-foreground/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Slot Selection */}
        {step === "slots" && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
              Choose a Date
            </h3>

            {slotsLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {!slotsLoading && slots.length === 0 && (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 text-foreground/20" />
                <p className="text-foreground/50 font-medium">
                  No available dates
                </p>
                <p className="text-foreground/40 text-sm mt-1">
                  Check back soon for upcoming slots.
                </p>
              </div>
            )}

            {!slotsLoading && slots.length > 0 && (
              <>
                <div className="space-y-3">
                  {visibleSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selectedSlot?.id === slot.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/30 bg-background"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays
                          className={`w-5 h-5 ${selectedSlot?.id === slot.id ? "text-primary" : "text-foreground/40"}`}
                        />
                        <div className="text-left">
                          <p className="font-semibold text-foreground text-sm">
                            {formatDate(slot.date)}
                          </p>
                          <p className="text-xs text-foreground/50 mt-0.5">
                            {slot.remainingCapacity} seat
                            {slot.remainingCapacity === 1 ? "" : "s"} available
                          </p>
                        </div>
                      </div>
                      {selectedSlot?.id === slot.id && (
                        <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={() => setSlotPage((p) => Math.max(0, p - 1))}
                      disabled={slotPage === 0}
                      className="p-1.5 rounded-lg border border-border hover:bg-foreground/5 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-foreground/50">
                      {slotPage + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setSlotPage((p) => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={slotPage === totalPages - 1}
                      className="p-1.5 rounded-lg border border-border hover:bg-foreground/5 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Participants */}
            {selectedSlot && (
              <div className="mt-6 p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-foreground/50" />
                    <span className="text-sm font-medium text-foreground">
                      Participants
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setParticipants((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-foreground/5 transition-colors font-bold text-foreground"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold text-foreground">
                      {participants}
                    </span>
                    <button
                      onClick={() =>
                        setParticipants((p) =>
                          Math.min(
                            Math.min(
                              maxCapacity,
                              selectedSlot.remainingCapacity,
                            ),
                            p + 1,
                          ),
                        )
                      }
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-foreground/5 transition-colors font-bold text-foreground"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Price + CTA */}
            {selectedSlot && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-foreground/60">
                    ₹{basePrice.toLocaleString("en-IN")} × {participants} person
                    {participants === 1 ? "" : "s"}
                  </span>
                  <span className="text-xl font-black text-primary">
                    ₹{totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <button
                  onClick={() => setStep("summary")}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  Review Booking
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step: Summary */}
        {step === "summary" && selectedSlot && (
          <div className="p-6 space-y-5">
            <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider">
              Booking Summary
            </h3>

            <div className="space-y-3">
              {[
                {
                  icon: <CalendarDays className="w-4 h-4" />,
                  label: "Date",
                  value: formatDate(selectedSlot.date),
                },
                {
                  icon: <Users className="w-4 h-4" />,
                  label: "Participants",
                  value: `${participants} person${participants === 1 ? "" : "s"}`,
                },
                {
                  icon: <IndianRupee className="w-4 h-4" />,
                  label: "Total",
                  value: `₹${totalPrice.toLocaleString("en-IN")}`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-3 border-b border-border last:border-none"
                >
                  <div className="flex items-center gap-2 text-foreground/60">
                    {row.icon}
                    <span className="text-sm">{row.label}</span>
                  </div>
                  <span className="font-semibold text-foreground text-sm">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-foreground/[0.03] border border-border rounded-xl p-3 text-xs text-foreground/50 text-center">
              Secure payment powered by Razorpay • 100% Safe
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("slots")}
                className="flex-1 py-3 border border-border rounded-xl text-foreground/70 hover:bg-foreground/5 transition-colors font-medium"
              >
                ← Edit
              </button>
              <button
                onClick={handleProceedToPay}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Pay ₹{totalPrice.toLocaleString("en-IN")}
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="font-semibold text-foreground">Preparing payment…</p>
            <p className="text-sm text-foreground/50 mt-1">
              Please do not close this window.
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-heading font-black text-foreground mb-2">
              Booking Confirmed!
            </h3>
            <p className="text-foreground/60 text-sm mb-1">
              Your adventure on{" "}
              <strong>{formatDate(selectedSlot!.date)}</strong> is confirmed.
            </p>
            <p className="text-xs text-foreground/40 mt-1 font-mono">
              ID: {bookingId.slice(0, 8)}…
            </p>
            <div className="mt-6 space-y-2">
              <a
                href="/dashboard"
                className="block w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                View My Bookings
              </a>
              <button
                onClick={onClose}
                className="block w-full py-2.5 text-foreground/60 text-sm hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-heading font-bold text-foreground mb-2">
              Payment Failed
            </h3>
            <p className="text-foreground/60 text-sm mb-6">
              {errorMsg || "Something went wrong."}
            </p>
            <button
              onClick={() => setStep("summary")}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
