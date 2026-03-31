"use client";

import { useAuth } from "@/lib/AuthContext";
import { SYSTEM_ADMIN_EMAILS } from "@/lib/constants/auth";
import { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, 
  Settings2, 
  Mail,
  HardDrive,
  Search,
  Lock,
  Database,
  Save,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Activity,
  CreditCard,
  History,
  User as UserIcon,
  ArrowRight
} from "lucide-react";

const maskValue = (key: string, value: any) => {
  if (value === undefined || value === null) return "n/a";
  const str = String(value);
  const sensitiveKeys = ["secret", "key", "token", "password", "auth", "dsn"];
  const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
  
  if (isSensitive && str.length > 8) {
    return `${str.substring(0, 4)}••••${str.substring(str.length - 4)}`;
  }
  if (isSensitive) return "••••••••";
  return str;
};

interface Setting {
  key: string;
  value: string;
  description?: string | null;
}

export default function SystemSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [platformSettings, setPlatformSettings] = useState<Setting[]>([]);
  const [siteSettings, setSiteSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [activeTab, setActiveTab] = useState("communications");
  const [dbStats, setDbStats] = useState<any>(null);

  // ─── Whitelist Security Check ──────────────────────────
  const isWhitelisted = user && SYSTEM_ADMIN_EMAILS.includes(user.email);

  const fetchData = useCallback(async () => {
    if (!isWhitelisted) return;
    try {
      const res = await fetch("/api/admin/settings/system");
      if (res.ok) {
        const data = await res.json();
        setPlatformSettings(data.platform);
        setSiteSettings(data.site);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isWhitelisted]);

  const fetchAuditLogs = async (cursor?: string) => {
    if (isLogsLoading || (!hasMoreLogs && cursor)) return;
    setIsLogsLoading(true);
    try {
      const url = cursor 
        ? `/api/admin/settings/system/audit?cursor=${cursor}` 
        : "/api/admin/settings/system/audit";
        
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.logs) {
        if (cursor) {
          setAuditLogs(prev => [...prev, ...data.logs]);
        } else {
          setAuditLogs(data.logs);
        }
        setNextCursor(data.nextCursor);
        setHasMoreLogs(data.hasMore);
      }
    } catch (error) {
      console.error("Audit log fetch error:", error);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const handleAuditScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (hasMoreLogs && !isLogsLoading && nextCursor) {
        fetchAuditLogs(nextCursor);
      }
    }
  };

  useEffect(() => {
    if (activeTab === "audit") {
      setAuditLogs([]);
      setNextCursor(null);
      setHasMoreLogs(true);
      fetchAuditLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch DB stats when the database tab is active
  useEffect(() => {
    if (activeTab === "database" && isWhitelisted) {
      fetch("/api/admin/settings/system/database/stats")
        .then(res => res.json())
        .then(data => setDbStats(data))
        .catch(err => console.error("Stats fetch error:", err));
    }
  }, [activeTab, isWhitelisted]);

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: platformSettings,
          site: siteSettings,
        }),
      });

      if (res.ok) {
        alert("Settings updated successfully! 🏔️");
      } else {
        alert("Failed to update settings. Check console.");
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (type: "PLATFORM" | "SITE", key: string, value: string) => {
    if (type === "PLATFORM") {
      setPlatformSettings(prev => {
        const exists = prev.some(s => s.key === key);
        if (exists) return prev.map(s => s.key === key ? { ...s, value } : s);
        return [...prev, { key, value }];
      });
    } else {
      setSiteSettings(prev => {
        const exists = prev.some(s => s.key === key);
        if (exists) return prev.map(s => s.key === key ? { ...s, value } : s);
        return [...prev, { key, value }];
      });
    }
  };

  const getVal = (type: "PLATFORM" | "SITE", key: string) => {
    const list = type === "PLATFORM" ? platformSettings : siteSettings;
    return list.find(s => s.key === key)?.value || "";
  };

  if (authLoading || (isWhitelisted && isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-foreground/50 animate-pulse font-medium">Establishing secure connection...</p>
      </div>
    );
  }

  if (!isWhitelisted) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-heading font-black mb-4">Access Denied</h1>
        <p className="text-foreground/60 leading-relaxed mb-8">
          This zone is restricted to whitelisted project owners. Your account <span className="font-mono text-primary bg-primary/5 px-2 py-0.5 rounded">{user?.email}</span> does not have the clearance required for system-level modifications.
        </p>
        <div className="p-4 bg-foreground/5 rounded-2xl border border-border inline-flex items-center gap-2 text-sm text-foreground/50">
          <AlertTriangle className="w-4 h-4" /> Logged security attempt level: Alpha-9
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "communications", name: "Communications", icon: Mail },
    { id: "media", name: "Media Cloud", icon: HardDrive },
    { id: "seo", name: "Site Identity & SEO", icon: Search },
    { id: "finance", name: "Finance & Payments", icon: CreditCard },
    { id: "security", name: "Security & Ops", icon: Lock },
    { id: "database", name: "Database & Snapshots", icon: Database },
    { id: "audit", name: "Audit History", icon: History },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs mb-2">
            <Settings2 className="w-4 h-4" /> System Governance
          </div>
          <h1 className="text-4xl font-heading font-black">Command Center</h1>
          <p className="text-foreground/50 text-lg">Master dials for Param Adventures platform infrastructure.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (globalThis.confirm?.("CRITICAL: Are you sure you want to RESTORE ALL DEFAULT SETTINGS? This will overwrite your current configuration including API keys. This action cannot be undone.")) {
                setIsSaving(true);
                try {
                  const res = await fetch("/api/admin/settings/system/reset", { method: "POST" });
                  if (res.ok) {
                    globalThis.alert?.("Factory defaults restored! 🏔️ Updating UI...");
                    await fetchData();
                  } else {
                    globalThis.alert?.("Failed to reset. Check console.");
                  }
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsSaving(false);
                }
              }
            }}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-4 bg-foreground/5 text-foreground/60 rounded-2xl font-bold hover:bg-red-500/10 hover:text-red-500 transition-all disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Restore Defaults
          </button>

          <button
            onClick={handleUpdate}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-primary/20"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? "Saving Config..." : "Commit Changes"}
          </button>
        </div>
      </div>

      {/* Custom Alert */}
      <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/20 text-amber-600 rounded-2xl">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">Caution</p>
          <p className="text-sm opacity-90 leading-relaxed">
            Modifying these settings impacts core platform stability. Always perform a <strong>Manual Snapshot</strong> in the Database tab before making large configuration changes.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                  : "text-foreground/60 hover:bg-foreground/5"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? "" : "text-foreground/30"}`} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-foreground/[0.02] border border-border rounded-3xl p-8 min-h-[500px]">
          {/* Communications Tab */}
          {activeTab === "communications" && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
              <SectionTitle 
                title="Email Strategy" 
                subtitle="Configure the multi-channel email delivery engine with automatic failsafe." 
                icon={Mail} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="Primary Provider"
                  value={getVal("PLATFORM", "email_provider")}
                  onChange={(v: string) => updateSetting("PLATFORM", "email_provider", v)}
                  type="select"
                  options={[
                    { label: "Zoho API (HTTPS)", value: "ZOHO_API" },
                    { label: "Zoho SMTP (Traditional)", value: "ZOHO_SMTP" },
                    { label: "Resend API (Cloud)", value: "RESEND" },
                  ]}
                  description="Choose ZOHO_API for Render environments to bypass port blocks."
                />
                <InputGroup
                  label="Sender Identity (From)"
                  value={getVal("PLATFORM", "smtp_from")}
                  onChange={(v: string) => updateSetting("PLATFORM", "smtp_from", v)}
                  placeholder="Param Adventures <booking@paramadventures.in>"
                />
              </div>

              {/* Dynamic Provider Fields */}
              <div className="p-8 bg-foreground/5 rounded-3xl space-y-6 border border-border/50">
                <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> 
                  {getVal("PLATFORM", "email_provider").replace("_", " ")} Credentials
                </h4>

                {getVal("PLATFORM", "email_provider") === "ZOHO_SMTP" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                      label="SMTP Host"
                      value={getVal("PLATFORM", "smtp_host")}
                      onChange={(v: string) => updateSetting("PLATFORM", "smtp_host", v)}
                    />
                    <InputGroup
                      label="SMTP Port"
                      value={getVal("PLATFORM", "smtp_port")}
                      onChange={(v: string) => updateSetting("PLATFORM", "smtp_port", v)}
                    />
                    <InputGroup
                      label="SMTP User"
                      value={getVal("PLATFORM", "smtp_user")}
                      onChange={(v: string) => updateSetting("PLATFORM", "smtp_user", v)}
                    />
                    <InputGroup
                      label="SMTP Password"
                      value={getVal("PLATFORM", "smtp_pass")}
                      onChange={(v: string) => updateSetting("PLATFORM", "smtp_pass", v)}
                      type="password"
                    />
                  </div>
                )}

                {getVal("PLATFORM", "email_provider") === "ZOHO_API" && (
                  <InputGroup
                    label="ZeptoMail API Key"
                    value={getVal("PLATFORM", "zoho_api_key")}
                    onChange={(v: string) => updateSetting("PLATFORM", "zoho_api_key", v)}
                    type="password"
                    description="Enter your Zoho ZeptoMail 'Send Mail' API key."
                  />
                )}

                {getVal("PLATFORM", "email_provider") === "RESEND" && (
                  <InputGroup
                    label="Resend API Key"
                    value={getVal("PLATFORM", "resend_api_key")}
                    onChange={(v: string) => updateSetting("PLATFORM", "resend_api_key", v)}
                    type="password"
                  />
                )}
              </div>

              <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm italic">Connectivity Test</h4>
                  <p className="text-xs text-foreground/50">Send a test email using the currently SAVED settings.</p>
                </div>
                <button 
                  onClick={async () => {
                    const email = globalThis.prompt?.("Enter recipient email for test:");
                    if (email) {
                      try {
                        const res = await fetch("/api/admin/settings/system/test-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ to: email }),
                        });
                        if (res.ok) globalThis.alert?.("Test email sent! 🏔️");
                        else globalThis.alert?.("Failed to send test email. Check logs.");
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" /> Send Test Email
                </button>
              </div>
            </div>
          )}



          {activeTab === "media" && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
              <SectionTitle 
                title="Media Storage Cloud" 
                subtitle="Configure where your photos and videos are stored." 
                icon={HardDrive} 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="Active Infrastructure"
                  value={getVal("PLATFORM", "media_provider")}
                  onChange={(v: string) => updateSetting("PLATFORM", "media_provider", v)}
                  type="select"
                  options={[
                    { label: "AWS S3 (Self-Hosted)", value: "AWS_S3" },
                    { label: "Cloudinary (Managed)", value: "CLOUDINARY" },
                  ]}
                />
              </div>

              <div className="p-8 bg-foreground/5 rounded-3xl space-y-6 border border-border/50">
                <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> 
                  {getVal("PLATFORM", "media_provider") === "AWS_S3" ? "AWS S3" : "Cloudinary"} Credentials
                </h4>

                {getVal("PLATFORM", "media_provider") === "AWS_S3" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                      label="AWS Bucket Name"
                      value={getVal("PLATFORM", "s3_bucket")}
                      onChange={(v: string) => updateSetting("PLATFORM", "s3_bucket", v)}
                    />
                    <InputGroup
                      label="AWS Region"
                      value={getVal("PLATFORM", "s3_region")}
                      onChange={(v: string) => updateSetting("PLATFORM", "s3_region", v)}
                      placeholder="e.g. ap-south-1"
                    />
                    <InputGroup
                      label="AWS Access Key ID"
                      value={getVal("PLATFORM", "s3_access_key")}
                      onChange={(v: string) => updateSetting("PLATFORM", "s3_access_key", v)}
                      type="password"
                    />
                    <InputGroup
                      label="AWS Secret Access Key"
                      value={getVal("PLATFORM", "s3_secret_key")}
                      onChange={(v: string) => updateSetting("PLATFORM", "s3_secret_key", v)}
                      type="password"
                    />
                  </div>
                )}

                {getVal("PLATFORM", "media_provider") !== "AWS_S3" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputGroup
                      label="Cloud Name"
                      value={getVal("PLATFORM", "cloudinary_cloud_name")}
                      onChange={(v: string) => updateSetting("PLATFORM", "cloudinary_cloud_name", v)}
                    />
                    <InputGroup
                      label="API Key"
                      value={getVal("PLATFORM", "cloudinary_api_key")}
                      onChange={(v: string) => updateSetting("PLATFORM", "cloudinary_api_key", v)}
                      type="password"
                    />
                    <InputGroup
                      label="API Secret"
                      value={getVal("PLATFORM", "cloudinary_api_secret")}
                      onChange={(v: string) => updateSetting("PLATFORM", "cloudinary_api_secret", v)}
                      type="password"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "seo" && (
            <div className="space-y-8">
              <SectionTitle 
                title="Identity & Metrics" 
                subtitle="Visual branding and traffic measurement." 
                icon={Search} 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="Site Title"
                  value={getVal("SITE", "site_title")}
                  onChange={(v: string) => updateSetting("SITE", "site_title", v)}
                />
                <InputGroup
                  label="Google Analytics ID"
                  value={getVal("PLATFORM", "google_analytics_id")}
                  onChange={(v: string) => updateSetting("PLATFORM", "google_analytics_id", v)}
                  placeholder="G-XXXXXX"
                />
                <InputGroup
                  label="Support Phone"
                  value={getVal("SITE", "support_phone")}
                  onChange={(v: string) => updateSetting("SITE", "support_phone", v)}
                />
                <InputGroup
                  label="Support Email"
                  value={getVal("SITE", "support_email")}
                  onChange={(v: string) => updateSetting("SITE", "support_email", v)}
                />
              </div>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
              <SectionTitle 
                title="Payment Infrastructure" 
                subtitle="Configure the gateway used for processing trip payments." 
                icon={CreditCard} 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="Transaction Mode"
                  value={getVal("PLATFORM", "razorpay_mode")}
                  onChange={(v: string) => updateSetting("PLATFORM", "razorpay_mode", v)}
                  type="select"
                  options={[
                    { label: "Test Mode (Simulation)", value: "TEST" },
                    { label: "Live Mode (Production)", value: "LIVE" },
                  ]}
                />
              </div>

              <div className="p-8 bg-foreground/5 rounded-3xl space-y-6 border border-border/50">
                <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> 
                  Razorpay Credentials
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  />
                  <InputGroup
                    label="Webhook Secret"
                    value={getVal("PLATFORM", "razorpay_webhook_secret")}
                    onChange={(v: string) => updateSetting("PLATFORM", "razorpay_webhook_secret", v)}
                    type="password"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8">
              <SectionTitle 
                title="Security & Uptime" 
                subtitle="Access rules and maintenance controls." 
                icon={Lock} 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="Maintenance Mode"
                  value={getVal("PLATFORM", "maintenance_mode")}
                  onChange={(v: string) => updateSetting("PLATFORM", "maintenance_mode", v)}
                  type="select"
                  options={[
                    { label: "OFF (Site Online)", value: "false" },
                    { label: "ON (Emergency Lockdown)", value: "true" },
                  ]}
                />
                <InputGroup
                  label="Registration"
                  value={getVal("PLATFORM", "registration_enabled")}
                  onChange={(v: string) => updateSetting("PLATFORM", "registration_enabled", v)}
                  type="select"
                  options={[
                    { label: "Public Enabled", value: "true" },
                    { label: "Invite Only", value: "false" },
                  ]}
                />
                <InputGroup
                  label="Session TTL (Access)"
                  value={getVal("PLATFORM", "jwt_expiry")}
                  onChange={(v: string) => updateSetting("PLATFORM", "jwt_expiry", v)}
                  placeholder="e.g. 1h, 24h, 7d"
                  description="Initial validity of the secure access token."
                />
                <InputGroup
                  label="Refresh Token Validity"
                  value={getVal("PLATFORM", "refresh_token_expiry")}
                  onChange={(v: string) => updateSetting("PLATFORM", "refresh_token_expiry", v)}
                  placeholder="e.g. 7d, 30d"
                  description="Duration before a user is completely logged out."
                />
                <InputGroup
                  label="Global App URL"
                  value={getVal("SITE", "app_url")}
                  onChange={(v: string) => updateSetting("SITE", "app_url", v)}
                  placeholder="https://paramadventures.in"
                  description="Used for absolute links in sitemaps, metadata, and emails."
                />
              </div>

              <div className="mt-8 pt-8 border-t border-white/10 space-y-6">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />{" "}
                  Error Monitoring & Logs (Sentry)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputGroup
                    label="Monitoring Switch"
                    type="select"
                    value={getVal("PLATFORM", "sentry_enabled")}
                    onChange={(v: string) => updateSetting("PLATFORM", "sentry_enabled", v)}
                    options={[
                      { label: "ENABLED (Live Error Tracking)", value: "true" },
                      { label: "DISABLED (Local Logs Only)", value: "false" },
                    ]}
                    description="When disabled, errors are logged to the console but not sent to Sentry.io."
                  />
                  <InputGroup
                    label="Sentry Environment"
                    type="select"
                    value={getVal("PLATFORM", "sentry_environment")}
                    onChange={(v: string) => updateSetting("PLATFORM", "sentry_environment", v)}
                    options={[
                      { label: "Production", value: "production" },
                      { label: "Staging", value: "staging" },
                      { label: "Development", value: "development" },
                    ]}
                    description="Tags your errors for easier filtering in the dashboard."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
              <SectionTitle 
                title="Infrastructure Audit Ledger" 
                subtitle="Track identity-linked changes to the platform's core infrastructure." 
                icon={History} 
              />

              <div className="bg-foreground/5 rounded-3xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border bg-foreground/[0.02] flex items-center justify-between">
                  <h3 className="font-heading font-bold text-lg">Platform Change History</h3>
                  <button 
                    onClick={() => fetchAuditLogs()}
                    className="p-2 hover:bg-foreground/10 rounded-xl transition-colors"
                  >
                    <Loader2 className={`w-4 h-4 ${isLogsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div 
                  className="divide-y divide-border max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                  onScroll={handleAuditScroll}
                >
                  {(() => {
                    if (isLogsLoading && auditLogs.length === 0) {
                      return (
                        <div className="p-20 text-center space-y-4">
                          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                          <p className="text-foreground/50">Retrieving secure logs...</p>
                        </div>
                      );
                    }

                    if (auditLogs.length === 0) {
                      return (
                        <div className="p-20 text-center text-foreground/30 italic">
                          No matching audit records found.
                        </div>
                      );
                    }

                    return auditLogs.map((log) => (
                      <div key={log.id} className="p-6 hover:bg-foreground/[0.01] transition-colors group">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Actor */}
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 overflow-hidden">
                              {log.actor?.avatarUrl ? (
                                <img src={log.actor.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <UserIcon className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm leading-none mb-1 text-white">{log.actor?.name || "System"}</p>
                              <p className="text-xs text-foreground/50">{log.actor?.email || "internal action"}</p>
                            </div>
                          </div>

                          {/* Action */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                                {log.action.replace("UPDATE_", "")}
                              </span>
                              <span className="text-sm font-mono text-primary font-bold">
                                {log.targetId}
                              </span>
                              <span className="text-[10px] text-foreground/30 font-medium ml-auto">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>

                            {/* Diff */}
                            {log.metadata && (log.metadata.from !== undefined || log.metadata.to !== undefined) && (
                              <div className="flex items-center gap-4 py-2 px-4 rounded-xl bg-black/20 border border-white/5 text-sm">
                                <div className="flex-1 truncate text-red-400/80 line-through font-mono text-xs">
                                  {maskValue(log.targetId, log.metadata.from)}
                                </div>
                                <ArrowRight className="w-4 h-4 text-foreground/20 flex-shrink-0" />
                                <div className="flex-1 truncate text-green-400 font-mono text-xs font-bold">
                                  {maskValue(log.targetId, log.metadata.to)}
                                </div>
                              </div>
                            )}

                            {log.metadata?.ip && (
                              <p className="text-[10px] text-foreground/20 font-mono">IP: {log.metadata.ip}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}

                  {isLogsLoading && auditLogs.length > 0 && (
                    <div className="p-6 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" />
                    </div>
                  )}

                  {!hasMoreLogs && auditLogs.length > 0 && (
                    <div className="p-6 text-center text-[10px] text-foreground/20 font-medium uppercase tracking-widest whitespace-nowrap">
                      End of Audit Trail
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Database Tab */}
          {activeTab === "database" && (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
              <SectionTitle 
                title="Data Sovereignty" 
                subtitle="Monitor platform health and download secure data archives." 
                icon={Database} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label="Database Status" 
                  value={dbStats?.status === "HEALTHY" ? "Healthy" : "Fetching..."} 
                  color={dbStats?.status === "HEALTHY" ? "text-green-500" : "text-foreground/30"} 
                />
                <StatCard label="Total Bookings" value={dbStats?.stats?.bookings?.toString() || "..."} />
                <StatCard label="Registered Users" value={dbStats?.stats?.users?.toString() || "..."} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-foreground/5 rounded-3xl border border-border/50 space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                    <Database className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-heading">Manual Snapshot</h4>
                  <p className="text-sm text-foreground/50 leading-relaxed italic">
                    Generate a full JSON archive containing all Experiences, Bookings, Users, and Transactions. Use this for offline backups or migrations.
                  </p>
                  <button 
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        const res = await fetch("/api/admin/settings/system/database/snapshot");
                        if (res.ok) {
                          const blob = await res.blob();
                          const url = globalThis.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `param_adventures_backup_${new Date().toISOString().split('T')[0]}.json`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          globalThis.URL.revokeObjectURL(url);
                        } else {
                          globalThis.alert?.("Failed to generate snapshot.");
                        }
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-foreground text-background rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-foreground/10"
                  >
                    <Save className="w-4 h-4" /> Download Snapshot
                  </button>
                </div>

                <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-bold font-heading">Infrastructure Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b border-primary/10">
                      <span className="text-foreground/50 italic">Total Experiences</span>
                      <span className="font-bold">{dbStats?.stats?.experiences || "..."}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-primary/10">
                      <span className="text-foreground/50 italic">Audit Log Entries</span>
                      <span className="font-bold">{dbStats?.stats?.auditLogs || "..."}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2">
                    <span className="text-foreground/50 italic">Platform Latency</span>
                    <span className="text-green-500 font-bold">Stable</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, icon: Icon }: Readonly<{ title: string; subtitle: string; icon: any }>) {
  return (
    <div className="space-y-1 mb-8">
      <div className="flex items-center gap-2 text-primary font-bold text-sm">
        <Icon className="w-4 h-4" /> {title}
      </div>
      <p className="text-foreground/50 font-medium">{subtitle}</p>
    </div>
  );
}

function InputGroup({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  options = [], 
  placeholder, 
  description 
}: Readonly<{ 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  type?: string; 
  options?: { label: string; value: string }[]; 
  placeholder?: string; 
  description?: string; 
}>) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-foreground/40 uppercase tracking-widest pl-1">{label}</label>
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 bg-background border border-border rounded-2xl px-4 focus:ring-2 focus:ring-primary/20 appearance-none outline-none font-medium transition-all"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 bg-background border border-border rounded-2xl px-4 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
        />
      )}
      {description && <p className="text-[10px] text-foreground/40 pl-2 leading-relaxed">{description}</p>}
    </div>
  );
}

function StatCard({ label, value, color = "text-foreground" }: Readonly<{ label: string; value: string; color?: string }>) {
  return (
    <div className="p-6 bg-background border border-border rounded-2xl space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}
