"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  UserCheck,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

interface TrekLead {
  id: string;
  name: string;
  email: string;
}

interface TripAssignment {
  trekLead: TrekLead;
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
  assignments: TripAssignment[];
  _count: {
    bookings: number; // Confirmed bookings
  };
}

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrips() {
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
    }
    fetchTrips();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Upcoming Trips
          </h1>
          <p className="text-foreground/60 mt-1">
            Manage operational manifests and assign Trek Leads.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
              (trip._count.bookings / trip.capacity) * 100,
            );
            return (
              <div
                key={trip.id}
                className="bg-card border border-border rounded-xl p-6 hover:bg-foreground/5 transition-colors flex flex-col md:flex-row gap-6 md:items-center"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-foreground">
                      {trip.experience.title}
                    </h3>
                    <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatDate(trip.date)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground/60">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {trip.experience.location || "N/A"}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {trip._count.bookings} / {trip.capacity} Booked
                      </div>
                      <div className="w-16 h-1.5 bg-foreground/10 rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.min(fillPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {trip.assignments.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
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
                    <div className="mt-4 text-sm font-medium text-orange-500 flex items-center gap-1.5 hover:text-orange-600 transition-colors">
                      <AlertCircle className="w-4 h-4" /> No Trek Lead Assigned
                    </div>
                  )}
                </div>

                <div className="border-t border-border md:border-none pt-4 md:pt-0 w-full md:w-auto">
                  <Link
                    href={`/admin/trips/${trip.id}`}
                    className="flex justify-center items-center gap-2 px-6 py-3 bg-background border border-border rounded-xl font-semibold hover:bg-foreground/5 transition-colors w-full md:w-auto text-foreground"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Manage Trip & Manifest
                    <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
