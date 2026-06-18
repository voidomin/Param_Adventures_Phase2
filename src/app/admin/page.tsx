"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  TrendingUp,
  Ticket,
  Map,
  AlertCircle,
  Clock,
  User,
  Users,
  ArrowRight,
  Compass,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/AuthContext";
const DashboardCharts = dynamic(() => import("@/components/admin/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  ),
});

interface AdminDashboardData {
  metrics: {
    totalRevenue30d: number;
    activeBookings30d: number;
    upcomingTrips: number;
    totalUsers: number;
    totalExperiences: number;
  };
  pendingActions: {
    blogs: number;
    bookings: number;
  };
  recentActivity: {
    id: string;
    action: string;
    actorId: string | null;
    targetType: string;
    targetId: string | null;
    timestamp: string;
    metadata: Record<string, unknown> | null;
  }[];
  charts: {
    revenueByMonth: { month: string; revenue: number }[];
    bookingsByStatus: { status: string; count: number; color: string }[];
    topExperiences: { name: string; bookings: number }[];
    userGrowth: { month: string; users: number }[];
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (user.role !== "SUPER_ADMIN") {
      if (hasPermission("user:view-all")) {
        router.push("/admin/users");
      } else if (hasPermission("trip:manage-categories")) {
        router.push("/admin/categories");
      } else if (hasPermission("trip:create")) {
        router.push("/admin/experiences");
      } else if (hasPermission("ops:view-all-trips")) {
        router.push("/admin/trips");
      } else {
        router.push("/dashboard");
      }
      return;
    }

    fetch("/api/admin/dashboard")
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push("/dashboard");
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json && !json.error) setData(json);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [router, user, hasPermission]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-bold">Failed to load dashboard data</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-foreground">Overview</h1>
        <p className="text-foreground/60">
          Analytics and activity for the last 30 days
        </p>
      </div>

      {/* ── Metrics Row ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-primary" /> Revenue
          </div>
          <div className="text-2xl font-black text-foreground">
            ₹{data.metrics.totalRevenue30d.toLocaleString("en-IN")}
          </div>
          <span className="text-xs text-foreground/40">Last 30 days</span>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider">
            <Ticket className="h-4 w-4 text-blue-500" /> Bookings
          </div>
          <div className="text-2xl font-black text-foreground">
            {data.metrics.activeBookings30d.toLocaleString("en-IN")}
          </div>
          <span className="text-xs text-foreground/40">Last 30 days</span>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider">
            <Map className="h-4 w-4 text-green-500" /> Upcoming
          </div>
          <div className="text-2xl font-black text-foreground">
            {data.metrics.upcomingTrips.toLocaleString("en-IN")}
          </div>
          <span className="text-xs text-foreground/40">Scheduled trips</span>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider">
            <Users className="h-4 w-4 text-purple-500" /> Users
          </div>
          <div className="text-2xl font-black text-foreground">
            {data.metrics.totalUsers.toLocaleString("en-IN")}
          </div>
          <span className="text-xs text-foreground/40">Total registered</span>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 uppercase tracking-wider">
            <Compass className="h-4 w-4 text-orange-500" /> Experiences
          </div>
          <div className="text-2xl font-black text-foreground">
            {data.metrics.totalExperiences}
          </div>
          <span className="text-xs text-foreground/40">Published</span>
        </div>
      </div>

      {/* ── Charts ──────────────────────────────────────── */}
      <DashboardCharts charts={data.charts} />

      {/* ── Action Required Row ─────────────────────────── */}
      <div className="space-y-6 max-w-3xl">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" /> Action Required
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/admin/blogs")}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer text-left shadow-sm"
          >
            <div>
              <div className="font-bold text-foreground">Pending Blogs</div>
              <div className="text-sm text-foreground/60">
                Awaiting review
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 font-bold">
              {data.pendingActions.blogs}
            </div>
          </button>

          <div className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 opacity-75 shadow-sm">
            <div>
              <div className="font-bold text-foreground">Unpaid Bookings</div>
              <div className="text-sm text-foreground/60">
                Payment aborted/pending
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-foreground/50 font-bold">
              {data.pendingActions.bookings}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
