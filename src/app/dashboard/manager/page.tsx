"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  UserCheck,
  ChevronRight,
  AlertCircle,
  Briefcase,
  ClipboardList,
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
  capacity: number;
  remainingCapacity: number;
  status: string;
  vendorContacts: { label: string; value: string }[] | null;
  experience: {
    title: string;
    location: string;
    durationDays: number;
    images: string[];
  };
  assignments: { trekLead: { id: string; name: string; email: string } }[];
  _count: { bookings: number };
}

export default function ManagerTripsPage() {
  const [trips, setTrips] = useState<TripSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/manager/trips");
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

  return (
    <div className="max-w-4xl mx-auto pt-16 px-4 md:px-8 pb-12">
      <DashboardNav />

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-black text-foreground flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-primary" />
          My Assigned Trips
        </h1>
        <p className="text-foreground/60 mt-1">
          Trips assigned to you for management. Set up vendor contacts and trek
          leads before unlocking for operation.
        </p>
      </div>

      {isLoading && <DashboardLoader />}

      {!isLoading && trips.length === 0 && (
        <DashboardEmptyState 
          title="No Trips Assigned"
          description="Ask an admin to assign you to an upcoming trip slot."
        />
      )}

      {!isLoading && trips.length > 0 && (
        <div className="grid gap-4">
          {trips.map((trip) => {
            const statusColor =
              STATUS_COLORS[trip.status] ?? STATUS_COLORS.UPCOMING;
            const vendorCount = trip.vendorContacts?.length ?? 0;
            const leadCount = trip.assignments.length;

            let leadText = "No Trek Lead Assigned";
            if (leadCount === 1) leadText = "1 Trek Lead Assigned";
            else if (leadCount > 1)
              leadText = `${leadCount} Trek Leads Assigned`;

            let vendorText = "No Vendor Contacts Yet";
            if (vendorCount === 1) vendorText = "1 Vendor Contact";
            else if (vendorCount > 1)
              vendorText = `${vendorCount} Vendor Contacts`;

            return (
              <div
                key={trip.id}
                className="bg-card border border-border rounded-[1.5rem] p-6 sm:p-8 flex flex-col gap-6 hover:shadow-xl hover:border-foreground/20 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-foreground">
                        {trip.experience.title}
                      </h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
                      >
                        {trip.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-foreground/60">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4" />
                        {formatDate(trip.date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {trip.experience.location || "N/A"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {trip._count.bookings} confirmed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Readiness checklist */}
                <div className="flex flex-wrap gap-3 pt-3 border-t border-border/50">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                      leadCount > 0
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    }`}
                  >
                    {leadCount > 0 ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {leadText}
                  </div>
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                      vendorCount > 0
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    {vendorText}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Link
                    href={`/dashboard/manager/trips/${trip.id}`}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/20 text-sm opacity-90 group-hover:opacity-100"
                  >
                    Action Center
                    <ChevronRight className="w-4 h-4" />
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
