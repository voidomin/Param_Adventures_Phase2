"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";

interface ChartData {
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByStatus: { status: string; count: number; color: string }[];
  topExperiences: { name: string; bookings: number }[];
  userGrowth: { month: string; users: number }[];
}

type TooltipPayload = {
  value: number;
  name?: string;
  payload?: {
    color?: string;
  };
};

/* ── Types & Helpers ───────────────────────────────────── */

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  prefix?: string;
  suffix?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  prefix = "",
  suffix = "",
}: Readonly<TooltipProps>) {
  if (active === false || !payload || payload.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-xl text-sm">
      <p className="font-bold text-foreground mb-0.5">{label}</p>
      <p className="text-primary font-black">
        {prefix}
        {payload[0].value.toLocaleString("en-IN")}
        {suffix}
      </p>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: TooltipPayload[] }>) {
  if (active === false || !payload || payload.length === 0 || !payload[0].payload) {
    return null;
  }
  
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-xl text-sm">
      <p className="font-bold text-foreground">{payload[0].name}</p>
      <p className="font-black" style={{ color: payload[0].payload.color }}>
        {payload[0].value ?? 0}
      </p>
    </div>
  );
}

const ChartSkeleton = () => (
  <div className="w-full h-[280px] bg-foreground/5 animate-pulse rounded-xl" />
);

const NoData = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[280px] text-foreground/40 text-sm">
    {message}
  </div>
);

// ── Common Chart Layout Wrapper ──
// The "Absolute Measurement" trick for Recharts in CSS Grid
const ChartWrapper = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm overflow-hidden min-h-[350px] flex flex-col">
    <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4 shrink-0">
      {title}
    </h3>
    <div className="flex-1 w-full relative min-h-[280px]">
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  </div>
);

/* ── Main Component ────────────────────────────────────── */

export default function DashboardCharts({
  charts,
}: Readonly<{ charts: ChartData }>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1.2s delay to ensure CSS Grid layout is 100% painted and settled
    const timer = setTimeout(() => {
      setMounted(true);
    }, 1200);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const totalBookings = charts.bookingsByStatus.reduce(
    (acc, item) => acc + item.count,
    0,
  );

  if (mounted === false) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[350px]">
            <div className="h-4 w-32 bg-foreground/5 animate-pulse rounded mb-4" />
            <ChartSkeleton />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
      {/* Revenue Chart */}
      <ChartWrapper title="Revenue Trend (6 Months)">
        <ResponsiveContainer width="99.9%" height={280} minWidth={0} minHeight={0}>
          <BarChart
            data={charts.revenueByMonth}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => {
                if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
                return `₹${v}`;
              }}
            />
            <Tooltip content={<CustomTooltip prefix="₹" />} />
            <Bar dataKey="revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </ChartWrapper>

      {/* Booking Status Chart */}
      <ChartWrapper title="Booking Distribution">
        {totalBookings === 0 ? (
          <NoData message="No bookings yet" />
        ) : (
          <div className="w-full h-full flex items-center">
            <div className="w-1/2 h-[280px] relative">
              <div className="absolute inset-0">
                <ResponsiveContainer width="99.9%" height={280} minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={charts.bookingsByStatus.map(b => ({ ...b, fill: b.color }))}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="55%"
                      paddingAngle={3}
                      strokeWidth={0}
                    />
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="w-1/2 space-y-3 pl-4">
              {charts.bookingsByStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{item.status}</span>
                  </div>
                  <span className="text-sm font-black text-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartWrapper>

      {/* Top Experiences Chart */}
      <ChartWrapper title="Top Experiences by Bookings">
        {charts.topExperiences.length === 0 ? (
          <NoData message="No data yet" />
        ) : (
          <ResponsiveContainer width="99.9%" height={280} minWidth={0} minHeight={0}>
            <BarChart
              data={charts.topExperiences}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 11, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip suffix=" bookings" />} />
              <Bar dataKey="bookings" fill="#8b5cf6" radius={[0, 8, 8, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>

      {/* User Growth Chart */}
      <ChartWrapper title="User Registration Trend">
        <ResponsiveContainer width="99.9%" height={280} minWidth={0} minHeight={0}>
          <AreaChart data={charts.userGrowth} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip suffix=" users" />} />
            <Area type="monotone" dataKey="users" stroke="#22c55e" strokeWidth={2.5} fill="url(#userGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </div>
  );
}
