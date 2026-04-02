import React from "react";
import { Database, Activity as ActivityIcon, Search, ArrowRight } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function SystemTab(props: TabProps) {
  const { getVal, updateSetting } = props;
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
