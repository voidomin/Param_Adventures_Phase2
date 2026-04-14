import React from "react";
import { Database, Activity as ActivityIcon, Search, ArrowRight } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function SystemTab(props: Readonly<TabProps>) {
  const { getVal, updateSetting } = props;
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    const isConfirmed = globalThis.window.confirm(
      "SECURITY WARNING: You are about to export all platform data including experiences, bookings, and payments. While credentials are redacted, this file contains sensitive business data. Do you wish to proceed?"
    );

    if (!isConfirmed) return;

    setIsExporting(true);
    try {
      const res = await fetch("/api/admin/settings/system/database/snapshot");
      
      if (res.status === 429) {
        const errorData = await res.json();
        globalThis.alert(errorData.error);
        return;
      }

      if (!res.ok) throw new Error("Failed to generate snapshot");
      
      const blob = await res.blob();
      const url = globalThis.window.URL.createObjectURL(blob);
      const a = globalThis.document.createElement("a");
      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      
      a.href = url;
      a.download = `param_snapshot_${timestamp}.json`;
      globalThis.document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      globalThis.alert("Critical error: Failed to download database snapshot.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-12 animate-in slide-in-from-left-4 duration-300">
      <SectionTitle 
        title="Core Platform" 
        subtitle="Manage foundational application properties and statutory site identities." 
        icon={Database} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-foreground/5 border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ActivityIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Tracking Status</p>
              <p className="text-xs text-foreground/50">
                {(getVal("PLATFORM", "google_analytics_id") || "").startsWith('G-') ? 'Script is ACTIVE and injecting tags' : 'No valid ID found'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-foreground/5 border border-border flex items-center justify-between">
           <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Sitemap Pulse</p>
              <a href="/sitemap.xml" target="_blank" className="text-xs text-primary hover:underline flex items-center gap-1">
                View generated sitemap <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 bg-foreground/[0.02] border border-border rounded-[32px] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Database className="w-4 h-4" /> 
              Platform Management
            </h4>
            <p className="text-xs text-foreground/50 font-medium max-w-md">
              Export all critical platform data (Experiences, Bookings, Settings) as a secure JSON archive. Sensitive credentials will be redacted. 
            </p>
          </div>
          <button 
            disabled={isExporting}
            onClick={handleExport}
            className={`px-8 py-4 bg-foreground text-background rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-black/10 flex items-center gap-2 group ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
          >
            <Database className={`w-4 h-4 ${isExporting ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
            {isExporting ? 'Generatings Snapshot...' : 'Download Data Snapshot'}
          </button>
        </div>
        <p className="text-[10px] text-red-500/60 font-medium flex items-center gap-1.5 px-1 uppercase tracking-wider">
          <ActivityIcon className="w-3 h-3" />
          Hazard: Archive contains sensitive PII. Handle and store with extreme care.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputGroup
          label="App URL (Base Domain)"
          value={getVal("PLATFORM", "app_url")}
          onChange={(v: string) => updateSetting("PLATFORM", "app_url", v)}
          placeholder="https://paramadventures.in"
        />
        <InputGroup
          label="Site Logo (Favicon URL)"
          value={getVal("SITE", "site_favicon_url")}
          onChange={(v: string) => updateSetting("SITE", "site_favicon_url", v)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/20 pt-8">
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
  );
}
