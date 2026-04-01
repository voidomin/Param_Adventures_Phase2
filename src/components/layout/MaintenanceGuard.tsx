"use client";

import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { SYSTEM_ADMIN_EMAILS } from "@/lib/constants/auth";
import MaintenanceScreen from "./MaintenanceScreen";
import { usePathname } from "next/navigation";

interface MaintenanceGuardProps {
  children: React.ReactNode;
  isMaintenanceMode: boolean;
}

export default function MaintenanceGuard({ children, isMaintenanceMode }: Readonly<MaintenanceGuardProps>) {
  const { user, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const isMon = pathname === "/monitoring" || pathname?.startsWith("/monitoring/");
  const isAdminPath = pathname?.startsWith("/admin") || pathname?.startsWith("/api/admin") || isMon;

  const isWhitelisted = user && SYSTEM_ADMIN_EMAILS.includes(user.email);

  // Bypass maintenance for:
  // 1. Whitelisted admins (so they can fix it)
  // 2. Admin paths (so login/dash still works for admins)
  if (isMaintenanceMode && !isWhitelisted && !isAdminPath) {
    if (authLoading) return null; // Wait for auth to be sure
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
}
