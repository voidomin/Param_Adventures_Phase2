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
} from "lucide-react";
import Link from "next/link";

type BookingStatus = "REQUESTED" | "CONFIRMED" | "CANCELLED";
type PaymentStatus = "PENDING" | "PAID" | "FAILED";

interface Booking {
  id: string;
  participantCount: number;
  totalPrice: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
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

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">(
    "ALL",
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    setIsLoading(true);
    fetch(`/api/admin/bookings?${params}`)
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

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
      return (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        </div>
      );
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Bookings
          </h1>
          <p className="text-foreground/60 mt-1">
            All bookings across all experiences.
          </p>
        </div>
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
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <div className={`${s.color} opacity-70`}>{s.icon}</div>
            <div>
              <p className="text-xs text-foreground/50">{s.label}</p>
              <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
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

      {renderTableContent()}
    </div>
  );
}
