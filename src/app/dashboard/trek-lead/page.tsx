"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  ChevronRight,
  Unlock,
  AlertCircle,
  Lock,
  Map,
} from "lucide-react";
import { 
  STATUS_COLORS, 
  formatDate, 
  DashboardNav, 
  DashboardLoader, 
  DashboardEmptyState 
} from "@/components/dashboard/DashboardShared";

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
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col gap-6 hover:shadow-xl hover:border-foreground/20 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
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

      <div className="flex justify-end pt-2">
        <Link
          href={`/dashboard/trek-lead/trips/${trip.id}`}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            canAct
              ? "bg-primary text-primary-foreground hover:scale-105 shadow-lg shadow-primary/20 animate-pulse"
              : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground"
          }`}
        >
          {canAct ? "Open D-Day Portal" : "View Trip Context"}
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
    <div className="max-w-4xl mx-auto pt-16 px-4 md:px-8 pb-12">
      <DashboardNav />

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-black text-foreground flex items-center gap-3">
          <Map className="w-8 h-8 text-primary" />
          My Trek Assignments
        </h1>
        <p className="text-foreground/60 mt-1">
          Your assigned operations. D-Day tools (Attendance & Start) seamlessly
          unlock on the day of the trip (IST).
        </p>
      </div>

      {isLoading && <DashboardLoader />}

      {!isLoading && trips.length === 0 && (
        <DashboardEmptyState 
          title="No Assignments Yet"
          description="The trip manager will assign you to a trip."
        />
      )}

      {!isLoading && trips.length > 0 && (
        <div className="space-y-10">
          {active.length > 0 && (
            <section className="bg-linear-to-br from-yellow-500/5 to-transparent p-6 sm:p-8 rounded-4xl border border-yellow-500/10">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3 border-b border-border/50 pb-4">
                <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]" />{" "}
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
            <section className="bg-foreground/2 p-6 sm:p-8 rounded-4xl border border-border">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3 border-b border-border/50 pb-4">
                <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />{" "}
                Upcoming Missions
              </h2>
              <div className="grid gap-4">
                {upcoming.map((t) => (
                  <TripCard key={t.id} trip={t} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-foreground/50 mb-4 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-purple-400/50 inline-block" />{" "}
                Completed operations
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
