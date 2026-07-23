"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  Trash2,
  GitMerge,
  Split,
  AlertTriangle,
} from "lucide-react";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

type CouponStatus = "ACTIVE" | "PARTIALLY_USED" | "FULLY_USED" | "EXPIRED" | "CANCELLED" | "BLOCKED";

interface TravelCoupon {
  id: string;
  code: string;
  originalValue: number;
  balance: number;
  expiryDate: string;
  status: CouponStatus;
  customerId: string;
  customer: {
    name: string;
    email: string;
  };
}

const statusStyles: Record<CouponStatus, string> = {
  ACTIVE: "bg-green-500/10 text-green-500 border-green-500/20",
  PARTIALLY_USED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  FULLY_USED: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  EXPIRED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  BLOCKED: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
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

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<TravelCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<CouponStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<TravelCoupon | null>(null);

  // New Coupon Form States
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustId, setNewCustId] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [newVal, setNewVal] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [newReason, setNewReason] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Detail/Action States
  const [actionTab, setActionTab] = useState<"ADJUST" | "MERGE" | "SPLIT">("ADJUST");
  const [adjAction, setAdjAction] = useState<"INCREASE" | "DECREASE" | "NONE">("NONE");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjExpiry, setAdjExpiry] = useState("");
  const [adjStatus, setAdjStatus] = useState<CouponStatus | "">("");
  const [adjRemarks, setAdjRemarks] = useState("");
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [splitAmounts, setSplitAmounts] = useState<{ id: string; amount: string }[]>([{ id: "split-1", amount: "" }]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/coupons?status=${filterStatus}`);
      if (!res.ok) throw new Error("Failed to load travel coupons");
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Lookup customer details by email for new coupons
  const handleLookupCustomer = async () => {
    if (!newCustEmail.includes("@")) return;
    try {
      const res = await fetch(`/api/admin/users?search=${newCustEmail}`);
      if (res.ok) {
        const data = await res.json();
        const user = data.users?.[0];
        if (user) {
          setNewCustId(user.id);
          setNewCustName(user.name);
          setCreateError(null);
        } else {
          setNewCustId("");
          setNewCustName("");
          setCreateError("Customer not found. Please verify the email.");
        }
      }
    } catch {
      // Ignore lookup errors
    }
  };

  const handleCreateCoupon = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newCustId) {
      setCreateError("Please lookup and select a valid customer first.");
      return;
    }
    if (!newVal || Number(newVal) <= 0) {
      setCreateError("Please enter a valid credit value.");
      return;
    }
    if (!newExpiry) {
      setCreateError("Expiry date is required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: newCustId,
          originalValue: Number(newVal),
          expiryDate: newExpiry,
          reason: newReason || "Goodwill Credit Allocation",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create coupon");

      setIsCreateOpen(false);
      setNewCustEmail("");
      setNewCustId("");
      setNewCustName("");
      setNewVal("");
      setNewExpiry("");
      setNewReason("");
      fetchCoupons();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleApplyAdjustment = async () => {
    if (!selectedCoupon) return;
    setIsUpdating(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/coupons/${selectedCoupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balanceAction: adjAction === "NONE" ? undefined : adjAction,
          amount: adjAction === "NONE" ? undefined : Number(adjAmount),
          status: adjStatus || undefined,
          expiryDate: adjExpiry || undefined,
          remarks: adjRemarks || "Voucher configuration update",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust coupon");

      setSelectedCoupon(null);
      fetchCoupons();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Adjustment failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMergeCoupons = async () => {
    if (!selectedCoupon) return;
    if (mergeIds.length === 0) {
      setActionError("Please select at least one coupon to merge.");
      return;
    }
    setIsUpdating(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/coupons/${selectedCoupon.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MERGE",
          mergeCouponIds: mergeIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Merge failed");

      setSelectedCoupon(null);
      fetchCoupons();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSplitCoupon = async () => {
    if (!selectedCoupon) return;
    const amounts = splitAmounts.map(s => Number(s.amount)).filter(n => n > 0);
    if (amounts.length === 0) {
      setActionError("Please add split values.");
      return;
    }
    setIsUpdating(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/coupons/${selectedCoupon.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SPLIT",
          splitAmounts: amounts,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Split failed");

      setSelectedCoupon(null);
      fetchCoupons();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Split failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to delete this coupon? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete coupon");
      setSelectedCoupon(null);
      fetchCoupons();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete coupon");
    }
  };

  // Filter local coupons by query
  const filteredCoupons = coupons.filter((coupon) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      coupon.code.toLowerCase().includes(query) ||
      coupon.customer.name.toLowerCase().includes(query) ||
      coupon.customer.email.toLowerCase().includes(query)
    );
  });

  // Flat render elements to resolve nested ternary warnings
  let contentElement;
  if (isLoading) {
    contentElement = <TableSkeleton rows={5} columns={7} />;
  } else if (error) {
    contentElement = (
      <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-3 animate-bounce" />
        <p className="font-bold">{error}</p>
      </div>
    );
  } else if (filteredCoupons.length === 0) {
    contentElement = (
      <div className="bg-card border border-border rounded-2xl p-16 text-center italic text-foreground/40 text-sm">
        No coupons match your search filters.
      </div>
    );
  } else {
    contentElement = (
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-foreground/5 border-b border-border">
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40">Coupon Code</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40">Customer</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Original Value</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Remaining Balance</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Expiry Date</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-center">Status</th>
                <th className="px-6 py-4 font-black uppercase text-xs tracking-widest text-foreground/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/55">
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="group hover:bg-foreground/5 transition-colors">
                  <td className="px-6 py-5">
                    <span className="font-mono font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl tracking-wider select-all">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-bold text-foreground block leading-tight">{coupon.customer.name}</span>
                    <span className="text-xs text-foreground/45 mt-0.5 block">{coupon.customer.email}</span>
                  </td>
                  <td className="px-6 py-5 text-center font-medium text-foreground/70">
                    ₹{Number(coupon.originalValue).toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-5 text-center text-green-500 font-black text-base">
                    ₹{Number(coupon.balance).toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-5 text-center font-semibold text-foreground/75">
                    {formatDate(coupon.expiryDate)}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-2xs font-black uppercase tracking-wider border ${
                        statusStyles[coupon.status]
                      }`}
                    >
                      {coupon.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCoupon(coupon);
                        setActionTab("ADJUST");
                        setAdjAction("NONE");
                        setAdjAmount("");
                        setAdjStatus(coupon.status);
                        setAdjExpiry(coupon.expiryDate.split("T")[0]);
                        setAdjRemarks("");
                        setMergeIds([]);
                        setSplitAmounts([{ id: "split-1", amount: "" }]);
                        setActionError(null);
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl border border-primary/20 hover:border-primary/50 transition-all uppercase tracking-wider"
                    >
                      Manage
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
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
        <div className="space-y-1 text-left">
          <h1 className="text-3xl font-black font-heading flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" /> Travel <span className="text-primary">Coupons</span>
          </h1>
          <p className="text-foreground/50 text-sm font-medium">Issue goodwill travel credits, split, merge, or adjust balances.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Issue Goodwill Coupon
        </button>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-card p-4 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
          <input
            type="text"
            placeholder="Search by coupon code, customer name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-foreground/45 uppercase font-black tracking-wider">
            <Filter className="w-3.5 h-3.5" /> Filter Status
          </div>
          <div className="flex flex-wrap items-center gap-1.5 bg-background p-1 border border-border rounded-xl">
            {(["ALL", "ACTIVE", "PARTIALLY_USED", "FULLY_USED", "EXPIRED", "CANCELLED", "BLOCKED"] as const).map((st) => (
              <button
                type="button"
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

      {/* Main Table Content Render */}
      {contentElement}

      {/* CREATE GOODWILL COUPON DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleCreateCoupon}
            className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left"
          >
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-xl font-bold text-foreground">Issue Goodwill Coupon</h3>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="text-foreground/40 hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="new-coupon-email" className="text-xs font-bold text-foreground/60 uppercase">Customer Email</label>
                <div className="flex gap-2">
                  <input
                    id="new-coupon-email"
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCustomer}
                    className="px-4 py-2.5 bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider rounded-xl border border-primary/20"
                  >
                    Lookup
                  </button>
                </div>
                {newCustName && (
                  <p className="text-xs text-green-500 font-bold mt-1">Found customer: {newCustName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-coupon-val" className="text-xs font-bold text-foreground/60 uppercase">Coupon Value (INR)</label>
                <input
                  id="new-coupon-val"
                  type="number"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-coupon-expiry" className="text-xs font-bold text-foreground/60 uppercase">Expiry Date</label>
                <input
                  id="new-coupon-expiry"
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-coupon-reason" className="text-xs font-bold text-foreground/60 uppercase">Reason / Remarks</label>
                <textarea
                  id="new-coupon-reason"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Compensation for bus delay, operational issue etc..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary min-h-20 resize-none"
                />
              </div>

              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl p-3">
                  {createError}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
              >
                {isCreating ? "Issuing..." : "Create Coupon"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MANAGE COUPON ACTIONS DIALOG */}
      {selectedCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200 text-left">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-foreground">Manage travel credits</h3>
                <p className="text-xs text-foreground/50 mt-0.5">Voucher Code: <strong className="font-mono text-primary select-all">{selectedCoupon.code}</strong></p>
              </div>
              <button type="button" onClick={() => setSelectedCoupon(null)} className="text-foreground/40 hover:text-foreground text-xl">✕</button>
            </div>

            {/* Menu tab */}
            <div className="flex border-b border-border">
              {(["ADJUST", "MERGE", "SPLIT"] as const).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => {
                    setActionTab(tab);
                    setActionError(null);
                  }}
                  className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                    actionTab === tab
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-foreground/50 hover:text-foreground hover:bg-foreground/[0.02]"
                  }`}
                >
                  {tab.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* ADJUST BALANCES OR CONFIGS */}
              {actionTab === "ADJUST" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="adj-action" className="text-xs font-bold text-foreground/60 uppercase">Adjustment Action</label>
                      <select
                        id="adj-action"
                        value={adjAction}
                        onChange={(e) => setAdjAction(e.target.value as "INCREASE" | "DECREASE" | "NONE")}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                      >
                        <option value="NONE">No balance change</option>
                        <option value="INCREASE">Add Credit balance</option>
                        <option value="DECREASE">Deduct Credit balance</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="adj-amount" className="text-xs font-bold text-foreground/60 uppercase">Adjustment Amount (INR)</label>
                      <input
                        id="adj-amount"
                        type="number"
                        value={adjAmount}
                        disabled={adjAction === "NONE"}
                        onChange={(e) => setAdjAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-bold disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="adj-status" className="text-xs font-bold text-foreground/60 uppercase">Status override</label>
                      <select
                        id="adj-status"
                        value={adjStatus}
                        onChange={(e) => setAdjStatus(e.target.value as CouponStatus)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none font-bold"
                      >
                        <option value="ACTIVE">Active (Can Redeem)</option>
                        <option value="BLOCKED">Blocked (Temporarily Freeze)</option>
                        <option value="CANCELLED">Cancelled (Disabled)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="adj-expiry" className="text-xs font-bold text-foreground/60 uppercase">Extended Expiry Date</label>
                      <input
                        id="adj-expiry"
                        type="date"
                        value={adjExpiry}
                        onChange={(e) => setAdjExpiry(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="adj-remarks" className="text-xs font-bold text-foreground/60 uppercase">Action audit remarks</label>
                    <textarea
                      id="adj-remarks"
                      value={adjRemarks}
                      onChange={(e) => setAdjRemarks(e.target.value)}
                      placeholder="Why is this credit adjustment being performed..."
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary min-h-20 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* MERGE VOUCHERS */}
              {actionTab === "MERGE" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                    <GitMerge className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-primary font-medium leading-relaxed">
                      Select coupons belonging to <strong>{selectedCoupon.customer.name}</strong> to merge into <strong>{selectedCoupon.code}</strong>.
                      Their remaining balance will be swept and added to this voucher, and they will be cancelled.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-foreground/60 uppercase">Coupons to Merge</span>
                    <div className="border border-border rounded-2xl divide-y divide-border max-h-48 overflow-y-auto">
                      {coupons
                        .filter(c => c.customerId === selectedCoupon.customerId && c.id !== selectedCoupon.id && c.status === "ACTIVE")
                        .map(c => {
                          const isChecked = mergeIds.includes(c.id);
                          return (
                            <div key={c.id} className="flex items-center gap-3 p-3 hover:bg-foreground/5 cursor-pointer text-sm font-medium">
                              <input
                                id={`merge-${c.id}`}
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setMergeIds([...mergeIds, c.id]);
                                  } else {
                                    setMergeIds(mergeIds.filter(id => id !== c.id));
                                  }
                                }}
                                className="rounded border-border text-primary focus:ring-primary shrink-0"
                              />
                              <label htmlFor={`merge-${c.id}`} className="flex-1 cursor-pointer">
                                <span className="font-mono font-bold text-foreground">{c.code}</span>
                                <span className="text-xs text-foreground/45 ml-2">(Balance: ₹{Number(c.balance).toLocaleString("en-IN")})</span>
                              </label>
                            </div>
                          );
                        })}
                      {coupons.filter(c => c.customerId === selectedCoupon.customerId && c.id !== selectedCoupon.id && c.status === "ACTIVE").length === 0 && (
                        <p className="p-4 text-xs text-foreground/40 italic text-center">No other active coupons found for this customer.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SPLIT COUOPN */}
              {actionTab === "SPLIT" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                    <Split className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-primary font-medium leading-relaxed">
                      Split the remaining balance of <strong>₹{Number(selectedCoupon.balance).toLocaleString()}</strong> into separate coupon codes.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="block text-xs font-bold text-foreground/60 uppercase">Split values (INR)</span>
                    <div className="space-y-2">
                      {splitAmounts.map((item, idx) => (
                        <div key={item.id} className="flex gap-2 items-center">
                          <input
                            id={`split-input-${item.id}`}
                            type="number"
                            value={item.amount}
                            onChange={(e) => {
                              const newSplit = [...splitAmounts];
                              newSplit[idx] = { ...newSplit[idx], amount: e.target.value };
                              setSplitAmounts(newSplit);
                            }}
                            placeholder="e.g. 500"
                            className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary font-bold"
                          />
                          {splitAmounts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSplitAmounts(splitAmounts.filter((_, i) => i !== idx))}
                              className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSplitAmounts([...splitAmounts, { id: `split-${Date.now()}-${splitAmounts.length}`, amount: "" }])}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-1 font-heading"
                    >
                      + Add split division
                    </button>
                  </div>
                </div>
              )}

              {actionError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl p-3">
                  {actionError}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center p-6 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => handleDeleteCoupon(selectedCoupon.id)}
                className="px-4 py-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Delete (Super Admin)
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCoupon(null)}
                  className="px-4 py-2.5 rounded-xl border border-border text-foreground/60 font-bold hover:bg-foreground/5 text-xs uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    if (actionTab === "ADJUST") handleApplyAdjustment();
                    else if (actionTab === "MERGE") handleMergeCoupons();
                    else if (actionTab === "SPLIT") handleSplitCoupon();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
