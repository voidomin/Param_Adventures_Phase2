"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Loader2,
  XCircle,
  TrendingDown,
} from "lucide-react";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

type RefundStatus = "REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "PAYMENT_INITIATED" | "TRANSFER_COMPLETED" | "COMPLETED";

interface RefundRequest {
  id: string;
  bookingId: string;
  customerId: string;
  refundMethod: string;
  baseFare: number;
  gst: number;
  convenienceFee: number;
  cancellationPercent: number;
  cancellationCharges: number;
  finalRefundAmount: number;
  status: RefundStatus;
  requestedAt: string;
  approvedAt?: string | null;
  processedAt?: string | null;
  utrNumber?: string | null;
  remarks?: string | null;
  customer: {
    name: string;
    email: string;
    phoneNumber?: string | null;
  };
  booking: {
    totalPrice: number;
    paidAmount: number;
    bookingStatus: string;
    paymentStatus: string;
    experience: {
      title: string;
    };
    slot?: {
      date: string;
    } | null;
  };
}

const statusStyles: Record<RefundStatus, string> = {
  REQUESTED: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  UNDER_REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  APPROVED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PAYMENT_INITIATED: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  TRANSFER_COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  COMPLETED: "bg-green-500/10 text-green-600 border-green-500/20",
};

