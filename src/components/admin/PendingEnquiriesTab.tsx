"use client";

import React, { useEffect, useState } from "react";
import { Phone, Mail, Clock, MessageSquare, IndianRupee, Users, Compass, AlertCircle, RefreshCw } from "lucide-react";

interface PendingEnquiry {
  id: string;
  createdAt: string;
  participantCount: number;
  totalPrice: string;
  user: {
    name: string;
    email: string;
    phoneNumber: string | null;
  };
  experience: {
    title: string;
    slug: string;
  };
  slot?: {
    date: string;
  } | null;
}

export function PendingEnquiriesTab() {
  const [enquiries, setEnquiries] = useState<PendingEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/enquiries");
      if (!res.ok) throw new Error("Failed to load sales enquiries");
      const data = await res.json();
      setEnquiries(data.pendingEnquiries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const formatElapsed = (dateStr: string) => {
    const created = new Date(dateStr).getTime();
    const now = Date.now();
    const diffMins = Math.max(0, Math.floor((now - created) / (60 * 1000)));
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours >= 1) {
      const remainingMins = diffMins % 60;
      return `${diffHours}h ${remainingMins}m ago`;
    }
    return `${diffMins} mins ago`;
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-border">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
        <p className="text-sm text-foreground/60">Loading pending sales enquiries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sales Outreach Enquiries</h2>
          <p className="text-sm text-foreground/60">
            Active unpaid booking checkouts (&lt; 24h old). Contact customers to assist with payment.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchEnquiries}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {enquiries.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border border-dashed rounded-2xl">
          <Compass className="w-10 h-10 text-foreground/20 mx-auto mb-3" />
          <h4 className="text-base font-bold text-foreground/70">No Pending Enquiries</h4>
          <p className="text-xs text-foreground/40 mt-1">
            All recent checkouts have either been completed or auto-expired.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enquiries.map((enquiry) => (
            <div
              key={enquiry.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/30 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <Clock className="w-3 h-3" /> {formatElapsed(enquiry.createdAt)}
                  </span>
                  <h3 className="text-base font-bold text-foreground mt-2">{enquiry.user.name}</h3>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-primary flex items-center justify-end">
                    <IndianRupee className="w-4 h-4" />
                    {Number(enquiry.totalPrice).toLocaleString("en-IN")}
                  </div>
                  <span className="text-xs text-foreground/50 flex items-center gap-1 justify-end mt-0.5">
                    <Users className="w-3 h-3" /> {enquiry.participantCount} Seats
                  </span>
                </div>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl text-xs space-y-1.5 border border-border/50">
                <div className="font-semibold text-foreground flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-primary" />
                  {enquiry.experience.title}
                </div>
                {enquiry.slot && (
                  <div className="text-foreground/60 pl-5">
                    Departure: {new Date(enquiry.slot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                {enquiry.user.phoneNumber ? (
                  <>
                    <a
                      href={`tel:${enquiry.user.phoneNumber}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                    <a
                      href={`https://wa.me/${enquiry.user.phoneNumber.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 text-xs font-bold hover:bg-teal-500/20 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </>
                ) : (
                  <a
                    href={`mailto:${enquiry.user.email}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-all"
                  >
                    <Mail className="w-3.5 h-3.5" /> Email Customer
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
