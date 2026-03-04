"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  Check,
  Play,
  Lock,
  Phone,
  CheckSquare,
  Square,
  Info,
  FlagOff,
} from "lucide-react";

interface Booking {
  id: string;
  participantCount: number;
  attended: boolean;
  user: { id: string; name: string; email: string; phoneNumber: string | null };
}

interface TripSlot {
  id: string;
  date: string;
  status: string;
  vendorContacts: { label: string; value: string }[] | null;
  experience: {
    title: string;
    location: string;
    durationDays: number;
    difficulty: string;
  };
  manager: { name: string; email: string; phoneNumber: string | null } | null;
  bookings: Booking[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    UPCOMING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
    TREK_STARTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    TREK_ENDED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };
  return (
    <span
      className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${colors[status] ?? colors.UPCOMING}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function TrekLeadTripDetailPage() {
  const params = useParams();
  const slotId = params.id as string;

  const [slot, setSlot] = useState<TripSlot | null>(null);
  const [isDDay, setIsDDay] = useState(false);
  const [slotDateIST, setSlotDateIST] = useState("");
  const [currentDateIST, setCurrentDateIST] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Attendance state — map of bookingId → attended
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  // Trek start state
  const [isStartingTrek, setIsStartingTrek] = useState(false);
  const [trekStartError, setTrekStartError] = useState("");

  // Trek end state
  const [trekEndNote, setTrekEndNote] = useState("");
  const [isEndingTrek, setIsEndingTrek] = useState(false);
  const [trekEndError, setTrekEndError] = useState("");

  const fetchSlot = useCallback(async () => {
    try {
      const res = await fetch(`/api/trek-lead/trips/${slotId}`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to fetch");
      }
      const data = await res.json();
      setSlot(data.slot);
      setIsDDay(data.isDDay);
      setSlotDateIST(data.slotDateIST);
      setCurrentDateIST(data.currentDateIST);

      // Initialize attendance from existing booking data
      const initAttendance: Record<string, boolean> = {};
      data.slot.bookings.forEach((b: Booking) => {
        initAttendance[b.id] = b.attended ?? false;
      });
      setAttendance(initAttendance);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load trip");
    } finally {
      setIsLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    fetchSlot();
  }, [fetchSlot]);

  const toggleAttendance = (bookingId: string) =>
    setAttendance((prev) => ({ ...prev, [bookingId]: !prev[bookingId] }));

  const saveAttendance = async () => {
    setIsSavingAttendance(true);
    setAttendanceError("");
    setAttendanceSaved(false);
    try {
      const attendees = Object.entries(attendance).map(
        ([bookingId, attended]) => ({ bookingId, attended }),
      );
      const res = await fetch(`/api/trek-lead/trips/${slotId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendees }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setAttendanceSaved(true);
      setTimeout(() => setAttendanceSaved(false), 3000);
    } catch (e: unknown) {
      setAttendanceError(
        e instanceof Error ? e.message : "Failed to save attendance",
      );
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleStartTrek = async () => {
    setIsStartingTrek(true);
    setTrekStartError("");
    try {
      const res = await fetch(`/api/trek-lead/trips/${slotId}/trek-start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start trek");
      await fetchSlot();
    } catch (e: unknown) {
      setTrekStartError(
        e instanceof Error ? e.message : "Failed to start trek",
      );
    } finally {
      setIsStartingTrek(false);
    }
  };

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
        <Link
          href="/dashboard/trek-lead"
          className="mt-4 inline-block text-sm text-foreground/60 hover:text-foreground"
        >
          ← Back
        </Link>
      </div>
    );

  const totalParticipants = slot.bookings.reduce(
    (s, b) => s + b.participantCount,
    0,
  );
  const canActToday = isDDay && slot.status === "ACTIVE";
  const trekInProgress = slot.status === "TREK_STARTED";
  const trekEnded = slot.status === "TREK_ENDED";

  const handleEndTrek = async () => {
    setIsEndingTrek(true);
    setTrekEndError("");
    try {
      const res = await fetch(`/api/trek-lead/trips/${slotId}/trek-end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trekLeadNote: trekEndNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to end trek");
      await fetchSlot();
    } catch (e: unknown) {
      setTrekEndError(e instanceof Error ? e.message : "Failed to end trek");
    } finally {
      setIsEndingTrek(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/trek-lead"
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
                <MapPin className="w-4 h-4" /> {slot.experience.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {totalParticipants} participants
              </span>
            </div>
          </div>
          <StatusBadge status={slot.status} />
        </div>

        {/* IST date lock info banner */}
        {!isDDay && ["UPCOMING", "ACTIVE"].includes(slot.status) && (
          <div className="mt-4 flex items-start gap-3 p-3 bg-foreground/5 border border-border rounded-xl text-sm text-foreground/60">
            <Lock className="w-4 h-4 mt-0.5 shrink-0 text-foreground/30" />
            <span>
              Attendance and trek-start are locked until{" "}
              <strong className="text-foreground">{slotDateIST}</strong> (IST).
              Today is{" "}
              <strong className="text-foreground">{currentDateIST}</strong>.
            </span>
          </div>
        )}

        {isDDay && slot.status === "UPCOMING" && (
          <div className="mt-4 flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            It&apos;s D-Day! Waiting for the Trip Manager to start the trip
            before you can mark attendance.
          </div>
        )}

        {isDDay && slot.status === "ACTIVE" && (
          <div className="mt-4 flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            D-Day is here! Mark attendance below, then start the trek when
            ready.
          </div>
        )}
      </div>

      {/* Manager & Vendor Contacts */}
      <div className="grid sm:grid-cols-2 gap-4">
        {slot.manager && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-bold text-foreground/50 uppercase tracking-wider mb-3">
              Trip Manager
            </h2>
            <p className="font-semibold text-foreground">{slot.manager.name}</p>
            <p className="text-sm text-foreground/60">{slot.manager.email}</p>
            {slot.manager.phoneNumber && (
              <a
                href={`tel:${slot.manager.phoneNumber}`}
                className="flex items-center gap-1.5 text-sm text-primary mt-1 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" /> {slot.manager.phoneNumber}
              </a>
            )}
          </div>
        )}

        {slot.vendorContacts && slot.vendorContacts.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-bold text-foreground/50 uppercase tracking-wider mb-3">
              Vendor Contacts
            </h2>
            <div className="space-y-2">
              {slot.vendorContacts.map((vc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground/50">{vc.label}</span>
                  <span className="font-medium text-foreground">
                    {vc.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attendance + Trek Start — D-Day ACTIVE or trek in progress */}
      {(canActToday || trekInProgress) && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Attendance ({slot.bookings.length} booking
              {slot.bookings.length === 1 ? "" : "s"})
            </h2>
            <span className="text-sm text-foreground/40">
              {Object.values(attendance).filter(Boolean).length} /{" "}
              {slot.bookings.length} present
            </span>
          </div>

          <div className="space-y-2">
            {slot.bookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => canActToday && toggleAttendance(booking.id)}
                disabled={!canActToday}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                  attendance[booking.id]
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-foreground/5 border-border hover:border-primary/30"
                } ${canActToday ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex items-center gap-3">
                  {attendance[booking.id] ? (
                    <CheckSquare className="w-5 h-5 text-green-400 shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-foreground/30 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {booking.user.name}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {booking.user.email}
                      {booking.user.phoneNumber
                        ? ` · ${booking.user.phoneNumber}`
                        : ""}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-foreground/40 shrink-0 ml-4">
                  {booking.participantCount} pax
                </span>
              </button>
            ))}
          </div>

          {attendanceError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {attendanceError}
            </div>
          )}

          {canActToday && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border/50">
              {/* Save Attendance */}
              <button
                onClick={saveAttendance}
                disabled={isSavingAttendance}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:scale-105 transition-transform disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {isSavingAttendance ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : attendanceSaved ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {attendanceSaved ? "Saved!" : "Save Attendance"}
              </button>

              {/* Start Trek */}
              {slot.status === "ACTIVE" && (
                <button
                  onClick={handleStartTrek}
                  disabled={isStartingTrek}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-50 shadow-lg shadow-green-900/30"
                >
                  {isStartingTrek ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  {isStartingTrek ? "Starting..." : "Start Trek 🏔️"}
                </button>
              )}

              {trekStartError && (
                <p className="w-full text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {trekStartError}
                </p>
              )}
            </div>
          )}

          {trekInProgress && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
              <Check className="w-4 h-4" /> Trek started! Safe travels 🏔️
            </div>
          )}
        </div>
      )}

      {/* End Trek — only when TREK_STARTED */}
      {trekInProgress && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FlagOff className="w-5 h-5 text-orange-400" /> End Trek
          </h2>
          <p className="text-sm text-foreground/60">
            Leave a note for the trip manager summarising how the trek went, any
            issues encountered, or special observations.
          </p>
          <textarea
            value={trekEndNote}
            onChange={(e) => setTrekEndNote(e.target.value)}
            placeholder="Trek went smoothly. All participants completed the trail. Minor delay at checkpoint 2 due to weather..."
            rows={4}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          {trekEndError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {trekEndError}
            </div>
          )}
          <button
            onClick={handleEndTrek}
            disabled={isEndingTrek}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-all hover:scale-105 disabled:opacity-50 shadow-lg shadow-orange-900/30"
          >
            {isEndingTrek ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FlagOff className="w-4 h-4" />
            )}
            {isEndingTrek ? "Ending Trek..." : "End Trek & Submit Note"}
          </button>
        </div>
      )}

      {trekEnded && (
        <div className="bg-card border border-orange-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-orange-400 font-bold mb-2">
            <Check className="w-5 h-5" /> Trek Ended
          </div>
          <p className="text-sm text-foreground/60">
            Your note has been submitted. The Trip Manager will review and
            approve completion.
          </p>
        </div>
      )}
    </div>
  );
}
