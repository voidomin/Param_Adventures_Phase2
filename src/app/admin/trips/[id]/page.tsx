"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  MapPin,
  CalendarDays,
  Phone,
  Mail,
  UserCheck,
  UserPlus,
  Trash2,
  Download,
} from "lucide-react";

interface TrekLead {
  id: string;
  name: string;
  email: string;
}

interface Participant {
  id: string;
  participantCount: number;
  totalPrice: number;
  bookingStatus: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
  };
}

interface TripSlot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
  experience: {
    title: string;
    location: string;
  };
  assignments: { trekLead: TrekLead }[];
}

export default function TripManifestPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripSlot | null>(null);
  const [manifest, setManifest] = useState<Participant[]>([]);
  const [availableLeads, setAvailableLeads] = useState<TrekLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");

  const fetchTripDetails = useCallback(async () => {
    try {
      // In a real app we'd need a specific GET /api/admin/trips/[id] endpoint,
      // but we can just filter from the full list for now or assume an endpoint exists.
      // Wait, we don't have a GET /api/admin/trips/[id] route yet.
      // Let's just fetch all trips and find it.
      const res = await fetch("/api/admin/trips");
      const data = await res.json();
      const found = data.trips?.find((t: { id: string }) => t.id === tripId);
      if (found) setTrip(found);
    } catch (err) {
      console.error(err);
    }
  }, [tripId]);

  const fetchManifest = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/trips/${tripId}/manifest`);
      const data = await res.json();
      setManifest(data.manifest || []);
    } catch (err) {
      console.error(err);
    }
  }, [tripId]);

  const fetchTrekLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users?role=TREK_LEAD");
      const data = await res.json();
      setAvailableLeads(data.users || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTripDetails(), fetchManifest(), fetchTrekLeads()]).then(
      () => setIsLoading(false),
    );
  }, [fetchTripDetails, fetchManifest, fetchTrekLeads]);

  const handleAssignLead = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    setIsAssigning(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/trips/${tripId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedLeadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign lead.");

      setSelectedLeadId("");
      fetchTripDetails(); // Refresh assignments
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign lead.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveLead = async (userId: string) => {
    if (!globalThis.confirm("Remove this Trek Lead from the trip?")) return;

    try {
      const res = await fetch(
        `/api/admin/trips/${tripId}/assign?userId=${userId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove lead.");

      fetchTripDetails();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to remove lead.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Trip not found</h2>
        <Link
          href="/admin/trips"
          className="text-primary hover:underline mt-4 inline-block"
        >
          Return to Trips
        </Link>
      </div>
    );
  }

  const bookedCount = trip.capacity - trip.remainingCapacity;
  const isPast = new Date(trip.date) < new Date();

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/trips"
          className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground/50 hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {trip.experience.title}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-foreground/60 text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {new Date(trip.date).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {trip.experience.location || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Manifest */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  Participant Manifest
                </h2>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-border rounded-xl text-sm font-semibold transition-colors"
                title="Export CSV (Coming Soon)"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            {manifest.length === 0 ? (
              <div className="p-12 text-center text-foreground/50">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No confirmed bookings yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {manifest.map((p, ix) => (
                  <div
                    key={p.id}
                    className="p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:bg-foreground/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {ix + 1}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          {p.user.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-foreground/60">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {p.user.email}
                          </span>
                          {p.user.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {p.user.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-foreground/5 border border-border px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap text-center">
                      {p.participantCount} Guest
                      {p.participantCount === 1 ? "" : "s"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-foreground/[0.02] border-t border-border px-6 py-4 flex items-center justify-between text-sm font-medium">
              <span className="text-foreground/60">
                Total Confirmed Guests:
              </span>
              <span className="text-lg text-foreground font-bold">
                {manifest.reduce((acc, p) => acc + p.participantCount, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Trek Leads & Stats */}
        <div className="space-y-6">
          {/* Capacity Snapshot */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4">
              Capacity Status
            </h3>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-black text-foreground">
                {bookedCount}
              </span>
              <span className="text-foreground/50 font-medium pb-1">
                / {trip.capacity} Booked
              </span>
            </div>
            <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min((bookedCount / trip.capacity) * 100, 100)}%`,
                }}
              />
            </div>
            {isPast && (
              <div className="mt-4 text-sm font-medium text-orange-500 bg-orange-500/10 px-3 py-2 rounded-lg text-center">
                This trip has already occurred.
              </div>
            )}
          </div>

          {/* Trek Lead Management */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Assigned Trek Leads
            </h3>

            <div className="space-y-3 mb-6">
              {trip.assignments.length === 0 ? (
                <div className="text-sm text-foreground/50 italic">
                  No Trek Leads assigned yet.
                </div>
              ) : (
                trip.assignments.map((a) => (
                  <div
                    key={a.trekLead.id}
                    className="flex items-center justify-between bg-background border border-border p-3 rounded-xl"
                  >
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {a.trekLead.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveLead(a.trekLead.id)}
                      className="p-1.5 text-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleAssignLead}
              className="space-y-3 border-t border-border pt-5 mt-5"
            >
              <h4 className="text-xs font-bold text-foreground/50 uppercase">
                Assign New Lead
              </h4>
              <select
                required
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="" disabled>
                  Select a Trek Lead...
                </option>
                {availableLeads.map((lead) => (
                  <option
                    key={lead.id}
                    value={lead.id}
                    disabled={trip.assignments.some(
                      (a) => a.trekLead.id === lead.id,
                    )}
                  >
                    {lead.name}{" "}
                    {trip.assignments.some((a) => a.trekLead.id === lead.id)
                      ? "(Assigned)"
                      : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isAssigning || !selectedLeadId}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-foreground border border-border text-background rounded-xl font-bold hover:bg-foreground/90 disabled:opacity-50 transition-colors text-sm"
              >
                <UserPlus className="w-4 h-4" />
                {isAssigning ? "Assigning..." : "Assign Lead"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
