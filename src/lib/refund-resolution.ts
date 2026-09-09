import { Prisma } from "@prisma/client";
import { issueCancellationCoupon, restoreCouponsForBooking } from "@/lib/coupon-engine";
import { issueCreditNote } from "@/lib/invoice-numbering";

export type RefundMethod = "TRAVEL_COUPON" | "BANK_TRANSFER";

export interface RefundCompletionBooking {
  id: string;
  userId: string;
  totalPrice: Prisma.Decimal | number;
  paidAmount: Prisma.Decimal | number;
  bookingStatus: string;
  cancellationReason?: string | null;
}

export interface RefundCompletionResult {
  couponCode: string;
  creditNoteNumber: string | null;
  newPaymentStatus: "REFUNDED" | "PARTIALLY_PAID" | "PAID";
}

/**
 * Applies the financial side effects of completing a refund: issues a
 * travel coupon (or records the bank-transfer reference), settles the
 * booking's payment totals, flips stale Payment rows to REFUNDED once fully
 * settled, and issues the matching GST credit note.
 *
 * Shared by both admin refund-resolution endpoints (the booking-detail
 * "Resolve Refund" modal and the dedicated /admin/refunds queue) so the two
 * can't drift the way they previously did -- only one of them was issuing
 * credit notes, and only one of them capped/guarded against re-applying an
 * already-completed refund a second time.
 */
export async function applyRefundCompletion(
  tx: Prisma.TransactionClient,
  params: {
    booking: RefundCompletionBooking;
    refundAmount: number;
    refundMethod: RefundMethod;
    bankReferenceNote: string | undefined;
    adminId: string;
    // Balance owed back to a coupon the customer had already redeemed on
    // this booking -- separate from refundAmount (the cash/new-coupon
    // refund) and only actually restored once this same admin approval
    // fires, per couponRestoreAmount on the RefundRequest row.
    couponRestoreAmount?: number;
    cancellationCharges?: number;
  },
): Promise<RefundCompletionResult> {
  const { booking, refundAmount, refundMethod, bankReferenceNote, adminId, couponRestoreAmount = 0, cancellationCharges = 0 } = params;

  const newPaidAmount = Math.max(0, Number(booking.paidAmount) - refundAmount);
  const remainingBalance = Number(booking.totalPrice) - newPaidAmount;

  let newPaymentStatus: "REFUNDED" | "PARTIALLY_PAID" | "PAID" = "PAID";
  if (booking.bookingStatus === "CANCELLED") {
    newPaymentStatus = "REFUNDED";
  } else if (remainingBalance > 0.01) {
    newPaymentStatus = "PARTIALLY_PAID";
  }

  let couponCode: string;
  if (refundMethod === "TRAVEL_COUPON") {
    couponCode = await issueCancellationCoupon(tx, {
      bookingId: booking.id,
      customerId: booking.userId,
      amount: refundAmount,
      issuedById: adminId,
      reason: `Refund for cancelled booking ${booking.id.substring(0, 8)}`,
    });
  } else {
    couponCode = bankReferenceNote || "Bank Transfer Refund Completed";
  }

  await tx.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: newPaymentStatus,
      paidAmount: newPaidAmount,
      remainingBalance: Math.max(0, remainingBalance),
      refundNote: couponCode,
      refundAmount: null,
    },
  });

  // A booking's individual Payment rows (each charge attempt -- Razorpay,
  // manual bank-transfer verification, coupon settlement) are written PAID
  // at collection time and never revisited. Once the booking itself is
  // fully REFUNDED, those rows are stale and need to be flipped too, or
  // they'd say PAID forever with no trace of the refund. Only applies to a
  // full refund -- a partial refund still legitimately kept some of what
  // was collected, so there's no single row to flip to REFUNDED.
  if (newPaymentStatus === "REFUNDED") {
    await tx.payment.updateMany({
      where: { bookingId: booking.id, status: "PAID" },
      data: { status: "REFUNDED" },
    });
  }

  // Real money (or coupon credit) is being handed back against a
  // previously invoiced booking -- GST requires a credit note for that,
  // referencing the original invoice, in its own sequential series (see
  // lib/invoice-numbering.ts). Skipped for a zero-amount resolution, since
  // there's nothing to credit-note.
  const creditNoteNumber = refundAmount > 0
    ? await issueCreditNote(tx, {
        bookingId: booking.id,
        amount: refundAmount,
        reason: booking.cancellationReason || "Booking cancellation/refund",
      })
    : null;

  // Only now -- with the admin's approval actually committing -- does the
  // customer's previously-redeemed coupon get its balance back. Before
  // this, cancellation only ever computed a preview (dryRun) of this
  // amount; restoreCouponsForBooking's own ledger math makes this safe to
  // call even if some of it turns out already restored or the coupon has
  // since expired.
  if (couponRestoreAmount > 0) {
    await restoreCouponsForBooking({
      bookingId: booking.id,
      cancellationCharges,
      tx,
    });
  }

  return { couponCode, creditNoteNumber, newPaymentStatus };
}
