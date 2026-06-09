"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

export default function ProfilePromptBanner() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(true); // default to true to avoid hydration mismatch

  useEffect(() => {
    // Only check sessionStorage on client mount
    const dismissed = sessionStorage.getItem("dismissedProfilePrompt");
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, []);

  if (isLoading || !user || isDismissed) return null;

  // Don't show on auth pages, admin section, or settings page where they perform the update
  const isExcludedRoute =
    pathname.startsWith("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/forgot-password") ||
    pathname.includes("/reset-password") ||
    pathname.startsWith("/dashboard/settings");

  if (isExcludedRoute) return null;

  // We consider the profile incomplete if the phone number is missing or is the default seed placeholder
  const isProfileIncomplete = !user.phoneNumber || user.phoneNumber.includes("0000000000");

  if (!isProfileIncomplete) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("dismissedProfilePrompt", "true");
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md z-[90] bg-card border-2 border-amber-500/30 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
        aria-label="Dismiss profile alert"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 space-y-2.5">
          <h3 className="font-bold text-foreground text-sm">
            Complete Your Profile!
          </h3>
          <p className="text-xs text-foreground/60 leading-relaxed pr-4">
            You haven't added a phone number to your profile. Please add it under Settings so we can contact you regarding your bookings or requests.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              onClick={handleDismiss} // auto dismiss on navigation to settings
              className="text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              Update Profile
            </Link>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-bold text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
