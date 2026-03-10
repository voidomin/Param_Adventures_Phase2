"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  LayoutDashboard,
  Map,
  Users,
  LogOut,
  Tags,
  Image as ImageIcon,
  MonitorPlay,
  PenLine,
  ClipboardList,
  Star,
  Headset,
  ScrollText,
  Menu,
  X as CloseIcon,
  ArrowLeft,
} from "lucide-react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isLoading, hasPermission, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/admin");
      } else if (
        !hasPermission("system:config") &&
        !hasPermission("trip:manage-categories") &&
        !hasPermission("trip:create") &&
        !hasPermission("media:upload") &&
        !hasPermission("ops:view-all-trips")
      ) {
        // Basic check: if they don't have at least one admin-ish permission, kick them out
        router.push("/");
      }
    }
  }, [user, isLoading, hasPermission, router]);

  // Close sidebar on navigation change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      role: "SUPER_ADMIN",
    },
    {
      name: "Audit Logs",
      href: "/admin/audit-logs",
      icon: ScrollText,
      role: "SUPER_ADMIN",
    },
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
      name: "Hero Slider",
      href: "/admin/hero",
      icon: MonitorPlay,
      permission: "trip:create",
    },
    {
      name: "Operational Trips",
      href: "/admin/trips",
      icon: ClipboardList,
      permission: "ops:view-all-trips",
    },
    {
      name: "Bookings",
      href: "/admin/bookings",
      icon: Map,
      permission: "booking:view-all",
    },
    {
      name: "Custom Leads",
      href: "/admin/leads",
      icon: Headset,
      permission: "booking:view-all",
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: Users,
      permission: "user:view-all",
    },
    {
      name: "Blog Moderation",
      href: "/admin/blogs",
      icon: PenLine,
      permission: ["blog:moderate", "media:upload"],
    },
    {
      name: "Reviews",
      href: "/admin/reviews",
      icon: Star,
      permission: "trip:create",
    },
  ] satisfies {
    name: string;
    href: string;
    icon: React.ElementType;
    permission?: string | string[];
    role?: string;
  }[];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-background border-b border-border flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-foreground/70 hover:bg-foreground/5 rounded-lg"
          >
            {isSidebarOpen ? (
              <CloseIcon className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <span className="font-heading font-black text-lg">
            <span className="text-primary">PARAM</span> Admin
          </span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-full"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Site
        </Link>
      </header>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsSidebarOpen(false);
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-background border-r border-border fixed h-full z-40 flex flex-col transition-transform duration-300 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="p-6 hidden md:block">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-heading font-bold text-primary">
              PARAM
            </span>
            <span className="text-xl font-heading font-bold text-foreground">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4 md:mt-0">
          <div className="md:hidden mb-4 pb-4 border-b border-border/50">
            <p className="px-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
              Navigation
            </p>
          </div>
          {navItems.map((item) => {
            // Role-based guard (check user.role directly)
            if (item.role && user.role !== item.role) return null;

            // Permission-based guard
            if (item.permission) {
              const perms = Array.isArray(item.permission)
                ? item.permission
                : [item.permission];
              if (!perms.some((p) => hasPermission(p))) return null;
            }

            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
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
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-primary/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                {user.name.charAt(0)}
              </div>
            )}
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
      <div className="flex-1 md:ml-64 relative">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
