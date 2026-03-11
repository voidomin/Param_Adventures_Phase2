"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, ShieldAlert, CheckCircle2, Search, Filter, ChevronLeft, ChevronRight, UserCog, User as UserIcon, Star } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { TableSkeleton } from "@/components/admin/TableSkeleton";


interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: { name: string };
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination & API State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, admins: 0, customers: 0, trekLeads: 0 });

  // Action State
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 on role filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter]);

  // Fetch Data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });
        if (roleFilter !== "ALL") queryParams.append("role", roleFilter);
        if (debouncedSearchTerm) queryParams.append("search", debouncedSearchTerm);

        const [usersRes, rolesRes] = await Promise.all([
          fetch(`/api/admin/users?${queryParams.toString()}`),
          fetch("/api/admin/roles"),
        ]);

        if (usersRes.ok) {
          const json = await usersRes.json();
          setUsers(json.users || []);
          if (json.pagination) setPagination(json.pagination);
          if (json.stats) setStats(json.stats);
        }
        if (rolesRes.ok) {
          const json = await rolesRes.json();
          setRoles(json.roles || []);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
        setErrorMsg("Failed to load data.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [currentPage, roleFilter, debouncedSearchTerm]);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    setUpdatingUserId(userId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: newRoleId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update role.");
      }

      setSuccessMsg(`Successfully updated role for ${data.user.name}.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.user.role } : u)),
      );

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : "Update failed");
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const canAssignRoles = roles.length > 0;

  const getRoleBadgeStyle = (roleName: string) => {
    switch(roleName) {
      case 'SUPER_ADMIN': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'ADMIN': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'TREK_LEAD': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'CUSTOMER': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-foreground/5 text-foreground/80 border-border';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">User Management</h1>
        <p className="text-foreground/60 mt-1">Manage system users, roles, and access credentials.</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats.total, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Customers", value: stats.customers, icon: UserIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Trek Leads", value: stats.trekLeads, icon: Star, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Admins", value: stats.admins, icon: UserCog, color: "text-red-500", bg: "bg-red-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-3 font-medium">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-3 font-medium">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {/* Filters Area */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            type="search"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-foreground transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-foreground/40" />
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 md:w-48 bg-background border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-foreground transition-colors appearance-none"
          >
            <option value="ALL">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.name}>{r.name.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col pt-1">
        {isLoading && (
          <TableSkeleton columns={3} rows={itemsPerPage} />
        )}
        
        {!isLoading && users.length === 0 && (
          <div className="py-24 text-center text-foreground/50 flex flex-col items-center">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium">No users found matching your filters.</p>
          </div>
        )}
        
        {!isLoading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-foreground/[0.02] border-b border-border text-xs uppercase tracking-wider text-foreground/50">
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">User Details</th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Current Role</th>
                  {canAssignRoles && <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">Assign Role</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const currentRoleName = user.role.name;
                  const currentRoleId = roles.find((r) => r.name === currentRoleName)?.id;
                  const isTargetSuperAdmin = currentRoleName === "SUPER_ADMIN";
                  const canModifyThisUser = canAssignRoles && (!isTargetSuperAdmin || currentUser?.role === "SUPER_ADMIN");

                  return (
                    <tr key={user.id} className="hover:bg-foreground/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                              {user.name}
                            </div>
                            <div className="text-xs text-foreground/60 font-medium">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-md border uppercase whitespace-nowrap ${getRoleBadgeStyle(currentRoleName)}`}>
                          {currentRoleName.replace("_", " ")}
                        </span>
                      </td>
                      {canAssignRoles && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {(() => {
                              if (updatingUserId === user.id) {
                                return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
                              }
                              if (canModifyThisUser) {
                                return (
                                  <select
                                    disabled={updatingUserId === user.id}
                                    value={currentRoleId || ""}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="bg-background border border-border rounded-lg text-sm px-3 py-1.5 focus:border-primary outline-none text-foreground w-40 disabled:opacity-50 font-medium transition-colors hover:border-foreground/30"
                                  >
                                    {roles.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.name.replace("_", " ")}
                                      </option>
                                    ))}
                                  </select>
                                );
                              }
                              return (
                                <span className="text-xs font-semibold text-foreground/30 uppercase px-3 py-1.5">
                                  Read-only
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && users.length > 0 && (
          <div className="border-t border-border p-4 bg-foreground/[0.01] flex items-center justify-between text-sm text-foreground/60 font-medium rounded-b-2xl">
            <div>
              Showing <span className="text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, pagination.total)}</span> of <span className="text-foreground">{pagination.total}</span> users
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-background transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="px-3 py-1.5 bg-background border border-border rounded-lg min-w-[3rem] text-center font-bold text-foreground">
                {currentPage} / {pagination.totalPages}
              </div>

              <button
                type="button"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-background transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
