"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Ticket,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { RefundResolveModal } from "@/components/admin/RefundResolveModal";

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
  }[];
}


export default function PendingRefundsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvingBooking, setResolvingBooking] = useState<Booking | null>(null);

  const fetchBookings = () => {
    fetch("/api/admin/bookings?limit=1000")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.bookings || []).filter(
          (b: Booking) => b.paymentStatus === "REFUND_PENDING"
        );
        setBookings(list);
      })
      .catch((err) => { console.error(err); })
      .finally(() => { setIsLoading(false); });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filtered = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      b.user.name.toLowerCase().includes(q) ||
      b.user.email.toLowerCase().includes(q) ||
      b.experience.title.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q)
    );
  });

  const couponPreferenceCount = bookings.filter(b => b.refundPreference === "COUPON").length;
  const bankPreferenceCount = bookings.filter(b => b.refundPreference === "BANK_REFUND").length;

  let contentElement;
  if (isLoading) {
    contentElement = <TableSkeleton rows={5} columns={6} />;
  } else if (filtered.length === 0) {
    contentElement = (
      <div className="bg-card border border-border rounded-2xl p-16 text-center italic text-foreground/40 text-sm">
        No pending refunds found.
      </div>
    );
  } else {
    contentElement = (
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-foreground/5 border-b border-border">
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40">Booking / Experience</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40">Customer</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Paid Amount</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Refund Asked</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center font-mono">Preference</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/55">
              {filtered.map((b) => (
                <tr key={b.id} className="group hover:bg-foreground/5 transition-colors">
                  <td className="px-6 py-5">
                    <span className="font-bold text-foreground block text-base leading-tight">
                      {b.experience.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-foreground/30 mt-1 block">
                      ID: {b.id.substring(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-bold text-foreground block leading-tight">{b.user.name}</span>
                    <span className="text-xs text-foreground/45 mt-0.5 block">{b.user.email}</span>
                  </td>
                  <td className="px-6 py-5 text-center font-semibold">
                    ₹{Number(b.paidAmount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-5 text-center font-semibold text-amber-500">
                    ₹{Number(b.refundAmount ?? b.paidAmount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      b.refundPreference === "COUPON"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {b.refundPreference === "COUPON" ? "🎟️ Coupon" : "🏦 Bank Refund"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => setResolvingBooking(b)}
                      className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      Resolve →
                    </button>
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
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-500 max-w-[1600px] w-full mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
        <div className="space-y-1 text-left">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground font-bold uppercase tracking-wider mb-2 transition-colors animate-in fade-in duration-200"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Bookings
          </Link>
          <h1 className="text-3xl font-black font-heading flex items-center gap-3">
            <Ticket className="w-8 h-8 text-yellow-500" /> Pending <span className="text-yellow-500">Refunds</span>
          </h1>
          <p className="text-foreground/50 text-sm font-medium">Verify guest cancellations, issue travel coupons, or record bank payouts.</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs text-left">
          <p className="text-xs font-bold text-foreground/45 uppercase tracking-wider">Total Pending</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{bookings.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs text-left">
          <p className="text-xs font-bold text-foreground/45 uppercase tracking-wider">🎟️ Coupon Option</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{couponPreferenceCount}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs text-left">
          <p className="text-xs font-bold text-foreground/45 uppercase tracking-wider">🏦 Bank Transfer</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{bankPreferenceCount}</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
        <input
          type="text"
          placeholder="Search by customer name, email, booking ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-foreground"
        />
      </div>

      {/* Main Table Content Render */}
      {contentElement}

      {resolvingBooking && (
        <RefundResolveModal
          booking={resolvingBooking}
          onClose={() => setResolvingBooking(null)}
          onSuccess={() => {
            setResolvingBooking(null);
            setIsLoading(true);
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}
