"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  UserCheck,
  UserPlus,
  Phone,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  X,
  Check,
  Play,
  FlagOff,
  CheckCircle,
} from "lucide-react";

interface TrekLead {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  participantCount: number;
  participants: { id: string; name: string }[];
  user: { id: string; name: string; email: string; phoneNumber: string | null };
}

interface VendorContact {
  _id: string; // stable client-side key
  label: string;
  value: string;
}

interface TripSlot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
  status: string;
  vendorContacts: VendorContact[] | null;
  experience: {
    title: string;
    location: string;
    durationDays: number;
    difficulty: string;
    images: string[];
  };
  assignments: { trekLead: TrekLead }[];
  bookings: Booking[];
  tripLog?: {
    trekLeadNote?: string | null;
    managerNote?: string | null;
  } | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ManagerTripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = params.id as string;

  const [slot, setSlot] = useState<TripSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Vendor contacts editing state
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [contactsSaved, setContactsSaved] = useState(false);

  // Trek Lead assignment
  const [availableLeads, setAvailableLeads] = useState<TrekLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [isAssigningLead, setIsAssigningLead] = useState(false);
  const [leadAssignError, setLeadAssignError] = useState("");
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Start Trip
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");

  // Complete Trip (Phase 5)
  const [managerNote, setManagerNote] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");

  const fetchSlot = useCallback(async () => {
    try {
      const res = await fetch(`/api/manager/trips/${slotId}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to fetch");
      }
      const data = await res.json();
      setSlot(data.slot);
      setContacts(
        (data.slot.vendorContacts ?? []).map(
          (c: { label: string; value: string }) => ({
            ...c,
            _id: crypto.randomUUID(),
          }),
        ),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load trip");
    } finally {
      setIsLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    fetchSlot();
    fetch("/api/admin/users/trek-leads")
      .then((r) => r.json())
      .then((d) => setAvailableLeads(d.trekLeads ?? []))
      .catch(console.error);
  }, [fetchSlot]);

  // ─── Vendor Contacts ───────────────────────────────────────
  const addContact = () =>
    setContacts((prev) => [
      ...prev,
      { _id: crypto.randomUUID(), label: "", value: "" },
    ]);

  const removeContact = (id: string) =>
    setContacts((prev) => prev.filter((c) => c._id !== id));

  const updateContact = (id: string, key: "label" | "value", val: string) =>
    setContacts((prev) =>
      prev.map((c) => (c._id === id ? { ...c, [key]: val } : c)),
    );

  const saveContacts = async () => {
    setIsSavingContacts(true);
    setContactsSaved(false);
    try {
      // Strip client-only _id before sending to API
      const payload = contacts.map(({ label, value }) => ({ label, value }));
      const res = await fetch(`/api/manager/trips/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorContacts: payload }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setContactsSaved(true);
      setTimeout(() => setContactsSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingContacts(false);
    }
  };

  // ─── Trek Lead Assignment ──────────────────────────────────
  const assignedLeadIds = slot?.assignments.map((a) => a.trekLead.id) ?? [];
  const unassignedLeads = availableLeads.filter(
    (l) => !assignedLeadIds.includes(l.id),
  );

  const handleAssignLead = async () => {
    if (!selectedLeadId) return;
    setIsAssigningLead(true);
    setLeadAssignError("");
    try {
      const res = await fetch(`/api/admin/trips/${slotId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedLeadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign");
      setShowLeadModal(false);
      setSelectedLeadId("");
      await fetchSlot();
    } catch (e: unknown) {
      setLeadAssignError(
        e instanceof Error ? e.message : "Failed to assign trek lead",
      );
    } finally {
      setIsAssigningLead(false);
    }
  };

  const handleRemoveLead = async (userId: string) => {
    try {
      await fetch(
        `/api/admin/trips/${slotId}/assign?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      await fetchSlot();
    } catch (e) {
      console.error(e);
    }
  };

  // ─── Start Trip ────────────────────────────────────────────
  const handleStartTrip = async () => {
    setIsStarting(true);
    setStartError("");
    try {
      const res = await fetch(`/api/manager/trips/${slotId}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start trip");
      await fetchSlot(); // refresh status badge
    } catch (e: unknown) {
      setStartError(e instanceof Error ? e.message : "Failed to start trip");
    } finally {
      setIsStarting(false);
    }
  };

  // ─── Complete Trip ────────────────────────────────────────
  const handleCompleteTrip = async () => {
    setIsCompleting(true);
    setCompleteError("");
    try {
      const res = await fetch(`/api/manager/trips/${slotId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete trip");
      await fetchSlot();
    } catch (e: unknown) {
      setCompleteError(
        e instanceof Error ? e.message : "Failed to complete trip",
      );
    } finally {
      setIsCompleting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────
  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );

  if (error || !slot)
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-400 font-medium">{error || "Trip not found"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-foreground/60 hover:text-foreground"
        >
          ← Go back
        </button>
      </div>
    );

  const totalParticipants = slot.bookings.reduce(
    (sum, b) => sum + b.participantCount,
    0,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back */}
      <Link
        href="/dashboard/manager"
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Trips
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {slot.experience.title}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 text-sm text-foreground/60">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" /> {formatDate(slot.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {slot.experience.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {totalParticipants} participant
                {totalParticipants === 1 ? "" : "s"} confirmed
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
                slot.status === "ACTIVE"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}
            >
              {slot.status.replace("_", " ")}
            </div>

            {/* Start Trip button — only show when UPCOMING */}
            {slot.status === "UPCOMING" && (
              <button
                onClick={handleStartTrip}
                disabled={isStarting || slot.assignments.length === 0}
                title={
                  slot.assignments.length === 0
                    ? "Assign at least one Trek Lead first"
                    : "Start this trip"
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-green-900/30"
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                {isStarting ? "Starting..." : "Start Trip"}
              </button>
            )}
          </div>
        </div>

        {/* Start error */}
        {startError && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {startError}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ── Trek Lead Assignment ── */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Trek Leads</h2>
            <button
              onClick={() => {
                setShowLeadModal(true);
                setLeadAssignError("");
                setSelectedLeadId("");
              }}
              disabled={unassignedLeads.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" /> Assign Lead
            </button>
          </div>

          {slot.assignments.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              No Trek Lead assigned yet. Assign at least one before starting.
            </div>
          ) : (
            <div className="space-y-2">
              {slot.assignments.map((a) => (
                <div
                  key={a.trekLead.id}
                  className="flex items-center justify-between px-4 py-3 bg-foreground/5 border border-border rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {a.trekLead.name}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {a.trekLead.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveLead(a.trekLead.id)}
                    className="text-foreground/30 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Vendor Contacts ── */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Vendor Contacts
            </h2>
            <button
              onClick={addContact}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-sm text-foreground/40 italic">
              No vendor contacts yet. Add driver numbers, hotel names, etc.
            </p>
          ) : (
            <div className="space-y-2">
              {contacts.map((c) => (
                <div key={c._id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={c.label}
                    aria-label="Contact label"
                    onChange={(e) =>
                      updateContact(c._id, "label", e.target.value)
                    }
                    placeholder="Label (e.g. Driver)"
                    className="w-1/3 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="text"
                    value={c.value}
                    aria-label="Contact value"
                    onChange={(e) =>
                      updateContact(c._id, "value", e.target.value)
                    }
                    placeholder="Value (e.g. +91 98765...)"
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={() => removeContact(c._id)}
                    className="text-foreground/30 hover:text-red-500 transition-colors"
                    aria-label="Remove contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={saveContacts}
            disabled={isSavingContacts}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:scale-105 transition-transform disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {(() => {
              if (isSavingContacts)
                return <Loader2 className="w-4 h-4 animate-spin" />;
              if (contactsSaved) return <Check className="w-4 h-4" />;
              return <Save className="w-4 h-4" />;
            })()}
            {contactsSaved ? "Saved!" : "Save Contacts"}
          </button>
        </div>
      </div>

      {/* ── Confirmed Participants ── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">
          Confirmed Participants ({slot.bookings.length} booking
          {slot.bookings.length === 1 ? "" : "s"} · {totalParticipants} people)
        </h2>

        {slot.bookings.length === 0 ? (
          <p className="text-foreground/50 text-sm">
            No confirmed bookings yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground/40 border-b border-border">
                  <th className="pb-3 pr-4 font-semibold">#</th>
                  <th className="pb-3 pr-4 font-semibold">Name</th>
                  <th className="pb-3 pr-4 font-semibold">Email</th>
                  <th className="pb-3 pr-4 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </th>
                  <th className="pb-3 font-semibold text-right">
                    Participants
                  </th>
                </tr>
              </thead>
              <tbody>
                {slot.bookings.map((booking, idx) => (
                  <tr
                    key={booking.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 pr-4 text-foreground/40">{idx + 1}</td>
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {booking.user.name}
                    </td>
                    <td className="py-3 pr-4 text-foreground/60">
                      {booking.user.email}
                    </td>
                    <td className="py-3 pr-4 text-foreground/60">
                      {booking.user.phoneNumber ?? "—"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="font-semibold text-foreground mb-1">
                        {booking.participantCount}
                      </div>
                      {booking.participants &&
                        booking.participants.length > 0 && (
                          <div className="text-xs text-foreground/50 space-y-0.5 mt-1 border-t border-border/50 pt-1 inline-block">
                            {booking.participants.map((p) => (
                              <div key={p.id}>{p.name}</div>
                            ))}
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Completion Approval: only when TREK_ENDED ── */}
      {slot.status === "TREK_ENDED" && (
        <div className="bg-card border border-orange-500/20 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FlagOff className="w-5 h-5 text-orange-400" /> Trek Ended — Approve
            Completion
          </h2>

          {slot.tripLog?.trekLeadNote && (
            <div className="p-4 bg-foreground/5 border border-border rounded-xl space-y-1">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider">
                Trek Lead Note
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {slot.tripLog.trekLeadNote}
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="manager-note"
              className="block text-sm font-medium text-foreground/60 mb-2"
            >
              Your note (optional)
            </label>
            <textarea
              id="manager-note"
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              placeholder="Trip completed successfully. All participants safe. Great job by the trek lead team."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {completeError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {completeError}
            </div>
          )}

          <button
            onClick={handleCompleteTrip}
            disabled={isCompleting}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-50 shadow-lg shadow-purple-900/30"
          >
            {isCompleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isCompleting ? "Completing..." : "Approve & Complete Trip"}
          </button>
        </div>
      )}

      {slot.status === "COMPLETED" && (
        <div className="bg-card border border-purple-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-purple-400 font-bold mb-1">
            <CheckCircle className="w-5 h-5" /> Trip Completed!
          </div>
          <p className="text-sm text-foreground/60">
            This trip has been fully completed. Participants who attended can
            now write reviews.
          </p>
        </div>
      )}

      {/* Assign Trek Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Assign Trek Lead</h2>
              <button
                onClick={() => setShowLeadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {leadAssignError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {leadAssignError}
                </div>
              )}
              <div>
                <label
                  htmlFor="trek-lead-select"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Select Trek Lead
                </label>
                <select
                  id="trek-lead-select"
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">— Choose a trek lead —</option>
                  {unassignedLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignLead}
                  disabled={!selectedLeadId || isAssigningLead}
                  className="px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                >
                  {isAssigningLead ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
