"use client";

import { useState } from "react";

interface RefundResolveBooking {
  id: string;
  paidAmount: number;
  refundAmount?: number | null;
  refundPreference?: string | null;
  cancellationReason?: string | null;
  user: { name: string };
  experience: { title: string };
}

export function RefundResolveModal({
  booking,
  onClose,
  onSuccess,
}: Readonly<{
  booking: RefundResolveBooking;
  onClose: () => void;
  onSuccess: () => void;
}>) {
  const isCoupon = booking.refundPreference === "COUPON";
  const [note, setNote] = useState(isCoupon ? "AUTO_GENERATE" : "");
  const [customAmount, setCustomAmount] = useState(
    String(booking.refundAmount ?? booking.paidAmount)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    if (!note.trim()) { setError("Please enter a bank UTR number"); return; }
    const amt = Number(customAmount);
    if (Number.isNaN(amt) || amt < 0) {
      setError("Please enter a valid non-negative refund amount.");
      return;
    }
    const effectiveCap = booking.refundAmount
      ? Math.max(Number(booking.paidAmount), Number(booking.refundAmount))
      : Number(booking.paidAmount);

    if (amt > effectiveCap) {
      setError(`Refund amount cannot exceed the paid/refund limit of ₹${effectiveCap.toLocaleString()}`);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundNote: note,
          refundAmount: amt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border text-left">
          <h3 className="text-lg font-bold text-foreground">Resolve Refund</h3>
          <p className="text-foreground/50 text-sm mt-1">{booking.user.name} — {booking.experience.title}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-foreground/5 rounded-xl p-4 space-y-1 text-left">
            <p className="text-sm text-foreground">
              <strong>Amount (Paid):</strong> ₹{Number(booking.paidAmount).toLocaleString()}
            </p>
            {!!booking.refundAmount && (
              <p className="text-sm text-foreground">
                <strong>Suggested Refund (Canceled):</strong> ₹{Number(booking.refundAmount).toLocaleString()}
              </p>
            )}
            <p className="text-sm text-foreground">
              <strong>Preference:</strong>{" "}
              {isCoupon ? "🎟️ Adventure Coupon" : "🏦 Bank Refund"}
            </p>
            {!!booking.cancellationReason && (
              <p className="text-xs text-foreground/50">
                <strong>Reason:</strong> {booking.cancellationReason}
              </p>
            )}
          </div>

          {isCoupon ? (
            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label htmlFor="custom-amount" className="text-sm font-bold text-foreground/60">
                  Voucher Value (Refund Amount)
                </label>
                <input
                  id="custom-amount"
                  type="number"
                  step="any"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setError(null);
                  }}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                <p className="text-[10px] text-foreground/40 leading-relaxed mt-1">
                  Adjust this value to match custom policy deductions (e.g. for late cancellations). Paid amount was: ₹{Number(booking.paidAmount).toLocaleString("en-IN")}.
                </p>
              </div>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-primary leading-relaxed">
                  🎟️ A Travel Coupon code worth <strong>₹{Number(customAmount || 0).toLocaleString()}</strong> will be automatically generated and emailed to the customer.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="refund-note" className="text-sm font-bold text-foreground/60">
                Bank UTR / Reference
              </label>
              <input
                id="refund-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. UTR123456789"
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5">
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleResolve}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Resolving…" : "Mark Resolved"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
