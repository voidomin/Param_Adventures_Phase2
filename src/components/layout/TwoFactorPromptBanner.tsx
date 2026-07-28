"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

/**
 * A purely optional suggestion, never a gate -- 2FA is off by default for
 * every account and nothing in the booking/checkout flow depends on it.
 * Dismissal is remembered in localStorage (not sessionStorage, unlike the
 * other prompts) since this is a "maybe later, don't keep asking" kind of
 * suggestion rather than something that needs re-surfacing every session.
 */
export default function TwoFactorPromptBanner() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(true); // default to true to avoid hydration mismatch

  useEffect(() => {
    const dismissed = localStorage.getItem("dismissedTwoFactorPrompt");
    if (!dismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDismissed(false);
    }
  }, []);

  if (isLoading || !user || isDismissed) return null;

  const isExcludedRoute =
    pathname.startsWith("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/forgot-password") ||
    pathname.includes("/reset-password") ||
    pathname.startsWith("/dashboard/settings");

  if (isExcludedRoute) return null;

  // Defer to email verification and profile completion first -- this is the
  // lowest-priority, purely-optional suggestion of the three corner prompts.
  if (!user.isVerified) return null;
  const isProfileIncomplete = !user.phoneNumber || user.phoneNumber.includes("0000000000");
  if (isProfileIncomplete) return null;
  if (user.twoFactorEnabled) return null;

  const handleDismiss = () => {
    localStorage.setItem("dismissedTwoFactorPrompt", "true");
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md z-[90] bg-card border-2 border-emerald-500/30 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
        aria-label="Dismiss two-factor authentication suggestion"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 space-y-2.5">
          <h3 className="font-bold text-foreground text-sm">
            Add an Extra Layer of Security
          </h3>
          <p className="text-xs text-foreground/60 leading-relaxed pr-4">
            Turn on two-factor authentication to protect your account. Totally optional — it
            takes about a minute and won&apos;t slow down your bookings.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/settings"
              onClick={handleDismiss}
              className="text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              Set It Up
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
