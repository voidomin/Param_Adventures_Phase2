"use client";

import { useState, useEffect } from "react";
import {
  Users,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  ExternalLink,
  Archive,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { ManualVerifyModal } from "@/components/admin/ManualVerifyModal";


type BookingStatus = "REQUESTED" | "CONFIRMED" | "CANCELLED";
type PaymentStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "FAILED" | "REFUND_PENDING" | "REFUNDED";

interface Booking {
  id: string;
  participantCount: number;
  totalPrice: number;
  paidAmount: number;
  remainingBalance: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  refundPreference?: string | null;
  refundNote?: string | null;
  cancellationReason?: string | null;
  refundAmount?: number | null;
  participants?: {
    id: string;
    name: string;
    isCancelled: boolean;
  }[] | null;
  user: {
    name: string;
    email: string;
    phoneNumber?: string | null;
  };
  experience: {
    id: string;
    title: string;
    slug: string;
  };
  slot: {
    date: string;
  } | null;
  payments: {
    id: string;
    status: PaymentStatus;
    amount: number;
    providerPaymentId?: string | null;
    provider: "RAZORPAY" | "MANUAL";
    createdAt: string;
    fullPayload?: {
      proofUrl?: string | null;
      adminNotes?: string | null;
      verifiedBy?: string | null;
      verifiedAt?: string | null;
    } | null;
  }[];
}

const statusStyles: Record<BookingStatus, string> = {
  REQUESTED: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  CONFIRMED: "bg-green-500/10 text-green-600 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const paymentStyles: Record<PaymentStatus, string> = {
  PENDING: "text-yellow-500",
  PARTIALLY_PAID: "text-amber-500",
  PAID: "text-green-500",
  FAILED: "text-red-500",
  REFUND_PENDING: "text-amber-400",
  REFUNDED: "text-blue-400",
};

const STATUS_FILTERS: (BookingStatus | "ALL")[] = [
  "ALL",
  "REQUESTED",
  "CONFIRMED",
  "CANCELLED",
];

// Module-level utility — no component state needed
function formatDate(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Resolve Refund Modal
function RefundResolveModal({
  booking,
  onClose,
  onSuccess,
}: Readonly<{
  booking: Booking;
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
    if (amt > Number(booking.paidAmount)) {
      setError(`Refund amount cannot exceed the paid amount of ₹${Number(booking.paidAmount).toLocaleString()}`);
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
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Resolve Refund</h3>
          <p className="text-foreground/50 text-sm mt-1">{booking.user.name} — {booking.experience.title}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-foreground/5 rounded-xl p-4 space-y-1">
            <p className="text-sm text-foreground">
              <strong>Amount (Paid):</strong> ₹{Number(booking.paidAmount).toLocaleString()}
            </p>
            <p className="text-sm text-foreground">
              <strong>Preference:</strong>{" "}
              {isCoupon ? "🎟️ Adventure Coupon" : "🏦 Bank Refund"}
            </p>
            {booking.cancellationReason && (
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

// Booking Details Modal
function BookingDetailsModal({
  booking,
  onClose,
  onApprove,
  onArchive,
}: Readonly<{
  booking: Booking;
  onClose: () => void;
  onApprove?: () => void;
  onArchive?: () => void;
}>) {
  const payments = booking.payments;
  const isCancelled = booking.bookingStatus === "CANCELLED";
  const hasRefund = booking.paymentStatus === "REFUND_PENDING" || booking.paymentStatus === "REFUNDED";

  const handleCopyId = () => {
    navigator.clipboard.writeText(booking.id);
    alert("Booking ID copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">Booking Details</h3>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[10px] font-mono bg-foreground/5 text-foreground/60 px-2 py-0.5 rounded hover:bg-foreground/10 transition-colors"
                title="Click to copy ID"
              >
                ID: {booking.id.substring(0, 8)}... (copy)
              </button>
            </div>
            <p className="text-foreground/50 text-xs mt-0.5">
              Booked on {new Date(booking.createdAt).toLocaleString("en-IN")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Main Info Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <div className="bg-foreground/[0.01] border border-border/60 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Customer Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-foreground/45">Name</p>
                  <p className="font-semibold text-foreground">{booking.user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/45">Email</p>
                  <p className="font-medium text-foreground">{booking.user.email}</p>
                </div>
                {booking.user.phoneNumber && (
                  <div>
                    <p className="text-xs text-foreground/45">Phone Number</p>
                    <a
                      href={`tel:${booking.user.phoneNumber}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1 mt-0.5"
                    >
                      {booking.user.phoneNumber}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Trip Details */}
            <div className="bg-foreground/[0.01] border border-border/60 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Trip Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-foreground/45">Experience</p>
                  <Link
                    href={`/admin/trips/${booking.experience.id}`}
                    onClick={onClose}
                    className="font-semibold text-primary hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {booking.experience.title}
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-foreground/45">Trip Date</p>
                    <p className="font-medium text-foreground">
                      {booking.slot ? formatDate(booking.slot.date) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/45">Participants</p>
                    <p className="font-medium text-foreground">{booking.participantCount} Pax</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-foreground/45">Booking Status</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 rounded-full text-[10px] font-bold border ${statusStyles[booking.bookingStatus]}`}
                    >
                      {booking.bookingStatus}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/45">Payment Status</p>
                    <span className={`inline-block font-bold mt-1 text-xs ${paymentStyles[booking.paymentStatus]}`}>
                      {booking.paymentStatus}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                  <div>
                    <p className="text-xs text-foreground/45">Total Price</p>
                    <p className="font-bold text-foreground">₹{Number(booking.totalPrice).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/45">Paid Amount</p>
                    <p className="font-bold text-green-500">₹{Number(booking.paidAmount || 0).toLocaleString("en-IN")}</p>
                  </div>
                  {Number(booking.remainingBalance) > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-foreground/45">Remaining Balance</p>
                      <p className="font-bold text-red-500">₹{Number(booking.remainingBalance).toLocaleString("en-IN")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Refund & Cancellation Section (if applicable) */}
          {(isCancelled || hasRefund) && (
            <div className="bg-red-500/[0.02] border border-red-500/10 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-red-500/60 uppercase tracking-wider flex items-center gap-1.5">
                Cancellation & Refund Status
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {booking.cancelledAt && (
                  <div>
                    <p className="text-xs text-foreground/45">Cancelled At</p>
                    <p className="font-medium text-foreground">{new Date(booking.cancelledAt).toLocaleString("en-IN")}</p>
                  </div>
                )}
                {booking.refundPreference && (
                  <div>
                    <p className="text-xs text-foreground/45">Refund Preference</p>
                    <span className="font-semibold text-foreground">
                      {booking.refundPreference === "COUPON" ? "🎟️ Adventure Coupon" : "🏦 Bank Refund"}
                    </span>
                  </div>
                )}
                {booking.cancellationReason && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-foreground/45">Cancellation Reason</p>
                    <p className="text-foreground/80 mt-0.5">{booking.cancellationReason}</p>
                  </div>
                )}
                {booking.refundNote && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-foreground/45">Refund UTR / Coupon Code</p>
                    <p className="font-mono text-xs text-primary font-bold bg-primary/5 border border-primary/10 rounded px-2.5 py-1.5 mt-1">
                      {booking.refundNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payments List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider">Transaction History</h4>
            {payments.length === 0 ? (
              <p className="text-foreground/40 text-sm text-center py-4 border border-dashed border-border rounded-xl">
                No transaction attempts found.
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => {
                  const isManual = p.provider === "MANUAL";
                  return (
                    <div
                      key={`modal-payment-${p.id}`}
                      className={`rounded-xl border p-4 space-y-3 ${
                        isManual ? "bg-blue-500/[0.02] border-blue-500/20" : "bg-foreground/[0.01] border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            isManual
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : "bg-primary/10 text-primary border-primary/20"
                          }`}
                        >
                          {isManual ? "🏦 Manual" : "💳 Razorpay"}
                        </span>
                        <span className={`text-xs font-bold ${p.status === "PAID" ? "text-green-500" : "text-yellow-500"}`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-foreground/45 text-xs">Amount</p>
                          <p className="font-bold text-foreground">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-foreground/45 text-xs">Transaction Date</p>
                          <p className="font-medium text-foreground">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN") : "—"}
                          </p>
                        </div>
                        {p.providerPaymentId && (
                          <div className="col-span-2">
                            <p className="text-foreground/45 text-xs">Transaction ID / Reference ID</p>
                            <p className="font-mono text-xs text-foreground break-all">{p.providerPaymentId}</p>
                          </div>
                        )}
                      </div>

                      {isManual && p.fullPayload && (
                        <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                          {p.fullPayload.adminNotes && (
                            <div>
                              <p className="text-foreground/45 text-xs">Admin Notes</p>
                              <p className="text-foreground">{p.fullPayload.adminNotes}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {p.fullPayload.verifiedBy && (
                              <div>
                                <p className="text-foreground/45 text-xs">Verified By</p>
                                <p className="text-foreground">{p.fullPayload.verifiedBy}</p>
                              </div>
                            )}
                            {p.fullPayload.verifiedAt && (
                              <div>
                                <p className="text-foreground/45 text-xs">Verified At</p>
                                <p className="text-foreground">
                                  {new Date(p.fullPayload.verifiedAt).toLocaleString("en-IN")}
                                </p>
                              </div>
                            )}
                          </div>
                          {p.fullPayload.proofUrl && (
                            <div className="pt-1">
                              <a
                                href={p.fullPayload.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View Payment Screenshot
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex flex-wrap gap-3">
          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all text-xs"
            >
              Archive Booking
            </button>
          )}
          {onApprove && booking.bookingStatus === "REQUESTED" && booking.paymentStatus !== "PAID" && (
            <button
              type="button"
              onClick={onApprove}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity ml-auto"
            >
              Approve Payment
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`py-2.5 px-6 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5 transition-colors text-xs ${
              booking.bookingStatus !== "REQUESTED" || booking.paymentStatus === "PAID" ? "ml-auto" : ""
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment Mode Detail component to resolve nesting lint error
function PaymentModeDetail({ payments }: Readonly<{ payments: Booking["payments"] }>) {
  const paidPayment = payments.find(p => p.status === "PAID" || p.status === "REFUNDED" || p.status === "REFUND_PENDING");
  if (!paidPayment) return null;
  const isManual = paidPayment.provider === "MANUAL";
  return (
    <div className="text-[10px] text-foreground/50 whitespace-nowrap flex flex-col">
      <span className="font-medium text-foreground/60">
        {isManual ? "🏦 Manual" : "💳 Razorpay"}
      </span>
      {paidPayment.providerPaymentId && (
        <span className="font-mono text-[9px] text-foreground/40 max-w-[120px] truncate" title={paidPayment.providerPaymentId}>
          ID: {paidPayment.providerPaymentId}
        </span>
      )}
    </div>
  );
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<{ id: string; amount: number } | null>(null);
  const [resolvingBooking, setResolvingBooking] = useState<Booking | null>(null);
  const [activeDetailsBooking, setActiveDetailsBooking] = useState<Booking | null>(null);

  // Pagination and specialized refund filtering states
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyRefunds, setShowOnlyRefunds] = useState(false);
  const itemsPerPage = 15;

  // New filters state
  const [bookingDateStart, setBookingDateStart] = useState("");
  const [bookingDateEnd, setBookingDateEnd] = useState("");
  const [slotDateStart, setSlotDateStart] = useState("");
  const [slotDateEnd, setSlotDateEnd] = useState("");
  const [viewArchived, setViewArchived] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hideFinishedTrips, setHideFinishedTrips] = useState(true);

  // Reset pagination when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, showOnlyRefunds, bookingDateStart, bookingDateEnd, slotDateStart, slotDateEnd, viewArchived]);

  const fetchBookings = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (bookingDateStart) params.set("bookingDateStart", bookingDateStart);
    if (bookingDateEnd) params.set("bookingDateEnd", bookingDateEnd);
    if (slotDateStart) params.set("slotDateStart", slotDateStart);
    if (slotDateEnd) params.set("slotDateEnd", slotDateEnd);
    if (viewArchived) params.set("archived", "true");
    params.set("limit", "1000");

    setIsLoading(true);
    fetch(`/api/admin/bookings?${params}`)
      .then((r) => r.json())
      .then((d) => { setBookings(d.bookings || []); })
      .catch((err) => { console.error(err); })
      .finally(() => { setIsLoading(false); });
  };

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (bookingDateStart) params.set("bookingDateStart", bookingDateStart);
    if (bookingDateEnd) params.set("bookingDateEnd", bookingDateEnd);
    if (slotDateStart) params.set("slotDateStart", slotDateStart);
    if (slotDateEnd) params.set("slotDateEnd", slotDateEnd);
    if (viewArchived) params.set("archived", "true");
    params.set("limit", "1000");

    setIsLoading(true);
    fetch(`/api/admin/bookings?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setBookings(d.bookings || []);
      })
      .catch((err) => {
        if (active) console.error(err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [statusFilter, bookingDateStart, bookingDateEnd, slotDateStart, slotDateEnd, viewArchived]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (bookingDateStart) params.set("bookingDateStart", bookingDateStart);
      if (bookingDateEnd) params.set("bookingDateEnd", bookingDateEnd);
      if (slotDateStart) params.set("slotDateStart", slotDateStart);
      if (slotDateEnd) params.set("slotDateEnd", slotDateEnd);
      if (viewArchived) params.set("archived", "true");
      params.set("limit", "10000");

      const response = await fetch(`/api/admin/bookings?${params}`);
      const data = await response.json();
      const exportBookings = data.bookings || [];

      if (exportBookings.length === 0) {
        alert("No bookings to export.");
        return;
      }

      interface ExportBooking {
        id: string;
        user?: {
          name?: string | null;
          email?: string | null;
          phoneNumber?: string | null;
        } | null;
        experience?: {
          title: string;
        } | null;
        slot?: {
          date: string | Date;
        } | null;
        participantCount: number;
        totalPrice: number | string;
        bookingStatus: string;
        paymentStatus: string;
        createdAt: string | Date;
      }

      // Map to flat structure for Excel
      const rows = exportBookings.map((b: ExportBooking) => ({
        "Booking ID": b.id,
        "Customer Name": b.user?.name || "—",
        "Customer Email": b.user?.email || "—",
        "Customer Phone": b.user?.phoneNumber || "—",
        "Experience Title": b.experience?.title || "—",
        "Slot Date": b.slot ? new Date(b.slot.date) : "—",
        "Pax Count": b.participantCount,
        "Total Paid (INR)": Number(b.totalPrice),
        "Booking Status": b.bookingStatus,
        "Payment Status": b.paymentStatus,
        "Booking Date": new Date(b.createdAt),
      }));

      // Dynamically import xlsx (SheetJS)
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: "yyyy-mm-dd" });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

      // Auto-fit column widths
      const maxLens = Object.keys(rows[0]).reduce((acc, key) => {
        acc[key] = key.length;
        return acc;
      }, {} as Record<string, number>);

      rows.forEach((row: Record<string, unknown>) => {
        Object.keys(row).forEach((key) => {
          const valStr = row[key] instanceof Date
            ? row[key].toISOString().split("T")[0]
            : String(row[key] ?? "");
          if (valStr.length > maxLens[key]) {
            maxLens[key] = valStr.length;
          }
        });
      });

      worksheet["!cols"] = Object.keys(maxLens).map((key) => ({
        wch: Math.max(maxLens[key] + 3, 10),
      }));

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `bookings_export_${dateStr}.xlsx`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export bookings. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const getConfirmationMode = (booking: Booking): string => {
    if (booking.bookingStatus !== "CONFIRMED") return "";
    const paidPayment = booking.payments.find(p => p.status === "PAID");
    if (paidPayment) {
      if (paidPayment.provider === "RAZORPAY") return "Razorpay (Auto)";
      if (paidPayment.provider === "MANUAL") return "Manual (Admin)";
    }
    return "System";
  };

  const handleArchiveBooking = async (id: string) => {
    if (!confirm("Are you sure you want to archive this booking? This will hide it from the active lists.")) return;
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive booking");
      alert("Booking archived successfully.");
      fetchBookings();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  const filtered = bookings.filter((b) => {
    if (showOnlyRefunds) {
      if (b.paymentStatus !== "REFUND_PENDING") return false;
    }
    if (hideFinishedTrips && !viewArchived) {
      if (!b.slot) return false;
      const tripDate = new Date(b.slot.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (tripDate < today) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.user.name.toLowerCase().includes(q) ||
      b.user.email.toLowerCase().includes(q) ||
      b.experience.title.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    );
  });

  // Sort filtered list: bubble up REFUND_PENDING by default
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aRefund = a.paymentStatus === "REFUND_PENDING" ? 1 : 0;
    const bRefund = b.paymentStatus === "REFUND_PENDING" ? 1 : 0;
    if (aRefund !== bRefund) {
      return bRefund - aRefund; // REFUND_PENDING comes first
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalPages = Math.ceil(sortedFiltered.length / itemsPerPage);
  const paginated = sortedFiltered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const statusIcon = (s: BookingStatus) => {
    if (s === "CONFIRMED") return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (s === "CANCELLED") return <XCircle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  // Summary stats
  const totalRevenue = bookings
    .filter((b) => b.bookingStatus === "CONFIRMED")
    .reduce((acc, b) => acc + Number(b.totalPrice), 0);
  const confirmedCount = bookings.filter(
    (b) => b.bookingStatus === "CONFIRMED",
  ).length;
  const requestedCount = bookings.filter(
    (b) => b.bookingStatus === "REQUESTED",
  ).length;

  const pendingRefunds = bookings.filter(
    (b) => b.paymentStatus === "REFUND_PENDING"
  );

  const isActiveTab = !viewArchived;
  const isArchivedTab = viewArchived;

  let bookingsContent;
  if (isLoading) {
    bookingsContent = <TableSkeleton columns={8} rows={10} />;
  } else if (filtered.length === 0) {
    bookingsContent = (
      <div className="bg-card border border-border rounded-2xl p-16 text-center">
        <Users className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
        <p className="text-foreground/50">No bookings found.</p>
      </div>
    );
  } else {
    bookingsContent = (
      <div className="space-y-4">
        {/* Mobile View: Card List */}
        <div className="block md:hidden space-y-4">
          {paginated.map((b) => {
            const confMode = getConfirmationMode(b);
            
            return (
              <div
                key={b.id}
                className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm relative hover:shadow-md transition-all duration-200"
              >
                {/* Header: Customer and Date */}
                <button
                  type="button"
                  className="w-full text-left bg-transparent border-0 p-0 flex items-start justify-between gap-2 cursor-pointer hover:opacity-80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                  onClick={() => setActiveDetailsBooking(b)}
                  title="Click to view details"
                >
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">
                      {b.user.name}
                    </p>
                    <p className="text-xs text-foreground/50">{b.user.email}</p>
                    {b.user.phoneNumber && (
                      <p className="text-xs text-foreground/40">{b.user.phoneNumber}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-foreground/40">Booked On</p>
                    <p className="text-xs font-medium text-foreground/75">
                      {formatDate(b.createdAt)}
                    </p>
                    {new Date(b.updatedAt).getTime() - new Date(b.createdAt).getTime() > 60000 && (
                      <p className="text-[10px] font-semibold text-primary mt-1">
                        Upd: {formatDate(b.updatedAt)}
                      </p>
                    )}
                  </div>
                </button>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-border/50 py-3">
                  <div>
                    <p className="text-foreground/40">Experience</p>
                    <Link
                      href={`/admin/trips/${b.experience.id}`}
                      className="font-semibold text-primary hover:underline line-clamp-1"
                    >
                      {b.experience.title}
                    </Link>
                  </div>
                  <div>
                    <p className="text-foreground/40">Trip Date</p>
                    <p className="font-medium text-foreground">
                      {b.slot ? formatDate(b.slot.date) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground/40">Pax & Price</p>
                    <div className="font-medium text-foreground text-xs flex flex-col gap-0.5 mt-0.5">
                      <div>
                        {(() => {
                          const cancelledCount = b.participants ? b.participants.filter(p => p.isCancelled).length : 0;
                          if (cancelledCount > 0) {
                            const totalCount = b.participants ? b.participants.length : b.participantCount;
                            const activeCount = totalCount - cancelledCount;
                            return (
                              <span className="text-foreground font-semibold">
                                {activeCount} Active ({cancelledCount} Refund Asked)
                              </span>
                            );
                          }
                          return <span>{b.participantCount} Pax</span>;
                        })()}
                        {" · "}
                        {b.paymentStatus === "PARTIALLY_PAID" ? (
                          <span>₹{Number(b.paidAmount).toLocaleString("en-IN")} paid / ₹{Number(b.totalPrice).toLocaleString("en-IN")}</span>
                        ) : (
                          <span>₹{Number(b.totalPrice).toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-foreground/40">Status</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusStyles[b.bookingStatus]}`}
                      >
                        {statusIcon(b.bookingStatus)}
                        {b.bookingStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment & Confirmation Details */}
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/40">Booking Confirmed:</span>
                    <span className="font-semibold text-foreground">{confMode || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/40">Payment Status:</span>
                    <span className={`font-bold ${paymentStyles[b.paymentStatus]}`}>{b.paymentStatus}</span>
                  </div>
                  <div className="mt-1 pt-1.5 border-t border-border/30">
                    <PaymentModeDetail payments={b.payments} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setActiveDetailsBooking(b)}
                    className="flex-1 py-2 rounded-xl bg-foreground/5 text-foreground/60 font-bold hover:bg-foreground/10 transition-colors flex items-center justify-center gap-1 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                  {b.bookingStatus === "REQUESTED" && b.paymentStatus !== "PAID" && (
                    <button
                      onClick={() => {
                        const pending = b.payments.find((p) => p.status === "PENDING");
                        const amt = pending ? Number(pending.amount) : Number(b.remainingBalance);
                        setSelectedBooking({ id: b.id, amount: amt });
                      }}
                      className="flex-2 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleArchiveBooking(b.id)}
                    className="p-2 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Archive/Hide Booking"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-foreground/[0.02] border-b border-border">
                  {[
                    "Customer",
                    "Experience",
                    "Trip Date",
                    "Pax",
                    "Amount",
                    "Status",
                    "Payment",
                    "Booked On",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-foreground/50 uppercase tracking-wider px-5 py-4 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((b) => {
                  const confMode = getConfirmationMode(b);
                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-foreground/[0.02] transition-colors"
                    >
                      <td 
                        className="px-5 py-4 cursor-pointer hover:text-primary transition-all"
                        onClick={() => setActiveDetailsBooking(b)}
                        title="Click to view details"
                      >
                        <p className="font-semibold text-foreground text-sm">
                          {b.user.name}
                        </p>
                        <p className="text-xs text-foreground/50">{b.user.email}</p>
                        {b.user.phoneNumber && (
                          <p className="text-xs text-foreground/40">
                            {b.user.phoneNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/trips/${b.experience.id}`}
                          className="font-medium text-primary hover:underline text-sm line-clamp-1"
                        >
                          {b.experience.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-foreground/70 whitespace-nowrap">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {b.slot ? formatDate(b.slot.date) : "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground/70">
                        {(() => {
                          const cancelledCount = b.participants ? b.participants.filter(p => p.isCancelled).length : 0;
                          if (cancelledCount > 0) {
                            const totalCount = b.participants ? b.participants.length : b.participantCount;
                            const activeCount = totalCount - cancelledCount;
                            return (
                              <div className="flex flex-col">
                                <span className="font-semibold">{activeCount} Active</span>
                                <span className="text-[10px] text-red-400 font-medium">{cancelledCount} Refund Asked</span>
                              </div>
                            );
                          }
                          return <span>{b.participantCount} Pax</span>;
                        })()}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">
                        {b.paymentStatus === "PARTIALLY_PAID" ? (
                          <div className="flex flex-col">
                            <span className="text-green-500">₹{Number(b.paidAmount).toLocaleString("en-IN")}</span>
                            <span className="text-[10px] text-foreground/40 font-normal">paid of ₹{Number(b.totalPrice).toLocaleString("en-IN")}</span>
                          </div>
                        ) : (
                          <span>₹{Number(b.totalPrice).toLocaleString("en-IN")}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[b.bookingStatus]}`}
                          >
                            {statusIcon(b.bookingStatus)}
                            {b.bookingStatus}
                          </span>
                          {b.bookingStatus === "CONFIRMED" && (
                            <span className="text-[10px] font-bold text-foreground/40 pl-1">
                              via {confMode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-xs font-bold ${paymentStyles[b.paymentStatus]}`}
                          >
                            {b.paymentStatus}
                          </span>
                          <PaymentModeDetail payments={b.payments} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-foreground/50 whitespace-nowrap">
                        <div>
                          <p className="text-foreground/70" title="Creation Date">
                            Booked: {formatDate(b.createdAt)}
                          </p>
                          {new Date(b.updatedAt).getTime() - new Date(b.createdAt).getTime() > 60000 && (
                            <p className="text-[10px] text-primary mt-0.5" title="Last update/payment active date">
                              Updated: {formatDate(b.updatedAt)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveDetailsBooking(b)}
                            className="p-2 rounded-lg bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground transition-all"
                            title="View Booking Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {b.bookingStatus === "REQUESTED" && b.paymentStatus !== "PAID" && (
                            <button
                              onClick={() => {
                                const pending = b.payments.find((p) => p.status === "PENDING");
                                const amt = pending ? Number(pending.amount) : Number(b.remainingBalance);
                                setSelectedBooking({ id: b.id, amount: amt });
                              }}
                              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1.5 text-xs font-bold"
                              title="Approve Manual Payment"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve Manual
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleArchiveBooking(b.id)}
                            className="p-2 rounded-lg bg-red-500/5 text-red-500/60 hover:bg-red-500/10 hover:text-red-500 transition-all"
                            title="Archive/Hide Booking"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 mt-4">
            <span className="text-xs text-foreground/50">
              Showing {Math.min(sortedFiltered.length, (currentPage - 1) * itemsPerPage + 1)} to{" "}
              {Math.min(sortedFiltered.length, currentPage * itemsPerPage)} of {sortedFiltered.length} bookings
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-bold uppercase tracking-wider text-foreground/70 hover:bg-foreground/5 disabled:opacity-40 disabled:hover:bg-card cursor-pointer"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                const isNearCurrent = Math.abs(pageNumber - currentPage) <= 1;
                const isEndPage = pageNumber === 1 || pageNumber === totalPages;
                
                if (!isNearCurrent && !isEndPage) {
                  if (pageNumber === 2 || pageNumber === totalPages - 1) {
                    return <span key={`ellipsis-${pageNumber}`} className="text-xs text-foreground/30 px-1">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={`page-${pageNumber}`}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNumber
                        ? "bg-primary text-primary-foreground font-black shadow-md shadow-primary/10"
                        : "border border-border bg-card text-foreground/70 hover:bg-foreground/5"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-bold uppercase tracking-wider text-foreground/70 hover:bg-foreground/5 disabled:opacity-40 disabled:hover:bg-card cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Bookings Dashboard
          </h1>
          <p className="text-foreground/60 mt-1">
            Manage trip reservations, approve manual uploads, and view payment reports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link
            href="/admin/refunds"
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500 text-amber-600 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 h-11"
          >
            Refund Requests
          </Link>
          <Link
            href="/admin/coupons"
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500 text-blue-600 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 h-11"
          >
            Travel Coupons
          </Link>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full sm:w-auto px-5 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 h-11 cursor-pointer"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Manifest
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active vs Archived Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setViewArchived(false);
          }}
          className={`px-4 py-2.5 border-b-2 text-sm font-bold transition-all -mb-px cursor-pointer ${
            isActiveTab
              ? "border-primary text-primary font-bold"
              : "border-transparent text-foreground/60 hover:text-foreground/90"
          }`}
        >
          Active Bookings
        </button>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setViewArchived(true);
          }}
          className={`px-4 py-2.5 border-b-2 text-sm font-bold transition-all -mb-px cursor-pointer ${
            isArchivedTab
              ? "border-primary text-primary font-bold"
              : "border-transparent text-foreground/60 hover:text-foreground/90"
          }`}
        >
          Archived Bookings
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Confirmed Revenue</p>
          <p className="text-2xl font-bold mt-1 text-foreground">₹{totalRevenue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Confirmed Bookings</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{confirmedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Requested Bookings</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{requestedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">Total Active</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{bookings.length}</p>
        </div>
      </div>

      {/* Refund Pending Alerts */}
      {pendingRefunds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 gap-4 animate-in fade-in duration-200 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                Refund Verification Required
              </p>
              <p className="text-xs text-foreground/60 mt-0.5">
                You have {pendingRefunds.length} pending refund {pendingRefunds.length === 1 ? "request" : "requests"} that require action.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowOnlyRefunds(!showOnlyRefunds);
              setCurrentPage(1);
            }}
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer border ${
              showOnlyRefunds 
                ? "bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-600" 
                : "bg-transparent text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
            }`}
          >
            {showOnlyRefunds ? "Show All Bookings" : "View Requests"}
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 bg-foreground/[0.01] border border-border/60 rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-foreground/30" />
            <input
              type="text"
              placeholder="Search by name, email, experience..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label htmlFor="hide-finished-trips" className="flex items-center gap-2 text-xs font-bold text-foreground/60 cursor-pointer select-none">
              <input
                id="hide-finished-trips"
                type="checkbox"
                checked={hideFinishedTrips}
                onChange={(e) => setHideFinishedTrips(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
              />{" "}
              Hide Completed Trips
            </label>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-foreground/40 shrink-0" />
              <div className="flex gap-1.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setIsLoading(true);
                      setStatusFilter(s);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                      statusFilter === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground/60 hover:bg-foreground/5"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card border border-border rounded-2xl shadow-xs">
          <div className="space-y-1.5">
            <label htmlFor="booking-date-start" className="block text-xs font-bold text-foreground/50 uppercase tracking-wider">
              <span>Booking Date From</span>
              <input
                id="booking-date-start"
                type="date"
                value={bookingDateStart}
                onChange={(e) => {
                  setIsLoading(true);
                  const val = e.target.value;
                  if (val) {
                    const parts = val.split("-");
                    if (parts[0] && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      setBookingDateStart(parts.join("-"));
                      return;
                    }
                  }
                  setBookingDateStart(val);
                }}
                className="mt-1.5 w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [color-scheme:dark]"
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="booking-date-end" className="block text-xs font-bold text-foreground/50 uppercase tracking-wider">
              <span>Booking Date To</span>
              <input
                id="booking-date-end"
                type="date"
                value={bookingDateEnd}
                onChange={(e) => {
                  setIsLoading(true);
                  const val = e.target.value;
                  if (val) {
                    const parts = val.split("-");
                    if (parts[0] && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      setBookingDateEnd(parts.join("-"));
                      return;
                    }
                  }
                  setBookingDateEnd(val);
                }}
                className="mt-1.5 w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [color-scheme:dark]"
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="slot-date-start" className="block text-xs font-bold text-foreground/50 uppercase tracking-wider">
              <span>Slot Date From (Trip)</span>
              <input
                id="slot-date-start"
                type="date"
                value={slotDateStart}
                onChange={(e) => {
                  setIsLoading(true);
                  const val = e.target.value;
                  if (val) {
                    const parts = val.split("-");
                    if (parts[0] && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      setSlotDateStart(parts.join("-"));
                      return;
                    }
                  }
                  setSlotDateStart(val);
                }}
                className="mt-1.5 w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [color-scheme:dark]"
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <label htmlFor="slot-date-end" className="block text-xs font-bold text-foreground/50 uppercase tracking-wider">
                  <span>Slot Date To (Trip)</span>
                  <input
                    id="slot-date-end"
                    type="date"
                    value={slotDateEnd}
                    onChange={(e) => {
                      setIsLoading(true);
                      const val = e.target.value;
                      if (val) {
                        const parts = val.split("-");
                        if (parts[0] && parts[0].length > 4) {
                          parts[0] = parts[0].slice(0, 4);
                          setSlotDateEnd(parts.join("-"));
                          return;
                        }
                      }
                      setSlotDateEnd(val);
                    }}
                    className="mt-1.5 w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [color-scheme:dark]"
                  />
                </label>
              </div>
              {(bookingDateStart || bookingDateEnd || slotDateStart || slotDateEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    setBookingDateStart("");
                    setBookingDateEnd("");
                    setSlotDateStart("");
                    setSlotDateEnd("");
                  }}
                  className="px-3 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 text-xs font-bold border border-red-500/20 transition-all shrink-0 cursor-pointer h-[38px] flex items-center justify-center"
                  title="Clear Date Filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {bookingsContent}

      {/* ─── Cancellations Section ───────────────────────── */}
      {pendingRefunds.length > 0 && (
        <div className="mt-12 pt-8 border-t border-border">
          <div className="mb-6">
            <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {" Pending Refunds "}
              <span className="ml-2 text-sm font-normal bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                {pendingRefunds.length}
              </span>
            </h2>
            <p className="text-foreground/50 mt-1 text-sm">
              Users are waiting for a coupon code or bank refund. Resolve each one manually.
            </p>
          </div>
          <div className="grid gap-4">
            {pendingRefunds.map((b) => (
              <div key={b.id} className="bg-card border border-amber-500/20 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-foreground">{b.user.name}{" "}
                    <span className="text-foreground/40 font-normal text-sm">&lt;{b.user.email}&gt;</span>
                  </p>
                  <p className="text-sm text-foreground/60">{b.experience.title}{b.slot ? ` · ${formatDate(b.slot.date)}` : ""}</p>
                  <p className="text-sm">
                    ₹{Number(b.totalPrice).toLocaleString("en-IN")} ·{" "}
                    {(() => {
                      const cancelledCount = b.participants ? b.participants.filter(p => p.isCancelled).length : 0;
                      if (cancelledCount > 0) {
                        const totalCount = b.participants ? b.participants.length : b.participantCount;
                        return (
                          <span>
                            {cancelledCount} Refund Asked{" "}
                            <span className="text-foreground/45 font-normal text-xs">
                              (of {totalCount} pax)
                            </span>
                          </span>
                        );
                      }
                      return <span>{b.participantCount} pax</span>;
                    })()}
                  </p>
                  {b.cancellationReason && (
                    <p className="text-xs text-foreground/40">Reason: {b.cancellationReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                    b.refundPreference === "COUPON"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}>
                    {b.refundPreference === "COUPON" ? "🎟️ Coupon" : "🏦 Bank Refund"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResolvingBooking(b)}
                    className="px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Resolve →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedBooking && (
        <ManualVerifyModal
          bookingId={selectedBooking.id}
          bookingAmount={selectedBooking.amount}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onSuccess={() => { fetchBookings(); }}
        />
      )}

      {resolvingBooking && (
        <RefundResolveModal
          booking={resolvingBooking}
          onClose={() => setResolvingBooking(null)}
          onSuccess={() => {
            setResolvingBooking(null);
            fetchBookings();
          }}
        />
      )}

      {activeDetailsBooking && (
        <BookingDetailsModal
          booking={activeDetailsBooking}
          onClose={() => setActiveDetailsBooking(null)}
          onApprove={() => {
            setActiveDetailsBooking(null);
            const pending = activeDetailsBooking.payments.find((p) => p.status === "PENDING");
            const amt = pending ? Number(pending.amount) : Number(activeDetailsBooking.remainingBalance);
            setSelectedBooking({ id: activeDetailsBooking.id, amount: amt });
          }}
          onArchive={() => {
            setActiveDetailsBooking(null);
            handleArchiveBooking(activeDetailsBooking.id);
          }}
        />
      )}
    </div>
  );
}
