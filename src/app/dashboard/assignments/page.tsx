"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  ChevronRight,
  Compass,
} from "lucide-react";

interface Slot {
  id: string;
  date: string;
  experience: {
    title: string;
    location: string;
    durationDays: number;
  };
  _count: {
    bookings: number;
  };
}

export default function TrekLeadAssignmentsPage() {
  const [assignments, setAssignments] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/trek-lead/assignments");
        if (!res.ok) throw new Error("Failed to fetch assignments");
        const data = await res.json();
        setAssignments(data.assignments || []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssignments();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">
          My Upcoming Trips
        </h1>
        <p className="text-foreground/60 mt-1">
          Trips you are assigned to lead. Click to view constraints and
          passenger manifests.
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Compass className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
          <h3 className="text-lg font-bold text-foreground mb-1">
            No Assignments Yet
          </h3>
          <p className="text-foreground/60">
            You don&apos;t have any upcoming trips assigned to you.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((slot) => (
            <Link
              key={slot.id}
              href={`/dashboard/assignments/${slot.id}`}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors group flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {slot.experience.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground/60">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    {formatDate(slot.date)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {slot.experience.location || "N/A"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {slot._count.bookings} Guests Confirmed
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                View Manifest <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
