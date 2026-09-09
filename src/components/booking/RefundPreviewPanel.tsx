"use client";

import { Loader2 } from "lucide-react";
import type { RefundBreakdown } from "@/lib/refund-engine";

interface RefundPreviewPanelProps {
  previewData: RefundBreakdown | null;
  isPreviewLoading: boolean;
  preference: "COUPON" | "BANK_REFUND";
  errorMessage?: string | null;
  // Balance that would be restored to a coupon already redeemed on this
  // booking. Shown as a heads-up only -- restoring it isn't automatic,
  // it happens once an admin approves the refund, same as the cash amount
  // above.
  couponRestoreAmount?: number;
}

/**
 * Customer-facing refund breakdown shown before they confirm a
 * cancellation (full or partial). Only the numbers that explain "what do
 * I get back and why" -- base fare, the policy's cancellation charge, and
 * the final refund -- are shown at full weight. GST and the convenience
 * fee are real but administrative deductions that don't change that
 * story, so they're folded into one small note instead of two more bold
 * rows; a customer deciding whether to cancel shouldn't have to parse a
 * tax invoice to find the number that matters.
 *
 * Shared by the two customer cancel surfaces (full cancel in
 * src/app/bookings/page.tsx, partial cancel in EditParticipantsClient)
 * so the two can't drift out of sync with each other.
 */
export function RefundPreviewPanel({
  previewData,
  isPreviewLoading,
  preference,
  errorMessage,
  couponRestoreAmount,
}: Readonly<RefundPreviewPanelProps>) {
  return (
    <div className="bg-foreground/5 border border-border/80 rounded-2xl p-5 text-left space-y-3">
      <span className="text-[10px] font-black text-foreground/45 uppercase tracking-widest block">
        Refund Breakdown Preview
      </span>

      {isPreviewLoading && (
        <div className="flex items-center gap-2 text-xs text-foreground/50 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" /> Calculating eligible refund details...
        </div>
      )}

      {!isPreviewLoading && !previewData && (
        <div className="text-xs text-red-400">
          {errorMessage || "Failed to load breakdown. Using policy defaults on submit."}
        </div>
      )}

      {!isPreviewLoading && previewData && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Trip Cost (Base Fare):</span>
            <span className="font-bold text-foreground">₹{previewData.baseFare.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-red-400">
            <span>Cancellation Charges ({previewData.cancellationPercent}%):</span>
            <span className="font-bold">-₹{previewData.cancellationCharges.toLocaleString("en-IN")}</span>
          </div>

          <div className="border-t border-border/50 pt-2 flex justify-between font-black text-base">
            <span className="text-foreground">Net Refund Amount:</span>
            <span className="text-green-500">₹{previewData.finalRefundAmount.toLocaleString("en-IN")}</span>
          </div>

          {(previewData.gst > 0 || previewData.convenienceFee > 0) && (
            <p className="text-[10px] text-foreground/45 leading-normal pt-1 italic">
              * Includes ₹{(previewData.gst + previewData.convenienceFee).toLocaleString("en-IN")} in taxes &amp; fees
              (GST + convenience fee) —{" "}
              {preference === "COUPON"
                ? "fully refunded in the form of a travel coupon."
                : "non-refundable for a bank refund."}
            </p>
          )}

          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-bold text-center animate-in fade-in duration-200">
            Confirming: You will receive{" "}
            <strong>₹{previewData.finalRefundAmount.toLocaleString("en-IN")}</strong>{" "}
            {preference === "COUPON" ? "as a Travel Coupon" : "via Bank Transfer"}.
          </div>

          {!!couponRestoreAmount && couponRestoreAmount > 0 && (
            <p className="text-[10px] text-foreground/45 leading-normal pt-1 italic">
              * Your coupon credit of ₹{couponRestoreAmount.toLocaleString("en-IN")} will be restored to your
              wallet once this refund is approved -- not immediately.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
