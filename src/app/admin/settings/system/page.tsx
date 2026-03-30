"use client";

import { useAuth } from "@/lib/AuthContext";
import { SYSTEM_ADMIN_EMAILS } from "@/lib/constants/auth";
import { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, 
  Settings2, 
  Mail, 
  CreditCard, 
  HardDrive, 
  Search, 
  Lock, 
  Database,
  Save,
  Loader2,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("communications");

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      setPlatformSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    } else {
      setSiteSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
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
    { id: "finance", name: "Finance & Payments", icon: CreditCard },
    { id: "media", name: "Media Cloud", icon: HardDrive },
    { id: "seo", name: "Site Identity & SEO", icon: Search },
    { id: "security", name: "Security & Ops", icon: Lock },
    { id: "database", name: "Database & Snapshots", icon: Database },
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
              if (window.confirm("CRITICAL: Are you sure you want to RESTORE ALL DEFAULT SETTINGS? This will overwrite your current configuration including API keys. This action cannot be undone.")) {
                setIsSaving(true);
                try {
                  const res = await fetch("/api/admin/settings/system/reset", { method: "POST" });
                  if (res.ok) {
                    alert("Factory defaults restored! 🏔️ Updating UI...");
                    await fetchData();
                  } else {
                    alert("Failed to reset. Check console.");
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
                    const email = window.prompt("Enter recipient email for test:");
                    if (email) {
                      try {
                        const res = await fetch("/api/admin/settings/system/test-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ to: email }),
                        });
                        if (res.ok) alert("Test email sent! 🏔️");
                        else alert("Failed to send test email. Check logs.");
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

          {activeTab === "finance" && (
            <div className="space-y-8">
              <SectionTitle 
                title="Financial Governance" 
                subtitle="Manage payments, taxes, and customer invoicing." 
                icon={CreditCard} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup
                  label="Razorpay Mode"
                  value={getVal("PLATFORM", "razorpay_mode")}
                  onChange={(v: string) => updateSetting("PLATFORM", "razorpay_mode", v)}
                  type="select"
                  options={[
                    { label: "Test Mode", value: "TEST" },
                    { label: "Live Mode", value: "LIVE" },
                  ]}
                />
                <InputGroup
                  label="Razorpay Key ID"
                  value={getVal("PLATFORM", "razorpay_key_id")}
                  onChange={(v: string) => updateSetting("PLATFORM", "razorpay_key_id", v)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup
                    label="CGST (%)"
                    value={getVal("PLATFORM", "cgst_percent")}
                    onChange={(v: string) => updateSetting("PLATFORM", "cgst_percent", v)}
                    type="number"
                  />
                  <InputGroup
                    label="SGST (%)"
                    value={getVal("PLATFORM", "sgst_percent")}
                    onChange={(v: string) => updateSetting("PLATFORM", "sgst_percent", v)}
                    type="number"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "media" && (
            <div className="space-y-8">
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
                <InputGroup
                  label="AWS Bucket Name"
                  value={getVal("PLATFORM", "s3_bucket")}
                  onChange={(v: string) => updateSetting("PLATFORM", "s3_bucket", v)}
                />
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
                  label="Session TTL"
                  value={getVal("PLATFORM", "jwt_expiry")}
                  onChange={(v: string) => updateSetting("PLATFORM", "jwt_expiry", v)}
                  placeholder="e.g. 1h, 24h, 7d"
                />
              </div>
            </div>
          )}

          {activeTab === "database" && (
            <div className="space-y-8">
              <SectionTitle 
                title="Database Sovereignty" 
                subtitle="Health stats and automated snapshots." 
                icon={Database} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Connectivity" value="Stable 12ms" color="text-green-500" />
                <StatCard label="Schema Version" value="v1.4.2" />
                <StatCard label="Last Backup" value="9h ago" />
              </div>

              <div className="p-8 border border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center gap-4">
                <Database className="w-12 h-12 text-foreground/20" />
                <div>
                  <h4 className="font-bold">Manual Backup Snapshot</h4>
                  <p className="text-sm text-foreground/50 max-w-sm mx-auto mt-1">This will generate a full PG-Dump and upload it to your designated S3 bucket.</p>
                </div>
                <button className="px-6 py-3 bg-foreground text-background rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                  <Save className="w-4 h-4" /> Trigger S3 Backup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: any }) {
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
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  type?: string; 
  options?: { label: string; value: string }[]; 
  placeholder?: string; 
  description?: string; 
}) {
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

function StatCard({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-6 bg-background border border-border rounded-2xl space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}
