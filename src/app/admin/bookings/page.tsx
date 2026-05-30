"use client";

import { useState, useEffect } from "react";
import {
  Users,
  CalendarDays,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { ManualVerifyModal } from "@/components/admin/ManualVerifyModal";


type BookingStatus = "REQUESTED" | "CONFIRMED" | "CANCELLED";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUND_PENDING" | "REFUNDED";

interface Booking {
  id: string;
  participantCount: number;
  totalPrice: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  cancelledAt?: string | null;
  refundPreference?: string | null;
  refundNote?: string | null;
  cancellationReason?: string | null;
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
    status: PaymentStatus;
    amount: number;
    providerPaymentId?: string | null;
    provider: "RAZORPAY" | "MANUAL";
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
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCoupon = booking.refundPreference === "COUPON";

  const handleResolve = async () => {
    if (!note.trim()) { setError("Please enter a " + (isCoupon ? "coupon code" : "bank UTR number")); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundNote: note }),
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
              <strong>Amount:</strong> ₹{Number(booking.totalPrice).toLocaleString()}
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
          <div className="space-y-1.5">
            <label htmlFor="refund-note" className="text-sm font-bold text-foreground/60">
              {isCoupon ? "Coupon Code" : "Bank UTR / Reference"}
            </label>
            <input
              id="refund-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isCoupon ? "e.g. PARAM2024TREK" : "e.g. UTR123456789"}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
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

// Payment Details Modal
function PaymentDetailsModal({
  booking,
  onClose,
}: Readonly<{
  booking: Booking;
  onClose: () => void;
}>) {
  const payments = booking.payments;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Payment Records</h3>
            <p className="text-foreground/50 text-sm mt-0.5">
              {booking.user.name} — {booking.experience.title}
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
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {payments.length === 0 ? (
            <p className="text-foreground/40 text-sm text-center py-4">No payment records found.</p>
          ) : (
            payments.map((p, i) => {
              const isManual = p.provider === "MANUAL";
              return (
                <div key={i} className={`rounded-xl border p-4 space-y-3 ${
                  isManual
                    ? "bg-blue-500/5 border-blue-500/20"
                    : "bg-foreground/[0.02] border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                      isManual
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}>
                      {isManual ? "🏦 Manual" : "💳 Razorpay"}
                    </span>
                    <span className={`text-xs font-bold ${
                      p.status === "PAID" ? "text-green-500" : "text-yellow-500"
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-foreground/40 text-xs">Amount</p>
                      <p className="font-bold text-foreground">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                    </div>
                    {p.providerPaymentId && (
                      <div>
                        <p className="text-foreground/40 text-xs">Transaction / Reference ID</p>
                        <p className="font-mono text-xs text-foreground break-all">{p.providerPaymentId}</p>
                      </div>
                    )}
                  </div>

                  {isManual && p.fullPayload && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      {p.fullPayload.adminNotes && (
                        <div>
                          <p className="text-foreground/40 text-xs">Admin Notes</p>
                          <p className="text-sm text-foreground">{p.fullPayload.adminNotes}</p>
                        </div>
                      )}
                      {p.fullPayload.verifiedAt && (
                        <div>
                          <p className="text-foreground/40 text-xs">Verified At</p>
                          <p className="text-sm text-foreground">
                            {new Date(p.fullPayload.verifiedAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                      )}
                      {p.fullPayload.proofUrl && (
                        <div>
                          <p className="text-foreground/40 text-xs mb-1.5">Payment Proof</p>
                          <a
                            href={p.fullPayload.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Screenshot
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
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
  const [viewPaymentBooking, setViewPaymentBooking] = useState<Booking | null>(null);

  // New filters state
  const [bookingDateStart, setBookingDateStart] = useState("");
  const [bookingDateEnd, setBookingDateEnd] = useState("");
  const [slotDateStart, setSlotDateStart] = useState("");
  const [slotDateEnd, setSlotDateEnd] = useState("");
  const [viewArchived, setViewArchived] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

      // Map to flat structure for Excel
      const rows = exportBookings.map((b: any) => ({
        "Booking ID": b.id,
        "Customer Name": b.user?.name || "—",
        "Customer Email": b.user?.email || "—",
        "Customer Phone": b.user?.phoneNumber || "—",
        "Experience Title": b.experience?.title || "—",
        "Slot Date": b.slot ? new Date(b.slot.date).toLocaleDateString("en-IN") : "—",
        "Pax Count": b.participantCount,
        "Total Paid (INR)": Number(b.totalPrice),
        "Booking Status": b.bookingStatus,
        "Payment Status": b.paymentStatus,
        "Booking Date": new Date(b.createdAt).toLocaleDateString("en-IN"),
      }));

      // Dynamically import xlsx (SheetJS)
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

      // Auto-fit column widths
      const maxLens = Object.keys(rows[0]).reduce((acc, key) => {
        acc[key] = key.length;
        return acc;
      }, {} as Record<string, number>);

      rows.forEach((row: any) => {
        Object.keys(row).forEach((key) => {
          const valStr = String(row[key]);
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

  const filtered = bookings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.user.name.toLowerCase().includes(q) ||
      b.user.email.toLowerCase().includes(q) ||
      b.experience.title.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    );
  });

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

  function renderTableContent() {
    if (isLoading) {
      return <TableSkeleton columns={8} rows={10} />;
    }
    if (filtered.length === 0) {
      return (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
          <p className="text-foreground/50">No bookings found.</p>
        </div>
      );
    }
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-foreground/[0.02]">
                {[
                  "Customer",
                  "Experience",
                  "Slot Date",
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
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-foreground/[0.02] transition-colors"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-foreground text-sm">
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
                      href={`/experiences/${b.experience.slug}`}
                      className="text-sm font-medium text-primary hover:underline"
                      target="_blank"
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
                    {b.participantCount}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-foreground">
                    ₹{Number(b.totalPrice).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[b.bookingStatus]}`}
                    >
                      {statusIcon(b.bookingStatus)}
                      {b.bookingStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-semibold ${paymentStyles[b.paymentStatus]}`}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-foreground/50 whitespace-nowrap">
                    {formatDate(b.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {b.payments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setViewPaymentBooking(b)}
                          className="p-2 rounded-lg bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground transition-all"
                          title="View Payment Records"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {b.bookingStatus === "REQUESTED" && b.paymentStatus !== "PAID" && (
                        <button
                          onClick={() => setSelectedBooking({ id: b.id, amount: Number(b.totalPrice) })}
                          className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1.5 text-xs font-bold"
                          title="Approve Manual Payment"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Manual
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {viewArchived ? "Archived Bookings" : "Bookings"}
          </h1>
          <p className="text-foreground/60 mt-1">
            {viewArchived
              ? "Bookings archived after 30 days of trip end."
              : "All active bookings across all experiences."}
          </p>
        </div>
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm border border-primary/20 hover:shadow-primary/5 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Exporting..." : "Export to Excel"}
        </button>
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
            !viewArchived
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
            viewArchived
              ? "border-primary text-primary font-bold"
              : "border-transparent text-foreground/60 hover:text-foreground/90"
          }`}
        >
          Archived Bookings
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Bookings",
            value: bookings.length,
            icon: <Users className="w-5 h-5" />,
            color: "text-foreground",
          },
          {
            label: "Confirmed",
            value: confirmedCount,
            icon: <CheckCircle2 className="w-5 h-5" />,
            color: "text-green-500",
          },
          {
            label: "Pending",
            value: requestedCount,
            icon: <Clock className="w-5 h-5" />,
            color: "text-yellow-500",
          },
          {
            label: "Revenue",
            value: `₹${totalRevenue.toLocaleString("en-IN")}`,
            icon: <IndianRupee className="w-5 h-5" />,
            color: "text-primary",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-xs"
          >
            <div className={`${s.color} opacity-70`}>{s.icon}</div>
            <div>
              <p className="text-xs text-foreground/50">{s.label}</p>
              <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Search by name, email, experience..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
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

      {/* Date Range Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card border border-border rounded-2xl mb-6 shadow-xs">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
            Booking Date From
          </label>
          <input
            type="date"
            value={bookingDateStart}
            onChange={(e) => {
              setIsLoading(true);
              setBookingDateStart(e.target.value);
            }}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
            Booking Date To
          </label>
          <input
            type="date"
            value={bookingDateEnd}
            onChange={(e) => {
              setIsLoading(true);
              setBookingDateEnd(e.target.value);
            }}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
            Slot Date From (Trip)
          </label>
          <input
            type="date"
            value={slotDateStart}
            onChange={(e) => {
              setIsLoading(true);
              setSlotDateStart(e.target.value);
            }}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
            Slot Date To (Trip)
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={slotDateEnd}
              onChange={(e) => {
                setIsLoading(true);
                setSlotDateEnd(e.target.value);
              }}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [color-scheme:dark]"
            />
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
                className="px-3 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 text-xs font-bold border border-red-500/20 transition-all shrink-0 cursor-pointer"
                title="Clear Date Filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {renderTableContent()}

      {/* ─── Cancellations Section ───────────────────────── */}
      {(() => {
        const pending = bookings.filter(b => b.paymentStatus === "REFUND_PENDING");
        if (pending.length === 0) return null;
        return (
          <div className="mt-12 pt-8 border-t border-border">
            <div className="mb-6">
              <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {" Pending Refunds "}
                <span className="ml-2 text-sm font-normal bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                  {pending.length}
                </span>
              </h2>
              <p className="text-foreground/50 mt-1 text-sm">
                Users are waiting for a coupon code or bank refund. Resolve each one manually.
              </p>
            </div>
            <div className="grid gap-4">
              {pending.map(b => (
                <div key={b.id} className="bg-card border border-amber-500/20 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-foreground">{b.user.name}{" "}
                      <span className="text-foreground/40 font-normal text-sm">&lt;{b.user.email}&gt;</span>
                    </p>
                    <p className="text-sm text-foreground/60">{b.experience.title}{b.slot ? ` · ${formatDate(b.slot.date)}` : ""}</p>
                    <p className="text-sm">₹{Number(b.totalPrice).toLocaleString("en-IN")} · {b.participantCount} pax</p>
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
        );
      })()}

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

      {viewPaymentBooking && (
        <PaymentDetailsModal
          booking={viewPaymentBooking}
          onClose={() => setViewPaymentBooking(null)}
        />
      )}
    </div>
  );
}
