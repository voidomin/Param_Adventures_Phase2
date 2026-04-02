import React from "react";
import { Lock, Settings2 } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function SecurityTab(props: TabProps) {
  const { getVal, updateSetting } = props;
  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
      <SectionTitle 
        title="Authentication & Payments" 
        subtitle="Configure identity providers and the Razorpay transaction engine." 
        icon={Lock} 
      />
      
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
    </div>
  );
}
