"use client";

import React, { useState } from "react";
import { 
  Puzzle, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  ShieldCheck, 
  Zap,
  Loader2,
  ExternalLink
} from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function IntegrationsTab({ getVal, updateSetting }: TabProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: "" });

  const handleVerifySentry = async () => {
    const dsn = getVal("PLATFORM", "sentry_dsn");
    if (!dsn) {
      setVerifyStatus({ type: 'error', message: "Please enter a Sentry DSN first!" });
      return;
    }

    setIsVerifying(true);
    setVerifyStatus({ type: null, message: "" });

    try {
      const res = await fetch("/api/admin/settings/monitoring/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dsn }),
      });

      const data = await res.json();
      if (res.ok) {
        setVerifyStatus({ 
          type: 'success', 
          message: "Heartbeat sent! Check your Sentry dashboard for the 'Verification Heartbeat' message." 
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

    const gaId = getVal("PLATFORM", "google_analytics_id");
  const isGAEnabled = getVal("PLATFORM", "google_analytics_enabled") !== "false";
  
  const isSentryEnabled = getVal("PLATFORM", "sentry_enabled") === "true";
  
  const pixelId = getVal("PLATFORM", "meta_pixel_id");
  const isPixelEnabled = getVal("PLATFORM", "meta_pixel_enabled") === "true";
  
  const clarityId = getVal("PLATFORM", "microsoft_clarity_id");
  const isClarityEnabled = getVal("PLATFORM", "microsoft_clarity_enabled") === "true";

  // Helper for status badges to fix nested ternary lint warning
  const getStatusBadge = (enabled: boolean, hasId: boolean) => {
    if (!enabled) {
      return (
        <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-foreground/5 text-foreground/30">
          <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
          Disabled
        </div>
      );
    }
    
    if (hasId) {
      return (
        <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-green-500/10 text-green-500">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Active
        </div>
      );
    }

    return (
      <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-foreground/5 text-foreground/30">
        <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
        Missing ID
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-in slide-in-from-left-4 duration-300">
      <SectionTitle 
        title="Monitoring & Integrations" 
        subtitle="Connect third-party telemetry and tracking services to monitor platform health." 
        icon={Puzzle} 
      />

      {/* Google Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Google Analytics 4</h4>
              <p className="text-xs text-foreground/50 font-medium">Track user behavior and conversion events.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(isGAEnabled, !!gaId?.startsWith("G-"))}
            <button
                onClick={() => updateSetting("PLATFORM", "google_analytics_enabled", isGAEnabled ? "false" : "true")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    isGAEnabled ? 'bg-orange-500' : 'bg-foreground/10'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isGAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <InputGroup
            label="Measurement ID (G-XXXXXXXX)"
            value={gaId}
            onChange={(v) => updateSetting("PLATFORM", "google_analytics_id", v)}
            placeholder="G-ABC123XYZ"
          />
          <div className="pb-2">
            <a 
              href="https://analytics.google.com/" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
            >
              Open Analytics Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      {/* Meta Pixel Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Meta Pixel (Facebook)</h4>
              <p className="text-xs text-foreground/50 font-medium">Optimize ad delivery and measure cross-device conversions.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {getStatusBadge(isPixelEnabled, !!pixelId)}
             <button
                onClick={() => updateSetting("PLATFORM", "meta_pixel_enabled", isPixelEnabled ? "false" : "true")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    isPixelEnabled ? 'bg-blue-600' : 'bg-foreground/10'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPixelEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
          </div>
        </div>

        <InputGroup
          label="Pixel ID"
          value={pixelId}
          onChange={(v) => updateSetting("PLATFORM", "meta_pixel_id", v)}
          placeholder="123456789012345"
        />
      </div>

      <div className="h-px bg-border/50" />

      {/* Microsoft Clarity Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500">
              <Activity className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Microsoft Clarity</h4>
              <p className="text-xs text-foreground/50 font-medium">Free heatmaps and session recordings to understand user intent.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {getStatusBadge(isClarityEnabled, !!clarityId)}
             <button
                onClick={() => updateSetting("PLATFORM", "microsoft_clarity_enabled", isClarityEnabled ? "false" : "true")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    isClarityEnabled ? 'bg-teal-500' : 'bg-foreground/10'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isClarityEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
          </div>
        </div>

        <InputGroup
          label="Clarity Project ID"
          value={clarityId}
          onChange={(v) => updateSetting("PLATFORM", "microsoft_clarity_id", v)}
          placeholder="abcdefghij"
        />
      </div>

      <div className="h-px bg-border/50" />

      {/* Sentry Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Sentry Error Tracking</h4>
              <p className="text-xs text-foreground/50 font-medium">Full-stack error capture and performance monitoring.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {getStatusBadge(isSentryEnabled, !!getVal("PLATFORM", "sentry_dsn"))}
             <button
                onClick={() => updateSetting("PLATFORM", "sentry_enabled", isSentryEnabled ? "false" : "true")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    isSentryEnabled ? 'bg-indigo-500' : 'bg-foreground/10'
                }`}
              >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isSentryEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
          </div>
        </div>

        <div className="space-y-6">
          <InputGroup
            label="Sentry DSN"
            value={getVal("PLATFORM", "sentry_dsn")}
            onChange={(v) => updateSetting("PLATFORM", "sentry_dsn", v)}
            placeholder="https://key@sentry.io/project"
            type="password"
          />

          <div className="bg-foreground/[0.02] border border-border/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" /> 
                  Connectivity Verification
                </p>
                <p className="text-xs text-foreground/50 font-medium italic">
                  Sends a non-intrusive heartbeat message to verify your DSN is correct.
                </p>
              </div>
              <button
                onClick={handleVerifySentry}
                disabled={isVerifying || !isSentryEnabled}
                className="px-6 py-2.5 bg-foreground text-background rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale transition-all duration-300"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {isVerifying ? 'Verifying...' : 'Test Connection'}
              </button>
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
      </div>
    </div>
  );
}
