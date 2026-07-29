import React, { useState } from "react";
import { Lock, Settings2, Loader2, CheckCircle2, AlertCircle, CreditCard, Handshake } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (globalThis.window?.Razorpay !== undefined) {
      resolve(true);
      return;
    }
    const script = globalThis.document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    globalThis.document.body.appendChild(script);
  });
}

export default function SecurityTab(props: Readonly<TabProps>) {
  const { getVal, updateSetting } = props;
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: "" });

  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [accessCheckStatus, setAccessCheckStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: "" });

  const handleCheckAdminAccess = async () => {
    const allowlist = getVal("PLATFORM", "admin_ip_allowlist");

    setIsCheckingAccess(true);
    setAccessCheckStatus({ type: null, message: "" });

    try {
      const res = await fetch("/api/admin/settings/system/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ADMIN_IP_ALLOWLIST", config: { allowlist } }),
      });

      const data = await res.json();
      if (res.ok) {
        setAccessCheckStatus({ type: 'success', message: data.message });
      } else {
        setAccessCheckStatus({ type: 'error', message: data.error || "Check failed." });
      }
    } catch {
      setAccessCheckStatus({ type: 'error', message: "Network error during check." });
    } finally {
      setIsCheckingAccess(false);
    }
  };

  const handleVerifyRazorpay = async () => {
    const keyId = getVal("PLATFORM", "razorpay_key_id")?.trim();
    const keySecret = getVal("PLATFORM", "razorpay_key_secret")?.trim();

    if (!keyId || !keySecret) {
      setVerifyStatus({ type: 'error', message: "Key ID and Secret are required for verification!" });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus({ type: null, message: "" });

    try {
      const res = await fetch("/api/admin/settings/system/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "RAZORPAY", 
          config: { keyId, keySecret } 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setVerifyStatus({ 
          type: 'success', 
          message: data.message || "Razorpay keys verified successfully!" 
        });
      } else {
        setVerifyStatus({ type: 'error', message: data.error || "Verification failed." });
      }
    } catch {
      setVerifyStatus({ type: 'error', message: "Network error during verification." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLivePaymentTest = async () => {
    const keyId = getVal("PLATFORM", "razorpay_key_id")?.trim();
    const keySecret = getVal("PLATFORM", "razorpay_key_secret")?.trim();

    if (!keyId || !keySecret) {
      setVerifyStatus({ type: 'error', message: "Enter Key ID and Secret first to test payment." });
      return;
    }

    setIsProcessingPayment(true);
    setVerifyStatus({ type: null, message: "" });

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay checkout script.");
      }

      const res = await fetch("/api/admin/settings/system/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "RAZORPAY_ORDER", 
          config: { keyId, keySecret } 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create test order.");

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Command Center Test",
        description: "Live Flow Verification (₹1)",
        order_id: data.orderId,
        theme: { color: "#D4AF37" },
        handler: function (response: { razorpay_payment_id: string }) {
          setVerifyStatus({ 
            type: 'success', 
            message: `Payment successful! ID: ${response.razorpay_payment_id}. Your gateway is fully operational.` 
          });
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      const rzp = new globalThis.window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment test failed.";
      setVerifyStatus({ type: 'error', message });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
      <SectionTitle 
        title="Authentication & Payments" 
        subtitle="Configure identity providers and the Razorpay transaction engine." 
        icon={Lock} 
      />
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputGroup
            label="Razorpay Mode"
            value={getVal("PLATFORM", "razorpay_mode")}
            onChange={(v: string) => updateSetting("PLATFORM", "razorpay_mode", v)}
            type="select"
            options={[
              { label: "Test Mode (Sandbox)", value: "test" },
              { label: "Live Mode (Production)", value: "live" },
            ]}
          />
          <InputGroup
            label="Key ID"
            value={getVal("PLATFORM", "razorpay_key_id")}
            onChange={(v: string) => updateSetting("PLATFORM", "razorpay_key_id", v)}
            placeholder="rzp_test_..."
          />
          <InputGroup
            label="Key Secret"
            value={getVal("PLATFORM", "razorpay_key_secret")}
            onChange={(v: string) => updateSetting("PLATFORM", "razorpay_key_secret", v)}
            type="password"
            placeholder="••••••••••••••••"
          />
          <InputGroup
            label="Webhook Secret"
            value={getVal("PLATFORM", "razorpay_webhook_secret")}
            onChange={(v: string) => updateSetting("PLATFORM", "razorpay_webhook_secret", v)}
            type="password"
            placeholder="••••••••••••••••"
          />
        </div>

        {/* Razorpay Verification Tool */}
        <div className="bg-foreground/[0.02] border border-border/50 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold flex items-center gap-2">
                <Handshake className="w-4 h-4 text-primary" /> 
                Razorpay Connectivity
              </p>
              <p className="text-xs text-foreground/50 font-medium italic">
                Verify API keys with a handshake or trigger a ₹1 live payment test.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVerifyRazorpay}
                disabled={isVerifying || isProcessingPayment}
                className="px-6 py-2.5 bg-foreground/5 text-foreground rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-foreground/10 transition-all flex items-center gap-2 disabled:opacity-50 h-10 min-w-32 justify-center"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-4 h-4" />}
                Handshake
              </button>
              <button
                type="button"
                onClick={handleLivePaymentTest}
                disabled={isVerifying || isProcessingPayment}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 h-10 min-w-44 justify-center"
              >
                {isProcessingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                {isProcessingPayment ? 'Processing...' : 'Live Payment Test (₹1)'}
              </button>
            </div>
          </div>

          {verifyStatus.type && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300 ${
              verifyStatus.type === 'success' 
                ? 'bg-green-500/5 border-green-500/20 text-green-600' 
                : 'bg-red-500/5 border-red-500/20 text-red-600'
            }`}>
              {verifyStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <p className="text-xs font-bold leading-relaxed">{verifyStatus.message}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 bg-foreground/5 rounded-3xl space-y-6 border border-border/50">
        <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Identity & Session
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputGroup
            label="JWT Secret"
            value={getVal("PLATFORM", "jwt_secret")}
            onChange={(v: string) => updateSetting("PLATFORM", "jwt_secret", v)}
            type="password"
          />
          <InputGroup
             label="Session Lifetime (Hours)"
             value={getVal("PLATFORM", "session_lifetime_hrs")}
             onChange={(v: string) => updateSetting("PLATFORM", "session_lifetime_hrs", v)}
             placeholder="e.g. 168 (7 days)"
          />
        </div>
      </div>

      <div className="p-8 bg-foreground/5 rounded-3xl space-y-6 border border-border/50">
        <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Admin Access Control
        </h4>
        <InputGroup
          label="Admin IP Allowlist"
          value={getVal("PLATFORM", "admin_ip_allowlist")}
          onChange={(v: string) => updateSetting("PLATFORM", "admin_ip_allowlist", v)}
          placeholder="e.g. 203.0.113.4, 198.51.100.0/24"
          description="Comma-separated IPs or CIDR ranges allowed to reach /admin and /api/admin/*. Leave empty to allow any network — this is opt-in hardening, not on by default. Takes effect immediately, no redeploy needed."
        />

        <div className="bg-foreground/[0.02] border border-border/50 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold flex items-center gap-2">
                <Handshake className="w-4 h-4 text-primary" />
                Self-Lockout Check
              </p>
              <p className="text-xs text-foreground/50 font-medium italic">
                Confirms your own current network is in this list before you save — saving a list that excludes you would lock you out of the admin panel.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCheckAdminAccess}
              disabled={isCheckingAccess}
              className="px-6 py-2.5 bg-foreground/5 text-foreground rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-foreground/10 transition-all flex items-center gap-2 disabled:opacity-50 h-10 min-w-44 justify-center"
            >
              {isCheckingAccess ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-4 h-4" />}
              Check My Access
            </button>
          </div>

          {accessCheckStatus.type && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300 ${
              accessCheckStatus.type === 'success'
                ? 'bg-green-500/5 border-green-500/20 text-green-600'
                : 'bg-red-500/5 border-red-500/20 text-red-600'
            }`}>
              {accessCheckStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <p className="text-xs font-bold leading-relaxed">{accessCheckStatus.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
