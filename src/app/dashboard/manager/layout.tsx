"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function ManagerDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    return ["TRIP_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(user.role);
  }, [user]);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!isAuthorized) {
        let redirectPath = "/dashboard";
        if (user.role === "TREK_LEAD") {
          redirectPath = "/dashboard/trek-lead";
        }
        router.push(redirectPath);
      }
    }
  }, [user, isLoading, isAuthorized, router, pathname]);

  if (isLoading || !user || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
