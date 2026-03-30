"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { SYSTEM_ADMIN_EMAILS } from "@/lib/constants/auth";
import MaintenanceScreen from "./MaintenanceScreen";
import { usePathname } from "next/navigation";

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function checkMaintenance() {
      try {
        // We use the public settings endpoint or a lightweight check
        const res = await fetch("/api/admin/settings/system");
        if (res.ok) {
          const data = await res.json();
          const mode = data.platform.find((s: any) => s.key === "maintenance_mode")?.value === "true";
          setMaintenanceMode(mode);
        }
      } catch (error) {
        console.error("Maintenance check failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkMaintenance();
  }, []);

  const isWhitelisted = user && SYSTEM_ADMIN_EMAILS.includes(user.email);
  const isAdminPath = pathname?.startsWith("/admin") || pathname?.startsWith("/api/admin");

  // Bypass maintenance for:
  // 1. Whitelisted admins (so they can fix it)
  // 2. Admin paths (so login/dash still works for admins)
  if (maintenanceMode && !isWhitelisted && !isAdminPath) {
    if (isLoading || authLoading) return null; // Wait for auth to be sure
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}
