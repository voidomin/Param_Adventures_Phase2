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
} from "lucide-react";

interface AdminDashboardData {
  metrics: {
    totalRevenue30d: number;
    activeBookings30d: number;
    upcomingTrips: number;
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
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, [router]);

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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground/60 uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-primary" /> Revenue (30d)
          </div>
          <div className="text-3xl font-black text-foreground">
            ₹{data.metrics.totalRevenue30d.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground/60 uppercase tracking-wider">
            <Ticket className="h-4 w-4 text-blue-500" /> Bookings (30d)
          </div>
          <div className="text-3xl font-black text-foreground">
            {data.metrics.activeBookings30d.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground/60 uppercase tracking-wider">
            <Map className="h-4 w-4 text-green-500" /> Upcoming Trips
          </div>
          <div className="text-3xl font-black text-foreground">
            {data.metrics.upcomingTrips.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Alerts & Actions */}
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
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="space-y-6 lg:col-span-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Recent Activity
          </h2>

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
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">
                        {log.action.replace(/_/g, " ")}
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
                      Target:{" "}
                      <span className="font-semibold">{log.targetType}</span>
                      {log.targetId && ` (${log.targetId.slice(0, 8)}...)`}
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
