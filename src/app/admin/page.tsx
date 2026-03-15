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
  Settings,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import DashboardCharts from "@/components/admin/DashboardCharts";

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
    metadata: Record<string, any> | null;
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

      {/* ── Actions & Activity Row ─────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Alerts */}
        <div className="space-y-6 lg:col-span-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" /> Action Required
          </h2>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => router.push("/admin/blogs")}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer text-left"
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

            <div className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 opacity-75">
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

            {user?.role === "SUPER_ADMIN" && (
              <button
                onClick={() => router.push("/admin/settings")}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-primary/5 p-4 hover:border-primary/50 transition-colors cursor-pointer text-left mt-2"
              >
                <div>
                  <div className="font-bold text-primary flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Platform Settings
                  </div>
                  <div className="text-sm text-foreground/60">
                    Configure taxes, deductibles & company info
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Right: Activity Feed */}
        <div className="space-y-6 lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Recent Activity
            </h2>
            <Link
              href="/admin/audit-logs"
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
            >
              View Full Log <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {data.recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-foreground/50">
              No recent activity recorded.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
              {data.recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-4 p-4 hover:bg-foreground/5 transition-colors"
                >
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground truncate">
                        {log.action.replaceAll("_", " ")}
                      </p>
                      <time className="text-xs text-foreground/50 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <div className="text-xs text-foreground/70">
                      {log.targetType}
                      {log.targetId && (
                        <span className="text-foreground/40">
                          {" "}
                          · {log.targetId.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
