"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";

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
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/roles"),
        ]);

        if (usersRes.ok) {
          const json = await usersRes.json();
          setUsers(json.users || []);
        }
        if (rolesRes.ok) {
          const json = await rolesRes.json();
          // Exclude SUPER_ADMIN from dropdown visually if we want, or just let backend reject
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
  }, []);

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
    } catch (error: any) {
      setErrorMsg(error.message);
      setTimeout(() => setErrorMsg(""), 5000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            User Management
          </h1>
          <p className="text-foreground/60 mt-1">
            Manage system users and their roles (Admin, Trek Lead, Customer).
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-3">
          <ShieldAlert className="w-5 h-5" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" /> {successMsg}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl mb-6 p-4">
        <input
          type="search"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 text-foreground"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}
      {!isLoading && filteredUsers.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-16 text-center text-foreground/50">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No active users found matching your search.</p>
        </div>
      )}
      {!isLoading && filteredUsers.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-foreground/[0.02] border-b border-border text-xs uppercase tracking-wider text-foreground/50">
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Current Role</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Assign Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const currentRoleName = user.role.name;
                  const currentRoleId = roles.find(
                    (r) => r.name === currentRoleName,
                  )?.id;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-foreground/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm text-foreground">
                          {user.name}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-md border border-border uppercase bg-foreground/5 text-foreground/80">
                          {currentRoleName.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {updatingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <select
                              disabled={
                                updatingUserId === user.id ||
                                currentRoleName === "SUPER_ADMIN"
                              }
                              value={currentRoleId || ""}
                              onChange={(e) =>
                                handleRoleChange(user.id, e.target.value)
                              }
                              className="bg-transparent border border-border rounded-lg text-sm px-3 py-1.5 focus:border-primary outline-none text-foreground w-40 disabled:opacity-50"
                            >
                              <option value="" disabled>
                                Select Role
                              </option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name.replace("_", " ")}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
