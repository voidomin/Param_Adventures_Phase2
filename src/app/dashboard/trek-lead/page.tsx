"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  ChevronRight,
  Mountain,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  UPCOMING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
  TREK_STARTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  TREK_ENDED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  COMPLETED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

interface TripSlot {
  id: string;
  date: string;
  status: string;
  vendorContacts: { label: string; value: string }[] | null;
  experience: {
    title: string;
    location: string;
    durationDays: number;
    images: string[];
  };
  manager: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
  } | null;
  _count: { bookings: number };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isDDay(dateStr: string): boolean {
  // Client-side rough check — server enforces the strict IST lock
  const today = new Date();
  const trip = new Date(dateStr);
  return (
    today.getDate() === trip.getDate() &&
    today.getMonth() === trip.getMonth() &&
    today.getFullYear() === trip.getFullYear()
  );
}

function TripCard({ trip }: Readonly<{ trip: TripSlot }>) {
  const statusColor = STATUS_COLORS[trip.status] ?? STATUS_COLORS.UPCOMING;
  const isToday = isDDay(trip.date);
  const canAct = isToday && trip.status === "ACTIVE";

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-foreground">
              {trip.experience.title}
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}
            >
              {trip.status.replace("_", " ")}
            </span>
            {isToday && trip.status === "ACTIVE" && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 animate-pulse">
                <Unlock className="w-3 h-3" /> D-Day Unlocked
              </span>
            )}
            {isToday && trip.status === "UPCOMING" && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <AlertCircle className="w-3 h-3" /> Manager not started yet
              </span>
            )}
            {!isToday && ["UPCOMING", "ACTIVE"].includes(trip.status) && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-foreground/5 text-foreground/40 border border-border">
                <Lock className="w-3 h-3" /> Locked until trip date
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/60">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" /> {formatDate(trip.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> {trip.experience.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {trip._count.bookings} participants
            </span>
          </div>
          {trip.manager && (
            <p className="text-xs text-foreground/40 mt-1">
              Manager: {trip.manager.name}
              {trip.manager.phoneNumber ? ` · ${trip.manager.phoneNumber}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href={`/dashboard/trek-lead/trips/${trip.id}`}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
            canAct
              ? "bg-primary text-primary-foreground hover:scale-105 shadow-lg shadow-primary/20"
              : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
          }`}
        >
          {canAct ? "Open D-Day" : "View Details"}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function TrekLeadTripsPage() {
  const [trips, setTrips] = useState<TripSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/trek-lead/trips");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const upcoming = trips.filter((t) =>
    ["UPCOMING", "ACTIVE"].includes(t.status),
  );
  const active = trips.filter((t) =>
    ["TREK_STARTED", "TREK_ENDED"].includes(t.status),
  );
  const past = trips.filter((t) => t.status === "COMPLETED");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">
          My Trek Assignments
        </h1>
        <p className="text-foreground/60 mt-1">
          Your assigned trips. Attendance and trek-start unlock on the day of
          the trip (IST).
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      )}

      {!isLoading && trips.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Mountain className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
          <h3 className="text-lg font-bold text-foreground mb-1">
            No Assignments Yet
          </h3>
          <p className="text-foreground/50">
            The trip manager will assign you to a trip.
          </p>
        </div>
      )}

      {!isLoading && trips.length > 0 && (
        <div className="space-y-10">
          {active.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />{" "}
                In Progress
              </h2>
              <div className="grid gap-4">
                {active.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{" "}
                Upcoming
              </h2>
              <div className="grid gap-4">
                {upcoming.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />{" "}
                Completed
              </h2>
              <div className="grid gap-4">
                {past.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
