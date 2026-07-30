"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MailWarning, X } from "lucide-react";

export default function EmailVerificationBanner() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(true); // default to true to avoid hydration mismatch
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    const dismissed = sessionStorage.getItem("dismissedVerifyEmailPrompt");
    if (!dismissed) {
       
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
    pathname.startsWith("/verify-email");

  if (isExcludedRoute) return null;
  if (user.isVerified) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("dismissedVerifyEmailPrompt", "true");
    setIsDismissed(true);
  };

  const handleResend = async () => {
    setSendState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (!res.ok) throw new Error("Failed to resend verification email");
      setSendState("sent");
    } catch {
      setSendState("error");
    }
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-6 md:right-auto md:max-w-md z-[90] bg-card border-2 border-amber-500/30 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
        aria-label="Dismiss email verification alert"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
          <MailWarning className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 space-y-2.5">
          <h3 className="font-bold text-foreground text-sm">Verify Your Email</h3>
          <p className="text-xs text-foreground/60 leading-relaxed pr-4">
            Please confirm your email address before booking a trip. Check your inbox for the
            verification link we sent when you signed up.
          </p>

          {sendState === "sent" ? (
            <p className="text-xs font-bold text-emerald-500">Verification email sent — check your inbox!</p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={sendState === "sending"}
                className="text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sendState === "sending" ? "Sending…" : "Resend Email"}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs font-bold text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          )}
          {sendState === "error" && (
            <p className="text-xs text-red-400">Couldn&apos;t send it — please try again shortly.</p>
          )}
        </div>
      </div>
    </div>
  );
}
