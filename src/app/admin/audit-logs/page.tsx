"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

interface AuditLog {
  id: string;
  action: string;
  actorId: string | null;
  targetType: string;
  targetId: string | null;
  timestamp: string;
  metadata: Record<string, any> | null;
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "SUPER_ADMIN") {
      router.push("/admin/users");
    }
  }, [user, router]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        search: searchTerm,
        action: selectedAction,
      });
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, selectedAction]);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchLogs();
    }
  }, [fetchLogs, user?.role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-foreground">Audit Logs</h1>
        <p className="text-foreground/60">
          Complete history of all administrative actions
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Search by target type or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl outline-none focus:border-primary/50 transition-colors"
          />
        </form>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-8 py-2 bg-card border border-border rounded-xl outline-none focus:border-primary/50 appearance-none cursor-pointer transition-colors"
            >
              <option value="">All Actions</option>
              {/* Actions list */}
              <option value="LOGIN">Login</option>
              <option value="ROLE_ASSIGNED">Role Assigned</option>
              <option value="BOOKING_REQUESTED">Booking Requested</option>
              <option value="EXPERIENCE_CREATED">Experience Created</option>
              <option value="EXPERIENCE_UPDATED">Experience Updated</option>
              <option value="SLOT_CREATED">Slot Created</option>
              <option value="SLOT_UPDATED">Slot Updated</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center text-foreground/50">
          No logs found matching your criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-foreground/[0.02] border-b border-border">
                <tr className="text-xs font-bold text-foreground/50 uppercase tracking-widest">
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Type</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      className={`hover:bg-foreground/[0.01] transition-colors cursor-pointer ${expandedLogId === log.id ? "bg-foreground/[0.02]" : ""}`}
                      onClick={() => toggleExpand(log.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Info className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-sm text-foreground">
                            {log.action.replaceAll("_", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs uppercase tracking-wider font-bold text-foreground/60 px-2 py-1 bg-foreground/5 rounded-md">
                          {log.targetType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground/70">
                          {new Date(log.timestamp).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {expandedLogId === log.id ? (
                          <ChevronDown className="h-4 w-4 ml-auto text-foreground/40 rotate-180 transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-auto text-foreground/40 transition-transform" />
                        )}
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                      <tr className="bg-foreground/[0.02]">
                        <td
                          colSpan={4}
                          className="px-6 py-6 border-t border-border/50"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/40">
                                Context
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-foreground/50">
                                    Actor ID:
                                  </span>
                                  <span className="font-mono text-xs">
                                    {log.actorId || "System"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-foreground/50">
                                    Target ID:
                                  </span>
                                  <span className="font-mono text-xs">
                                    {log.targetId || "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-foreground/50">
                                    Log ID:
                                  </span>
                                  <span className="font-mono text-xs">
                                    {log.id}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/40">
                                Metadata
                              </h4>
                              <pre className="p-4 bg-background rounded-xl border border-border text-xs text-foreground/70 overflow-x-auto max-h-48 overflow-y-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-foreground/50">
              Showing{" "}
              <span className="text-foreground font-medium">{logs.length}</span>{" "}
              of <span className="text-foreground font-medium">{total}</span>{" "}
              logs
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 border border-border rounded-lg hover:bg-card disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-medium text-foreground px-4">
                Page {page} of {totalPages}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 border border-border rounded-lg hover:bg-card disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
