"use client";

import { useState } from "react";
import { ShieldCheck, AlertCircle, CheckCircle2, Copy } from "lucide-react";

interface SetupData {
  secret: string;
  provisioningUri: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export default function TwoFactorSettings({ enabled }: Readonly<{ enabled: boolean }>) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  const startSetup = async () => {
    if (busy) return;
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/user/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start setup.");
      setSetupData(data);
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/user/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code.");
      setIsEnabled(true);
      setMsg({ type: "success", text: "Two-factor authentication is now enabled. Save your backup codes somewhere safe!" });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/user/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword || undefined, code: disableCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disable.");
      setIsEnabled(false);
      setSetupData(null);
      setShowDisable(false);
      setDisablePassword("");
      setDisableCode("");
      setMsg({ type: "success", text: "Two-factor authentication disabled." });
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-4xl border border-border p-8 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold font-heading">Two-Factor Authentication</h2>
      </div>

      {msg.text && (
        <div className={`flex items-center gap-2 p-4 rounded-xl text-sm font-medium ${msg.type === "error" ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}`}>
          {msg.type === "error" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {isEnabled && !showDisable && (
        <div className="space-y-3">
          <p className="text-sm text-foreground/60">
            Two-factor authentication is currently <strong className="text-emerald-500">enabled</strong> on
            your account. You&apos;ll be asked for a code from your authenticator app each time you log in.
          </p>
          <button
            type="button"
            onClick={() => setShowDisable(true)}
            className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            Disable Two-Factor Authentication
          </button>
        </div>
      )}

      {isEnabled && showDisable && (
        <form onSubmit={disable2fa} className="space-y-4">
          <p className="text-sm text-foreground/60">
            Confirm your password (or a current authentication code, if this account has no password) to disable 2FA.
          </p>
          <input
            type="password"
            placeholder="Current password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
          />
          <input
            type="text"
            placeholder="Or: 6-digit code / backup code"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 px-6 py-3 bg-red-500 text-white font-black rounded-2xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {busy ? "Disabling..." : "Confirm Disable"}
            </button>
            <button
              type="button"
              onClick={() => setShowDisable(false)}
              className="px-6 py-3 bg-foreground/5 font-bold rounded-2xl hover:bg-foreground/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!isEnabled && !setupData && (
        <div className="space-y-3">
          <p className="text-sm text-foreground/60">
            Add an extra layer of security to your account using an authenticator app (Google Authenticator,
            Authy, 1Password, etc.).
          </p>
          <button
            type="button"
            onClick={startSetup}
            disabled={busy}
            className="px-6 py-3 bg-foreground text-background font-black rounded-2xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {busy ? "Starting..." : "Set Up Two-Factor Authentication"}
          </button>
        </div>
      )}

      {!isEnabled && setupData && (
        <form onSubmit={confirmSetup} className="space-y-5">
          <div>
            <p className="text-sm text-foreground/60 mb-2">
              Scan this QR code in your authenticator app, or enter the code manually:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image can't optimize this */}
            <img
              src={setupData.qrCodeDataUrl}
              alt="Two-factor authentication QR code"
              width={200}
              height={200}
              className="rounded-xl border border-border mb-3"
            />
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-4 py-3 font-mono text-sm break-all">
              {setupData.secret}
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(setupData.secret)}
                aria-label="Copy secret"
                className="ml-auto text-foreground/40 hover:text-foreground shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm text-foreground/60 mb-2">
              Save these one-time backup codes somewhere safe. Each can be used once if you lose access to
              your authenticator app:
            </p>
            <div className="grid grid-cols-2 gap-2 bg-background border border-border rounded-xl p-4 font-mono text-xs">
              {setupData.backupCodes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="confirmCode" className="block text-sm font-bold text-foreground mb-2">
              Enter the 6-digit code from your app to confirm
            </label>
            <input
              id="confirmCode"
              type="text"
              required
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              placeholder="123456"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full px-6 py-4 bg-foreground text-background font-black rounded-2xl hover:shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {busy ? "Confirming..." : "Confirm & Enable"}
          </button>
        </form>
      )}
    </div>
  );
}
