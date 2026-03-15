"use client";

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
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface ChartData {
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByStatus: { status: string; count: number; color: string }[];
  topExperiences: { name: string; bookings: number }[];
  userGrowth: { month: string; users: number }[];
}

/* ── Custom Tooltip ────────────────────────────────────── */
function CustomTooltip({
  active,
  payload,
  label,
  prefix = "",
  suffix = "",
}: Readonly<{
  active?: boolean;
  payload?: any[];
  label?: string;
  prefix?: string;
  suffix?: string;
}>) {
  if (!active || !payload?.length) return null;
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
}: Readonly<{ active?: boolean; payload?: any[] }>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-2.5 shadow-xl text-sm">
      <p className="font-bold text-foreground">{payload[0].name}</p>
      <p className="font-black" style={{ color: payload[0].payload.color }}>
        {payload[0].value}
      </p>
    </div>
  );
}

export default function DashboardCharts({
  charts,
}: Readonly<{ charts: ChartData }>) {
  const totalBookings = charts.bookingsByStatus.reduce(
    (s, b) => s + b.count,
    0,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Revenue Chart ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4">
          Revenue Trend (6 Months)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={charts.revenueByMonth}
              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                }
              />
              <Tooltip content={<CustomTooltip prefix="₹" />} />
              <Bar
                dataKey="revenue"
                fill="var(--primary)"
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Booking Status Pie ────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4">
          Booking Distribution
        </h3>
        <div className="h-64 flex items-center justify-center">
          {totalBookings === 0 ? (
            <p className="text-foreground/40 text-sm">No bookings yet</p>
          ) : (
            <div className="w-full h-full flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.bookingsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="55%"
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {charts.bookingsByStatus.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-3 pl-4">
                {charts.bookingsByStatus.map((item) => (
                  <div key={item.status} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {item.status}
                      </span>
                    </div>
                    <span className="text-sm font-black text-foreground">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Top Experiences ───────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4">
          Top Experiences by Bookings
        </h3>
        <div className="h-64">
          {charts.topExperiences.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-foreground/40 text-sm">No data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={charts.topExperiences}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip suffix=" bookings" />} />
                <Bar
                  dataKey="bookings"
                  fill="#8b5cf6"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── User Growth ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-4">
          User Registration Trend
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={charts.userGrowth}
              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
            >
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip suffix=" users" />} />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill="url(#userGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
