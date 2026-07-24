"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X, Compass, Map, BookOpen, LogOut, User } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const isProfileIncomplete = !!user && (!user.phoneNumber || user.phoneNumber.includes("0000000000"));

  // Hide Navbar on specific routes
  if (
    pathname.startsWith("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/forgot-password") ||
    pathname.includes("/reset-password")
  ) {
    return null;
  }

  const navLinks = [
    { name: "Explore", href: "/experiences", icon: Compass },
    { name: "My Bookings", href: "/bookings", icon: Map },
    { name: "Stories", href: "/blog", icon: BookOpen },
  ];

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-[100] bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/param-logo.png"
                alt="Param Adventures"
                width={40}
                height={40}
                className="rounded-full"
                priority
              />
              <span className="text-lg font-heading font-bold tracking-wide hidden sm:block">
                <span className="text-primary">PARAM</span>{" "}
                <span className="text-foreground/60">Adventures</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </Link>
              ))}

              {/* Auth Section */}
              {isLoading && (
                <div className="w-20 h-9 bg-foreground/10 rounded-full animate-pulse" />
              )}

              {!isLoading && user && (
                <div className="flex items-center gap-4">
                  {["ADMIN", "SUPER_ADMIN", "MEDIA_UPLOADER"].includes(
                    user.role,
                  ) ? (
                    <Link
                      href="/admin"
                      className="text-sm font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                      Admin Dashboard
                    </Link>
                  ) : null}
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-1.5 bg-foreground/5 hover:bg-primary/10 rounded-full transition-colors relative"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-black text-primary-foreground">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-foreground/80">
                      {user.name.split(" ")[0]}
                    </span>
                    {isProfileIncomplete && (
                      <span className="absolute -top-1 -right-0.5 w-2.5 h-2.5 bg-amber-500 border-2 border-background rounded-full animate-pulse" />
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-foreground/50 hover:text-red-500 transition-colors min-w-10 min-h-10 flex items-center justify-center"
                    title="Logout"
                    aria-label="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!isLoading && !user && (
                <Link
                  href="/login"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform"
                >
                  Sign In
                </Link>
              )}

              <ThemeToggle />
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center space-x-4">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-foreground relative z-[60] min-w-10 min-h-10 flex items-center justify-center"
                aria-label={isOpen ? "Close menu" : "Open menu"}
                suppressHydrationWarning
              >
                {isOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <div className="relative">
                    <Menu className="w-6 h-6" />
                    {isProfileIncomplete && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 border-2 border-background rounded-full animate-pulse" />
                    )}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Overlay — OUTSIDE the nav for proper z-index stacking */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-[55] overflow-y-auto bg-background">
          <div className="flex flex-col p-6 space-y-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-xl font-heading font-medium flex items-center gap-4 border-b border-border pb-4 text-foreground"
              >
                <link.icon className="w-6 h-6 text-primary" />
                {link.name}
              </Link>
            ))}

            {/* Mobile Auth Section */}
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-4 text-foreground">
                  <User className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-lg font-heading font-medium">
                      {user.name}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {user.role.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
                {["ADMIN", "SUPER_ADMIN", "MEDIA_UPLOADER"].includes(
                  user.role,
                ) ? (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="w-full py-4 text-lg font-bold text-center block text-primary"
                  >
                    Go to Admin Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="w-full py-4 text-lg font-bold text-center block relative text-primary"
                  >
                    My Dashboard
                    {isProfileIncomplete && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    )}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-4 rounded-xl text-lg font-bold text-center block bg-red-500 text-white"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="w-full py-4 rounded-xl text-lg font-bold text-center block bg-primary text-primary-foreground"
              >
                Sign In to Book
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
