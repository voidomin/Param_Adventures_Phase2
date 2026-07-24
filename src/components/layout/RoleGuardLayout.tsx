"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

interface RoleGuardLayoutProps {
  allowedRoles: string[];
  /** Maps a signed-in-but-unauthorized user's role to where they should be sent instead of the generic /dashboard fallback. */
  fallbackRedirects?: Record<string, string>;
  children: React.ReactNode;
}

export default function RoleGuardLayout({
  allowedRoles,
  fallbackRedirects,
  children,
}: Readonly<RoleGuardLayoutProps>) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }, [user, allowedRoles]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (!isAuthorized) {
      router.push(fallbackRedirects?.[user.role] ?? "/dashboard");
    }
  }, [user, isLoading, isAuthorized, router, pathname, fallbackRedirects]);

  if (isLoading || !user || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
