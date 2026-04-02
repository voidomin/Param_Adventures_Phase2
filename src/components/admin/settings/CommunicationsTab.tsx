import React from "react";
import { Mail, Settings2 } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function CommunicationsTab(props: TabProps) {
  const { getVal, updateSetting } = props;
  return (
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

      <div className="p-8 bg-foreground/5 rounded-3xl space-y-6 border border-border/50">
        <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> 
          {(getVal("PLATFORM", "email_provider") || "").replace("_", " ")} Credentials
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

        {(getVal("PLATFORM", "email_provider") === "ZOHO_API" || getVal("PLATFORM", "email_provider") === "RESEND") && (
          <div className="space-y-6">
            <InputGroup
              label="API Key"
              value={getVal("PLATFORM", "email_api_key")}
              onChange={(v: string) => updateSetting("PLATFORM", "email_api_key", v)}
              type="password"
              placeholder="e.g. resend_key_..."
            />
            {getVal("PLATFORM", "email_provider") === "ZOHO_API" && (
              <InputGroup
                label="Sender Organization ID"
                value={getVal("PLATFORM", "zoho_org_id")}
                onChange={(v: string) => updateSetting("PLATFORM", "zoho_org_id", v)}
                placeholder="Required for Zoho Mail APIs"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
