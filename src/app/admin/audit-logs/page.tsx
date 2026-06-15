"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ScrollText,
  Ticket,
  Users,
  Compass,
  Settings,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

interface LogCategory {
  id: string;
  title: string;
  description: string;
  targetType: string | undefined;
  icon: React.ElementType;
  colorClass: string;
  iconColor: string;
}

const LOG_CATEGORIES: LogCategory[] = [
  {
    id: "all",
    title: "All System Logs",
    description: "Export the complete system-wide audit trail. Contains all recorded actions across all modules.",
    targetType: undefined,
    icon: ScrollText,
    colorClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    iconColor: "text-blue-500",
  },
  {
    id: "booking",
    title: "Bookings & Payments",
    description: "Export transaction histories, booking requests, confirmations, cancels, refunds, and cleanups.",
    targetType: "Booking",
    icon: Ticket,
    colorClass: "bg-green-500/10 text-green-500 border-green-500/20",
    iconColor: "text-green-500",
  },
  {
    id: "user",
    title: "User Management",
    description: "Export account creation audit, role assignments, authority changes, and staff access adjustments.",
    targetType: "User",
    icon: Users,
    colorClass: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    iconColor: "text-purple-500",
  },
  {
    id: "experience",
    title: "Experiences & Trips",
    description: "Export experience creations, updates, scheduling slots, reviews, and operational trek assignments.",
    targetType: "Experience,Slot,Review,Blog,TripAssignment",
    icon: Compass,
    colorClass: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    iconColor: "text-orange-500",
  },
  {
    id: "system",
    title: "System & Governance",
    description: "Export configurations history, tax rates, API integrations, homepage slider modifications, and brand story blocks.",
    targetType: "SYSTEM,System,SiteSetting,HeroSlide,StoryBlock,AdventureQuote,Image",
    icon: Settings,
    colorClass: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    iconColor: "text-rose-500",
  },
];

export default function AuditLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [downloading, setDownloading] = useState<Record<string, "json" | "excel" | null>>({});

  useEffect(() => {
    if (user && user.role !== "SUPER_ADMIN") {
      router.push("/admin/users");
    }
  }, [user, router]);

  const handleDownload = async (category: LogCategory, format: "json" | "excel") => {
    setDownloading((prev) => ({ ...prev, [category.id]: format }));

    try {
      const url = new URL("/api/admin/audit-logs", globalThis.origin);
      url.searchParams.set("download", "true");
      if (category.targetType) {
        url.searchParams.set("targetType", category.targetType);
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch audit records.");
      }

      const data = await res.json();
      const logs = data.logs || [];

      if (logs.length === 0) {
        globalThis.alert?.("No audit logs found for this category.");
        return;
      }

      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `audit_report_${category.id}_${dateStr}`;

      if (format === "json") {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(logs, null, 2)], {
          type: "application/json",
        });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);
      } else {
        // Handle Excel download (SheetJS)
        const XLSX = await import("xlsx");

        // Format raw logs into flat sheet rows
        const rows = logs.map((log: any) => ({
          "Log ID": log.id,
          "Action": log.action.replaceAll("_", " "),
          "Target Type": log.targetType,
          "Target ID": log.targetId || "N/A",
          "Actor ID": log.actorId || "System / Automated",
          "Timestamp": new Date(log.timestamp),
          "Metadata Payload": log.metadata ? JSON.stringify(log.metadata) : "N/A",
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: "yyyy-mm-dd hh:mm:ss" });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Trail");

        // Auto-fit column widths
        const maxLen = rows.reduce((acc: any, row: any) => {
          Object.keys(row).forEach((key) => {
            const val = row[key] instanceof Date
              ? row[key].toISOString().replace("T", " ").substring(0, 19)
              : String(row[key] ?? "");
            acc[key] = Math.max(acc[key] || 10, val.length);
          });
          return acc;
        }, {});

        worksheet["!cols"] = Object.keys(maxLen).map((key) => ({
          wch: Math.min(60, maxLen[key] + 2),
        }));

        XLSX.writeFile(workbook, `${filename}.xlsx`);
      }
    } catch (err) {
      console.error("Audit log download failure:", err);
      globalThis.alert?.("Failed to generate or download the audit report. Please try again.");
    } finally {
      setDownloading((prev) => ({ ...prev, [category.id]: null }));
    }
  };

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-black text-foreground">Audit Reports</h1>
        <p className="text-foreground/60">
          Export cryptographic activity logs and administrative system trail.
        </p>
      </div>

      {/* Info Alert Center */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 text-sm text-foreground/80">
        <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-foreground">System Audit Notice</p>
          <p className="text-xs text-foreground/60 leading-relaxed">
            Live log rendering is deactivated. Admin activities can be exported into JSON payloads or formatted Microsoft Excel spreadsheets for offline parsing, storage, or external auditing.
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {LOG_CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const activeDownload = downloading[category.id];

          return (
            <div
              key={category.id}
              className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl border ${category.colorClass}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{category.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-foreground/40">
                      {category.id === "all" ? "Full system export" : `Filter: ${category.targetType}`}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-foreground/60 leading-relaxed min-h-[48px]">
                  {category.description}
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-border/50 flex flex-col sm:flex-row gap-3">
                <button
                  disabled={activeDownload !== null && activeDownload !== undefined}
                  onClick={() => handleDownload(category, "json")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-foreground/5 hover:border-foreground/20 transition-all font-bold text-xs disabled:opacity-50 cursor-pointer"
                >
                  {activeDownload === "json" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <FileJson className="h-4 w-4 text-foreground/60" />
                  )}
                  Export JSON
                </button>
                <button
                  disabled={activeDownload !== null && activeDownload !== undefined}
                  onClick={() => handleDownload(category, "excel")}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-95 transition-all font-bold text-xs disabled:opacity-50 cursor-pointer shadow-sm shadow-primary/20"
                >
                  {activeDownload === "excel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Export Excel
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
