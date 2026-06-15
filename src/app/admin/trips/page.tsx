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
  Plus,
  Trash2,
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
  experienceId: string;
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

  // Tabs state
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Assign Manager modal state
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Create Trip modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [experiences, setExperiences] = useState<{ id: string; title: string }[]>([]);
  const [selectedExperienceId, setSelectedExperienceId] = useState("");
  const [createDate, setCreateDate] = useState("");
  const [createCapacity, setCreateCapacity] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchTrips = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/trips?past=${activeTab === "past"}`);
      if (!res.ok) throw new Error("Failed to fetch trips");
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  const fetchExperiences = async () => {
    try {
      const res = await fetch("/api/admin/experiences");
      if (res.ok) {
        const data = await res.json();
        setExperiences(data.experiences || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setCreateError("");
    fetchExperiences();
  };

  const handleCreateTrip = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedExperienceId || !createDate || createCapacity <= 0) return;
    setIsCreating(true);
    setCreateError("");

    try {
      const res = await fetch(`/api/admin/experiences/${selectedExperienceId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date(createDate).toISOString(),
          capacity: Number(createCapacity),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create trip");

      setIsCreateModalOpen(false);
      setSelectedExperienceId("");
      setCreateDate("");
      setCreateCapacity(10);
      await fetchTrips();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTrip = async (trip: TripSlot) => {
    const booked = trip.confirmedParticipants;
    let message = `Delete trip on ${formatDate(trip.date)}? This cannot be undone.`;
    if (booked > 0) {
      message = `Warning: This trip has ${booked} booking(s). Deleting this trip will disassociate all bookings from this trip. This cannot be undone.\n\nAre you sure you want to proceed?`;
    }

    if (!globalThis.confirm(message)) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/experiences/${trip.experienceId}/slots/${trip.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete trip");
      await fetchTrips();
    } catch (err: unknown) {
      globalThis.alert(
        err instanceof Error ? err.message : "Failed to delete trip.",
      );
      setIsLoading(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Manage Trips
          </h1>
          <p className="text-foreground/60 mt-1">
            Assign managers, Trek Leads, view status, and manage departure slots.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Trip
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === "upcoming"
              ? "border-primary text-primary"
              : "border-transparent text-foreground/50 hover:text-foreground"
          }`}
        >
          Upcoming Trips
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === "past"
              ? "border-primary text-primary"
              : "border-transparent text-foreground/50 hover:text-foreground"
          }`}
        >
          Past Trips
        </button>
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
            {activeTab === "upcoming" ? "No Upcoming Trips" : "No Past Trips"}
          </h3>
          <p>
            {activeTab === "upcoming"
              ? "There are no slots scheduled in the future."
              : "There are no completed or past slots recorded."}
          </p>
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

                {/* Manage and Delete buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div>
                    <button
                      onClick={() => handleDeleteTrip(trip)}
                      className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl font-semibold border border-red-500/20 hover:border-red-500/30 transition-colors text-sm cursor-pointer"
                      title="Delete Trip"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Trip
                    </button>
                  </div>
                  <Link
                    href={`/admin/trips/${trip.id}`}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-background border border-border rounded-xl font-semibold hover:bg-foreground/5 transition-colors text-foreground text-sm"
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
                  {isCreating ? "Creating..." : "Assign Manager"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in-50 duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                Create New Trip Slot
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-6 space-y-5">
              {createError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {createError}
                </div>
              )}

              <div>
                <label
                  htmlFor="experience-select"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Select Experience / Trek
                </label>
                <select
                  id="experience-select"
                  required
                  value={selectedExperienceId}
                  onChange={(e) => setSelectedExperienceId(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                >
                  <option value="">— Choose an experience —</option>
                  {experiences.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="trip-date"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Trip Date
                </label>
                <input
                  id="trip-date"
                  type="date"
                  required
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="trip-capacity"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Seat Capacity
                </label>
                <input
                  id="trip-capacity"
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={createCapacity}
                  onChange={(e) => setCreateCapacity(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedExperienceId || !createDate || isCreating}
                  className="px-5 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-primary/25 flex items-center gap-2"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isCreating ? "Creating..." : "Create Trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