function formatDate(d: string) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<RefundStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);

  // Review Modal States
  const [modalStatus, setModalStatus] = useState<RefundStatus>("REQUESTED");
  const [modalUtr, setModalUtr] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchRefunds = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/refunds?status=${filterStatus}`);
      if (!res.ok) throw new Error("Failed to load refund requests");
      const data = await res.json();
      setRefunds(data.refunds || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [filterStatus]);

  const handleOpenReview = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setModalStatus(refund.status);
    setModalUtr(refund.utrNumber || "");
    setModalRemarks(refund.remarks || "");
    setModalError(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRefund) return;
    setIsUpdating(true);
    setModalError(null);

    // Validate UTR if moving to COMPLETED or TRANSFER_COMPLETED
    if ((modalStatus === "COMPLETED" || modalStatus === "TRANSFER_COMPLETED") && !modalUtr.trim()) {
      setModalError("UTR number is required to finalize the transfer.");
      setIsUpdating(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/refunds/${selectedRefund.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: modalStatus,
          utrNumber: modalUtr,
          remarks: modalRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setSelectedRefund(null);
      fetchRefunds();
    } catch (err: any) {
      setModalError(err.message || "Failed to save changes.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter local refunds by query
  const filteredRefunds = refunds.filter((refund) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      refund.customer.name.toLowerCase().includes(query) ||
      refund.customer.email.toLowerCase().includes(query) ||
      refund.booking.experience.title.toLowerCase().includes(query) ||
      refund.bookingId.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
        <div className="space-y-1 text-left">
          <h1 className="text-3xl font-black font-heading flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" /> Refund <span className="text-primary">Requests</span>
          </h1>
          <p className="text-foreground/50 text-sm font-medium">Review and process guest bank transfer refunds.</p>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-card p-4 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
          <input
            type="text"
            placeholder="Search by customer, experience, or booking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-foreground/45 uppercase font-black tracking-wider">
            <Filter className="w-3.5 h-3.5" /> Filter Status
          </div>
          <div className="flex items-center gap-1.5 bg-background p-1 border border-border rounded-xl">
            {(["ALL", "REQUESTED", "UNDER_REVIEW", "APPROVED", "PAYMENT_INITIATED", "TRANSFER_COMPLETED", "COMPLETED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === st
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 animate-bounce" />
          <p className="font-bold">{error}</p>
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center italic text-foreground/40 text-sm">
          No refund requests match your search filters.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-foreground/5 border-b border-border">
                  <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40">Booking / Experience</th>
                  <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40">Customer</th>
                  <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Paid Amount</th>
                  <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center font-mono">Deductions</th>
                  <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Refund Amount</th>
                  <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Status</th>
                  <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/55">
                {filteredRefunds.map((refund) => {
                  const dedGst = Number(refund.gst);
                  const dedConv = Number(refund.convenienceFee);
                  const cancellationCharges = Number(refund.cancellationCharges);
                  const totalDeductions = dedGst + dedConv + cancellationCharges;

                  return (
                    <tr key={refund.id} className="group hover:bg-foreground/5 transition-colors">
                      <td className="px-6 py-5">
                        <span className="font-bold text-foreground block text-base leading-tight">{refund.booking.experience.title}</span>
                        <span className="text-[10px] font-mono font-bold text-foreground/30 mt-1 block">ID: {refund.bookingId.substring(0, 8)}...</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-bold text-foreground block leading-tight">{refund.customer.name}</span>
                        <span className="text-xs text-foreground/45 mt-0.5 block">{refund.customer.email}</span>
                      </td>
                      <td className="px-6 py-5 text-center font-semibold">
                        ₹{Number(refund.booking.paidAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-5 text-center font-mono text-xs text-red-500 font-bold">
                        -₹{totalDeductions.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-5 text-center text-green-500 font-black text-base">
                        ₹{Number(refund.finalRefundAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusStyles[refund.status]}`}>
                          {refund.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleOpenReview(refund)}
                          className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-primary/25"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL & STATUS TRANSITION MODAL */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-foreground">Review Refund Ticket</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="text-foreground/40 hover:text-foreground transition-colors text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-left">
              {/* Proportional breakdown */}
              <div className="bg-foreground/5 rounded-2xl p-5 border border-border/50 space-y-2">
                <span className="text-[10px] font-black text-foreground/45 uppercase tracking-widest block mb-2">Deduction & Refund Ledger</span>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-foreground/50">Base Fare:</span>
                  <span className="font-bold text-foreground text-right">₹{Number(selectedRefund.baseFare).toLocaleString("en-IN")}</span>
                  
                  <span className="text-foreground/50">Cancellation Charge ({selectedRefund.cancellationPercent}%):</span>
                  <span className="font-bold text-red-500 text-right">-₹{Number(selectedRefund.cancellationCharges).toLocaleString("en-IN")}</span>
                  
                  <span className="text-foreground/50">GST Deducted (Non-Refundable):</span>
                  <span className="font-bold text-red-500 text-right">-₹{Number(selectedRefund.gst).toLocaleString("en-IN")}</span>
                  
                  <span className="text-foreground/50">Convenience Fee (Non-Refundable):</span>
                  <span className="font-bold text-red-500 text-right">-₹{Number(selectedRefund.convenienceFee).toLocaleString("en-IN")}</span>
                  
                  <div className="col-span-2 border-t border-border/50 pt-2 flex justify-between font-black text-base">
                    <span>Net Refund Approved:</span>
                    <span className="text-green-500">₹{Number(selectedRefund.finalRefundAmount).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Status Update Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="modal-status" className="text-xs font-bold text-foreground/60 uppercase">Refund Lifecycle Status</label>
                  <select
                    id="modal-status"
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as RefundStatus)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                  >
                    <option value="REQUESTED">Requested (Submitted)</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved (Review Pass)</option>
                    <option value="PAYMENT_INITIATED">Payment Initiated</option>
                    <option value="TRANSFER_COMPLETED">Transfer Completed</option>
                    <option value="COMPLETED">Completed (Finished)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-utr" className="text-xs font-bold text-foreground/60 uppercase">UTR / Reference Number</label>
                  <input
                    id="modal-utr"
                    type="text"
                    value={modalUtr}
                    onChange={(e) => setModalUtr(e.target.value)}
                    placeholder="Mandatory for completing transfers (e.g. UTR12345678)"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="modal-remarks" className="text-xs font-bold text-foreground/60 uppercase">Admin Internal Remarks</label>
                  <textarea
                    id="modal-remarks"
                    value={modalRemarks}
                    onChange={(e) => setModalRemarks(e.target.value)}
                    placeholder="Enter audit logs or bank transaction errors here..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary min-h-20 resize-none"
                  />
                </div>
              </div>

              {modalError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl p-3">
                  {modalError}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 p-6 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleUpdateStatus}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black hover:opacity-90 transition-opacity text-sm shadow-md"
              >
                {isUpdating ? "Saving Changes…" : "Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
