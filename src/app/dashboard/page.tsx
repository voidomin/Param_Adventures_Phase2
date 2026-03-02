"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  Mountain,
  Compass,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  IndianRupee,
  Loader2,
} from "lucide-react";

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
    createdAt: string;
    roleName: string;
  };
  upcomingBookings: Booking[];
  pastBookings: Booking[];
  stats: {
    total: number;
    upcoming: number;
    past: number;
  };
}

interface Booking {
  id: string;
  participantCount: number;
  totalPrice: string;
  bookingStatus: "REQUESTED" | "CONFIRMED" | "CANCELLED";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  experience: {
    title: string;
    slug: string;
    location: string;
    durationDays: number;
    images: string[];
    difficulty: string;
  };
  slot: { date: string; capacity: number } | null;
  payments: { status: string; amount: string; method: string | null }[];
}

function getBookingStatusIcon(status: string) {
  switch (status) {
    case "CONFIRMED":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "CANCELLED":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  }
}

function getBookingStatusStyle(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "CANCELLED":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  }
}

function getPaymentStatusStyle(status: string) {
  switch (status) {
    case "PAID":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "FAILED":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  }
}

function BookingCard({
  booking,
  isUpcoming,
}: Readonly<{
  booking: Booking;
  isUpcoming: boolean;
}>) {
  const coverImage =
    booking.experience.images[0] ||
    "https://picsum.photos/seed/adventure/800/450";
  const tripDate = booking.slot
    ? new Date(booking.slot.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date TBD";

  return (
    <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      {/* Cover Image */}
      <div className="relative h-44 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt={booking.experience.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {isUpcoming && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            Upcoming
          </div>
        )}
        <div className="absolute bottom-3 left-4 right-4 flex flex-wrap gap-2">
          <span
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${getBookingStatusStyle(booking.bookingStatus)}`}
          >
            {getBookingStatusIcon(booking.bookingStatus)}
            {booking.bookingStatus}
          </span>
          <span
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${getPaymentStatusStyle(booking.paymentStatus)}`}
          >
            <CreditCard className="w-3 h-3" />
            {booking.paymentStatus}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-1">
          {booking.experience.title}
        </h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-foreground/60 mb-4">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {booking.experience.location || "India"}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            {tripDate}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            {booking.experience.durationDays} Days
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            {booking.participantCount} pax
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xl font-black text-foreground">
            <IndianRupee className="w-5 h-5 text-primary" />
            {Number(booking.totalPrice).toLocaleString("en-IN")}
          </div>
          <Link
            href={`/experiences/${booking.experience.slug}`}
            className="flex items-center gap-1.5 text-sm text-primary font-bold hover:gap-2.5 transition-all"
          >
            View Trip <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ type }: Readonly<{ type: "upcoming" | "history" }>) {
  return (
    <div className="col-span-full py-16 text-center bg-card border border-border border-dashed rounded-2xl">
      <Mountain className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-foreground/60 mb-2">
        {type === "upcoming"
          ? "No upcoming adventures yet"
          : "No past bookings"}
      </h3>
      <p className="text-foreground/40 text-sm mb-6">
        {type === "upcoming"
          ? "Ready to explore? Browse our amazing collection of trips."
          : "Your completed adventures will appear here."}
      </p>
      {type === "upcoming" && (
        <Link
          href="/experiences"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/25"
        >
          <Compass className="w-4 h-4" />
          Explore Adventures
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/user/dashboard");
        if (res.status === 401) {
          router.push("/login?redirect=/dashboard");
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load dashboard");
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-foreground/60">Loading your dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-foreground/60">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  const { user, upcomingBookings, pastBookings, stats } = data;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Hero / Profile Header */}
      <div className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30">
                <span className="text-3xl font-black text-primary-foreground">
                  {initials}
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-background flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-heading font-black text-foreground">
                  {user.name}
                </h1>
                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">
                  {user.roleName.replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-foreground/60 mb-1">{user.email}</p>
              {user.phoneNumber && (
                <p className="text-foreground/50 text-sm">{user.phoneNumber}</p>
              )}
              <p className="text-foreground/40 text-sm mt-2">
                Member since {memberSince}
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <div className="text-3xl font-black text-foreground">
                  {stats.total}
                </div>
                <div className="text-xs text-foreground/50 font-medium uppercase tracking-wider">
                  Total
                </div>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-black text-primary">
                  {stats.upcoming}
                </div>
                <div className="text-xs text-foreground/50 font-medium uppercase tracking-wider">
                  Upcoming
                </div>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <div className="text-3xl font-black text-foreground/60">
                  {stats.past}
                </div>
                <div className="text-xs text-foreground/50 font-medium uppercase tracking-wider">
                  Past
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 space-y-16">
        {/* Upcoming Trips */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground">
                Upcoming Adventures
              </h2>
              <p className="text-foreground/50 text-sm mt-1">
                Your confirmed and requested trips
              </p>
            </div>
            <Link
              href="/experiences"
              className="hidden md:flex items-center gap-1.5 text-sm text-primary font-bold hover:gap-3 transition-all"
            >
              Browse More <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isUpcoming={true}
                />
              ))
            ) : (
              <EmptyState type="upcoming" />
            )}
          </div>
        </section>

        {/* Booking History */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Booking History
            </h2>
            <p className="text-foreground/50 text-sm mt-1">
              Your past and cancelled bookings
            </p>
          </div>

          {pastBookings.length > 0 ? (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-card border border-border rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-foreground/5 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        booking.experience.images[0] ||
                        "https://picsum.photos/seed/past/160/160"
                      }
                      alt={booking.experience.title}
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground mb-1 truncate">
                      {booking.experience.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground/50">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {booking.experience.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {booking.slot
                          ? new Date(booking.slot.date).toLocaleDateString(
                              "en-IN",
                            )
                          : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {booking.participantCount} pax
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getBookingStatusStyle(booking.bookingStatus)}`}
                    >
                      {getBookingStatusIcon(booking.bookingStatus)}
                      {booking.bookingStatus}
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-black text-foreground">
                        ₹{Number(booking.totalPrice).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid">
              <EmptyState type="history" />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
