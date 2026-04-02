import React, { useState } from "react";
import { Mail, Settings2, Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function CommunicationsTab(props: Readonly<TabProps>) {
  const { getVal, updateSetting } = props;
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const handleSendTestEmail = async () => {
    if (!testEmail) return;
    setTestStatus("sending");
    setTestMessage("");
    try {
      const res = await fetch("/api/admin/settings/system/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus("success");
        setTestMessage(data.message || "Sent!");
      } else {
        setTestStatus("error");
        setTestMessage(data.error || "Failed to send.");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Network error.");
    }
  };

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

      {/* Send Test Email */}
      <div className="p-8 bg-foreground/5 rounded-3xl space-y-4 border border-border/50">
        <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
          <Send className="w-4 h-4" /> Delivery Test
        </h4>
        <p className="text-xs text-foreground/50">
          Send a test email using the <strong>currently saved</strong> provider settings. Save changes first if you just modified credentials.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label htmlFor="test-email-recipient" className="text-xs font-bold text-foreground/40 uppercase tracking-widest pl-1 block mb-2">Recipient</label>
            <input
              id="test-email-recipient"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full h-12 bg-background border border-border rounded-2xl px-4 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
            />
          </div>
          <button
            onClick={handleSendTestEmail}
            disabled={testStatus === "sending" || !testEmail}
            className="h-12 px-6 bg-primary text-primary-foreground rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
          >
            {testStatus === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test
          </button>
        </div>
        {testStatus === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-500 font-bold animate-in fade-in duration-300">
            <CheckCircle className="w-4 h-4" /> {testMessage}
          </div>
        )}
        {testStatus === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-500 font-bold animate-in fade-in duration-300">
            <XCircle className="w-4 h-4" /> {testMessage}
          </div>
        )}
      </div>
    </div>
  );
}
