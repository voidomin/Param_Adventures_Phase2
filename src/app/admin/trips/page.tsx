"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  UserCheck,
  ChevronRight,
  ClipboardList,
  AlertCircle,
  UserPlus,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface TrekLead {
  id: string;
  name: string;
  email: string;
}

interface TripAssignment {
  trekLead: TrekLead;
}

interface Manager {
  id: string;
  name: string;
  email: string;
  role: { name: string };
}

interface TripSlot {
  id: string;
  date: string;
  capacity: number;
  remainingCapacity: number;
  status: string;
  manager: { id: string; name: string; email: string } | null;
  experience: { title: string; location: string };
  assignments: TripAssignment[];
  confirmedParticipants: number;
}

const STATUS_COLORS: Record<string, string> = {
  UPCOMING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
  TREK_STARTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  TREK_ENDED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  COMPLETED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminTripsPage() {
  const [trips, setTrips] = useState<TripSlot[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Assign Manager modal state
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/trips");
      if (!res.ok) throw new Error("Failed to fetch trips");
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    // Also pre-fetch managers for the dropdown
    fetch("/api/admin/users/managers")
      .then((r) => r.json())
      .then((d) => setManagers(d.managers || []))
      .catch(console.error);
  }, [fetchTrips]);

  const openAssignModal = (slotId: string, currentManagerId?: string) => {
    setAssigningSlotId(slotId);
    setSelectedManagerId(currentManagerId ?? "");
    setAssignError("");
  };

  const handleAssignManager = async () => {
    if (!assigningSlotId || !selectedManagerId) return;
    setIsAssigning(true);
    setAssignError("");

    try {
      const res = await fetch(`/api/admin/trips/${assigningSlotId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerId: selectedManagerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign manager");

      setAssigningSlotId(null);
      await fetchTrips();
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Upcoming Trips
          </h1>
          <p className="text-foreground/60 mt-1">
            Assign managers, Trek Leads, and view trip status.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      )}

      {!isLoading && trips.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-16 text-center text-foreground/50">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground mb-1">
            No Upcoming Trips
          </h3>
          <p>There are no slots scheduled in the future.</p>
        </div>
      )}

      {!isLoading && trips.length > 0 && (
        <div className="grid gap-4">
          {trips.map((trip) => {
            const fillPct = Math.round(
              (trip.confirmedParticipants / trip.capacity) * 100,
            );
            const statusColor =
              STATUS_COLORS[trip.status] ?? STATUS_COLORS.UPCOMING;

            return (
              <div
                key={trip.id}
                className="bg-card border border-border rounded-xl p-6 flex flex-col gap-5"
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-foreground">
                        {trip.experience.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
                      >
                        {trip.status.replace("_", " ")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(trip.date)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground/60">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {trip.experience.location || "N/A"}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {trip.confirmedParticipants} / {trip.capacity} Confirmed Guests
                        </div>
                        <div className="w-16 h-1.5 bg-foreground/10 rounded-full overflow-hidden shrink-0">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(fillPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manager + Trek Leads row */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/50">
                  {/* Manager */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">
                      Trip Manager
                    </p>
                    {trip.manager ? (
                      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-foreground/5 border border-border rounded-lg">
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <UserCheck className="w-4 h-4 text-green-500" />
                          {trip.manager.name}
                        </span>
                        <button
                          onClick={() =>
                            openAssignModal(trip.id, trip.manager?.id)
                          }
                          className="text-xs text-primary hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openAssignModal(trip.id)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors w-full"
                      >
                        <AlertCircle className="w-4 h-4" />
                        No Manager — Click to Assign
                      </button>
                    )}
                  </div>

                  {/* Trek Leads */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">
                      Trek Leads
                    </p>
                    {trip.assignments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {trip.assignments.map((a) => (
                          <div
                            key={a.trekLead.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 border border-border rounded-lg text-sm font-medium text-foreground"
                          >
                            <UserCheck className="w-4 h-4 text-green-500" />
                            {a.trekLead.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-2 text-sm text-foreground/40 bg-foreground/5 border border-border rounded-lg">
                        <UserPlus className="w-4 h-4" />
                        Assign via Manage Trip
                      </div>
                    )}
                  </div>
                </div>

                {/* Manage button */}
                <div className="flex justify-end">
                  <Link
                    href={`/admin/trips/${trip.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-background border border-border rounded-xl font-semibold hover:bg-foreground/5 transition-colors text-foreground text-sm"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Manage Manifest & Trek Leads
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Manager Modal */}
      {assigningSlotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                Assign Trip Manager
              </h2>
              <button
                onClick={() => setAssigningSlotId(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {assignError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {assignError}
                </div>
              )}

              <div>
                <label
                  htmlFor="manager-select"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Select Manager
                </label>
                <select
                  id="manager-select"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                >
                  <option value="">— Choose a manager —</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningSlotId(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignManager}
                  disabled={!selectedManagerId || isAssigning}
                  className="px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/25 flex items-center gap-2"
                >
                  {isAssigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isAssigning ? "Assigning..." : "Assign Manager"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
