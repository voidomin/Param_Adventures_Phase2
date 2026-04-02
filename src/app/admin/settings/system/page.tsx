"use client";

import * as Sentry from "@sentry/nextjs";
import { useAuth } from "@/lib/AuthContext";
import { SYSTEM_ADMIN_EMAILS } from "@/lib/constants/auth";
import { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, 
  Settings2, 
  Mail,
  Lock,
  Database,
  Save,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  History,
  Image as ImageIcon,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import { getMediaUrl } from "@/lib/media/media-gateway";

// Modular Components
import { StatCard } from "@/components/admin/settings/Common";
import CommunicationsTab from "@/components/admin/settings/CommunicationsTab";
import FinanceTab from "@/components/admin/settings/FinanceTab";
import MediaTab from "@/components/admin/settings/MediaTab";
import SecurityTab from "@/components/admin/settings/SecurityTab";
import SystemTab from "@/components/admin/settings/SystemTab";

const maskValue = (key: string, value: string | number | undefined | null) => {
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
}

interface AuditLog {
  id: string;
  action: string;
  targetId: string;
  timestamp: string;
  actor?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  metadata?: {
    from?: string | number | null;
    to?: string | number | null;
    ip?: string;
  };
}

interface DBStats {
  stats: {
    users: number;
    experiences: number;
    auditLogs: number;
  };
}

export default function SystemSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [platformSettings, setPlatformSettings] = useState<Setting[]>([]);
  const [siteSettings, setSiteSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [activeTab, setActiveTab] = useState("communications");
  const [dbStats, setDbStats] = useState<DBStats | null>(null);

  const isWhitelisted = user && SYSTEM_ADMIN_EMAILS.includes(user.email);

  const fetchData = useCallback(async () => {
    if (!isWhitelisted) return;
    try {
      const res = await fetch("/api/admin/settings/system");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setPlatformSettings(data.platformSettings || []);
      setSiteSettings(data.siteSettings || []);
      setDbStats(data.dbStats || null);
    } catch (err) {
      Sentry.captureException(err);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isWhitelisted]);

  const fetchLogs = useCallback(async (cursor?: string) => {
    if (!isWhitelisted) return;
    setIsLogsLoading(true);
    try {
      const url = new URL("/api/admin/audit-logs", globalThis.origin);
      if (cursor) url.searchParams.set("cursor", cursor);
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (cursor) {
        setAuditLogs(prev => [...prev, ...data.logs]);
      } else {
        setAuditLogs(data.logs);
      }
      setNextCursor(data.nextCursor);
      setHasMoreLogs(!!data.nextCursor);
    } catch (err) {
      console.error("Audit log fetch error:", err);
    } finally {
      setIsLogsLoading(false);
    }
  }, [isWhitelisted]);

  useEffect(() => {
    if (isWhitelisted) {
      fetchData();
      fetchLogs();
    } else if (!authLoading && user) {
       setIsLoading(false);
    }
  }, [isWhitelisted, fetchData, fetchLogs, authLoading, user]);

  const updateSetting = (type: "PLATFORM" | "SITE", key: string, value: string) => {
    if (type === "PLATFORM") {
      setPlatformSettings(prev => {
        const index = prev.findIndex(s => s.key === key);
        if (index > -1) {
          const next = [...prev];
          next[index] = { ...next[index], value };
          return next;
        }
        return [...prev, { key, value }];
      });
    } else {
      setSiteSettings(prev => {
        const index = prev.findIndex(s => s.key === key);
        if (index > -1) {
          const next = [...prev];
          next[index] = { ...next[index], value };
          return next;
        }
        return [...prev, { key, value }];
      });
    }
  };

  const getVal = (type: "PLATFORM" | "SITE", key: string): string => {
    const list = type === "PLATFORM" ? platformSettings : siteSettings;
    return list.find(s => s.key === key)?.value || "";
  };

  const getAuditorAvatarUrl = (path?: string) => {
    if (!path) return "";
    return getMediaUrl(
      path, 
      getVal("PLATFORM", "media_provider") as "CLOUDINARY" | "AWS_S3" | "LOCAL", 
      {
        cloudinaryCloudName: getVal("PLATFORM", "cloudinary_cloud_name"),
        s3Bucket: getVal("PLATFORM", "s3_bucket"),
        s3Region: getVal("PLATFORM", "s3_region"),
      },
      {}
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsMap: Record<string, string> = {};
      platformSettings.forEach(s => settingsMap[s.key] = s.value);
      siteSettings.forEach(s => settingsMap[s.key] = s.value);

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ settings: settingsMap }),
      });

      if (res.ok) {
        await fetchLogs();
        globalThis.alert?.("Settings updated successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isWhitelisted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="p-6 bg-red-500/10 rounded-full text-red-500 animate-bounce">
          <ShieldAlert className="w-16 h-16" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black font-heading">Sanctum Access Required</h1>
          <p className="text-foreground/60 max-w-md mx-auto">
            You have reached the Command Center. Only verified Pathfinders with cryptographic clearance may enter this domain.
          </p>
        </div>
        <button 
          onClick={() => globalThis.location.href = "/dashboard"}
          className="px-8 py-3 bg-foreground text-background rounded-2xl font-bold hover:scale-105 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "communications", label: "Communications", icon: Mail },
    { id: "finance", label: "Finance & Taxation", icon: CreditCard },
    { id: "media", label: "Media Storage", icon: ImageIcon },
    { id: "security", label: "Security & Keys", icon: Lock },
    { id: "system", label: "Core Platform", icon: Database },
    { id: "logs", label: "Audit Logs", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border/50">
          <div className="space-y-1">
            <h1 className="text-4xl font-black font-heading flex items-center gap-3">
              Command <span className="text-primary">Center</span>
              <div className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase tracking-tighter font-black">Admin Only</div>
            </h1>
            <p className="text-foreground/50 font-medium">Platform architecture and statutory configuration dashboard.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
              onClick={() => fetchData()}
              disabled={isLoading}
              className="p-3 bg-secondary text-secondary-foreground rounded-2xl hover:scale-105 active:scale-95 transition-all border border-border"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 group"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
              Apply Changes
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Navigation Sidebar */}
          <nav className="lg:col-span-3 space-y-2 sticky top-8">
            {tabs.map((tab) => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all text-sm group ${
                     isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                      : 'hover:bg-foreground/5 text-foreground/60'
                   }`}
                 >
                   <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} />
                   {tab.label}
                 </button>
               );
            })}

            <div className="mt-8 pt-8 border-t border-border/50">
              <div className="p-6 bg-foreground/[0.02] rounded-3xl border border-border/50 space-y-4">
                 <div className="flex items-center gap-3 text-sm font-bold opacity-40">
                   <Settings2 className="w-4 h-4" /> Machine Status
                 </div>
                 <div className="space-y-3">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] uppercase font-black tracking-widest opacity-30">Database</span>
                       <span className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> ONLINE
                       </span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] uppercase font-black tracking-widest opacity-30">Cluster</span>
                       <span className="text-[10px] font-bold">Region: Bombay</span>
                    </div>
                 </div>
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="lg:col-span-9 bg-card border border-border rounded-[40px] shadow-2xl shadow-black/5 overflow-hidden">
            <div className="p-8 md:p-12">
              
              {activeTab === "communications" && <CommunicationsTab getVal={getVal} updateSetting={updateSetting} />}
              {activeTab === "finance" && <FinanceTab getVal={getVal} updateSetting={updateSetting} />}
              {activeTab === "media" && <MediaTab getVal={getVal} updateSetting={updateSetting} />}
              {activeTab === "security" && <SecurityTab getVal={getVal} updateSetting={updateSetting} />}
              {activeTab === "system" && <SystemTab getVal={getVal} updateSetting={updateSetting} />}

              {activeTab === "logs" && (
                <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
                  <div className="flex items-center justify-between pb-4 border-b border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <History className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold font-heading">Audit Trail</h3>
                        <p className="text-sm text-foreground/50">Cryptographic log of all architectural mutations.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="group p-5 rounded-2xl border border-border hover:border-primary/30 transition-all hover:bg-primary/[0.01]">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-foreground/5 border border-border overflow-hidden relative group-hover:scale-110 transition-transform">
                              {log.actor?.avatarUrl && (
                                <Image 
                                  src={getAuditorAvatarUrl(log.actor.avatarUrl)} 
                                  alt="" 
                                  fill
                                  className="object-cover"
                                />
                              )}
                              {!log.actor?.avatarUrl && <UserIcon className="w-full h-full p-2.5 text-foreground/20" />}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-black uppercase tracking-widest text-primary">{log.action.replace("_", " ")}</p>
                              <p className="text-sm font-bold">{log.actor?.name || "System Automated"} <span className="text-foreground/40 font-medium">did an action on</span> {log.targetId}</p>
                              <p className="text-[10px] text-foreground/30 font-medium">{new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: 'full', timeStyle: 'short' })}</p>
                            </div>
                          </div>
                          
                          {log.metadata?.to !== undefined && (
                             <div className="text-right space-y-1">
                                <div className="px-3 py-1 rounded-lg bg-foreground/5 text-[10px] font-bold">
                                   Modified Value: <span className="text-primary">{maskValue(log.targetId, log.metadata.to)}</span>
                                </div>
                             </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {hasMoreLogs && (
                      <button 
                        onClick={() => fetchLogs(nextCursor!)}
                        disabled={isLogsLoading}
                        className="w-full py-4 text-sm font-bold text-foreground/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
                      >
                        {isLogsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Retrieve Older Mutations
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>

        {/* Global Infrastructure Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
           <StatCard label="Live Connections" value={String(dbStats?.stats?.users || "...")} color="text-blue-500" />
           <StatCard label="Architecture Health" value="OPTIMIZED" color="text-green-500" />
           <StatCard label="Mutations / Hour" value="4.2k" color="text-primary" />
        </div>

        <footer className="pt-12 pb-8 border-t border-border/20 text-center space-y-4">
           <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/20">
              <AlertTriangle className="w-3 h-3 text-orange-500" /> Administrative Override Mode Active
           </div>
           <p className="text-xs text-foreground/30 leading-relaxed font-medium">
             Changes made in this dashboard are applied globally to the Param Adventures infrastructure. <br />
             Ensure compliance with statutory tax guidelines before modifying the Revenue Engines.
           </p>
        </footer>

      </div>
    </div>
  );
}
