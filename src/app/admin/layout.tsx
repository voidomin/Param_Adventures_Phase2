"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  LayoutDashboard,
  Map,
  Users,
  LogOut,
  Tags,
  Image as ImageIcon,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, hasPermission, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/admin");
      } else if (
        !hasPermission("system:config") &&
        !hasPermission("trip:manage-categories") &&
        !hasPermission("trip:create")
      ) {
        // Basic check: if they don't have at least one admin-ish permission, kick them out
        router.push("/");
      }
    }
  }, [user, isLoading, hasPermission, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    {
      name: "Categories",
      href: "/admin/categories",
      icon: Tags,
      permission: "trip:manage-categories",
    },
    {
      name: "Experiences",
      href: "/admin/experiences",
      icon: Compass,
      permission: "trip:create",
    },
    {
      name: "Media Library",
      href: "/admin/media",
      icon: ImageIcon,
      permission: "trip:create",
    },
    {
      name: "Bookings",
      href: "/admin/bookings",
      icon: Map,
      permission: "booking:view-all",
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: Users,
      permission: "user:view-all",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-border fixed h-full z-40 hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-heading font-bold text-primary">
              PARAM
            </span>
            <span className="text-xl font-heading font-bold text-foreground">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
          {navItems.map((item) => {
            // Only show items user has permission for
            if (item.permission && !hasPermission(item.permission as any))
              return null;

            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${isActive ? "text-primary" : "text-foreground/50"}`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-foreground/5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-foreground/50 truncate">
                {user.role.replaceAll("_", " ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-foreground/70 hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 relative">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
