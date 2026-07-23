"use client";

import { useState, FormEvent } from "react";
import { Loader2, X, Lock } from "lucide-react";

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email: string;
}

export default function ReauthModal({
  isOpen,
  onClose,
  onSuccess,
  email,
}: Readonly<ReauthModalProps>) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check your password.");
        return;
      }

      // Success: cookie is set, run callback
      onSuccess();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-foreground/[0.02]">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold text-lg text-foreground">Session Expired</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-sm text-foreground/60 leading-relaxed">
            Your session has expired. To avoid losing your draft progress, please enter your password to re-authenticate and continue.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="reauth-email" className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                Account
              </label>
              <input
                id="reauth-email"
                type="text"
                disabled
                value={email}
                className="w-full px-4 py-3 bg-foreground/[0.03] border border-border rounded-xl text-foreground/50 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="reauth-password" className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="reauth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground/35 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/25 px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-border hover:bg-foreground/5 text-foreground rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 h-10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                </>
              ) : (
                "Re-Authenticate"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
