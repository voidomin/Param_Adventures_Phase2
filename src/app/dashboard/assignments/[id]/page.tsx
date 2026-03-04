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
} from "lucide-react";

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
}

export default function TrekLeadTripManifestPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripSlot | null>(null);
  const [manifest, setManifest] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchManifest = useCallback(async () => {
    try {
      const res = await fetch(`/api/trek-lead/trips/${tripId}/manifest`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch manifest.");
      }

      setTrip(data.trip);
      setManifest(data.manifest || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h2>
        <p className="text-foreground/60">{error || "Trip not found"}</p>
        <Link
          href="/dashboard/assignments"
          className="text-primary font-medium hover:underline mt-6 inline-block"
        >
          Return to My Assignments
        </Link>
      </div>
    );
  }

  const bookedCount = manifest.reduce((acc, p) => acc + p.participantCount, 0);

  return (
    <div className="max-w-4xl pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/assignments"
          className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground/50 hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {trip.experience.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-1 text-foreground/60 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <CalendarDays className="w-4 h-4 text-primary" />
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
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {bookedCount} Guests
            </span>
          </div>
        </div>
      </div>

      {/* Manifest Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Passenger Manifest
            </h2>
          </div>
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
                    <p className="font-bold text-foreground text-lg">
                      {p.user.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-foreground/60">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {p.user.email}
                      </span>
                      {p.user.phoneNumber && (
                        <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                          <Phone className="w-3.5 h-3.5" /> {p.user.phoneNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-foreground/5 border border-border px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap text-center">
                  <span className="font-bold text-foreground">
                    {p.participantCount}
                  </span>{" "}
                  Guest{p.participantCount === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-4 text-orange-600/90 text-sm">
        <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 font-bold">
          i
        </div>
        <p>
          As a Trek Lead, please verify all passengers against this manifest at
          the start of the trip. An attendance marking feature and post-trip
          expense upload tool will be available here soon.
        </p>
      </div>
    </div>
  );
}
