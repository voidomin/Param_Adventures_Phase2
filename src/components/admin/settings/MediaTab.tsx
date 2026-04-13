import React, { useState } from "react";
import { ImageIcon, Database, Loader2, CheckCircle2, AlertCircle, Handshake } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function MediaTab(props: TabProps) {
  const { getVal, updateSetting } = props;
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: "" });

  const activeProvider = getVal("PLATFORM", "media_provider");

  const handleVerifyStorage = async () => {
    setIsVerifying(true);
    setVerifyStatus({ type: null, message: "" });

    let config = {};
    if (activeProvider === "S3") {
      config = {
        bucket: getVal("PLATFORM", "s3_bucket")?.trim(),
        region: getVal("PLATFORM", "s3_region")?.trim(),
        accessKey: getVal("PLATFORM", "s3_access_key")?.trim(),
        secretKey: getVal("PLATFORM", "s3_secret_key")?.trim(),
        endpoint: getVal("PLATFORM", "s3_endpoint")?.trim(),
      };
    } else if (activeProvider === "CLOUDINARY") {
      config = {
        cloudName: getVal("PLATFORM", "cloudinary_cloud_name")?.trim(),
        apiKey: getVal("PLATFORM", "cloudinary_api_key")?.trim(),
        apiSecret: getVal("PLATFORM", "cloudinary_api_secret")?.trim(),
      };
    } else {
      setIsVerifying(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/settings/system/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: activeProvider, 
          config 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setVerifyStatus({ 
          type: 'success', 
          message: data.message || `${activeProvider} verified successfully!` 
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

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
      <SectionTitle 
        title="Storage & Assets" 
        subtitle="Manage cloud storage providers and asset delivery networks." 
        icon={ImageIcon} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputGroup
          label="Active Provider"
          value={activeProvider}
          onChange={(v: string) => updateSetting("PLATFORM", "media_provider", v)}
          type="select"
          options={[
            { label: "AWS S3 / R2 (Enterprise)", value: "S3" },
            { label: "Cloudinary (Optimized)", value: "CLOUDINARY" },
            { label: "Local Disk (Development)", value: "LOCAL" },
          ]}
        />
        <InputGroup
          label="CDN Base URL"
          value={getVal("PLATFORM", "cdn_url")}
          onChange={(v: string) => updateSetting("PLATFORM", "cdn_url", v)}
          placeholder="https://assets.paramadventures.in"
        />
      </div>

      <div className="p-8 bg-foreground/5 rounded-3xl space-y-6 border border-border/50">
        <h4 className="font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
          <Database className="w-4 h-4" /> 
          {(activeProvider || "STORAGE").replace("_", " ")} Configuration
        </h4>

        {activeProvider === "S3" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup
              label="S3 Bucket"
              value={getVal("PLATFORM", "s3_bucket")}
              onChange={(v: string) => updateSetting("PLATFORM", "s3_bucket", v)}
            />
            <InputGroup
              label="S3 Region"
              value={getVal("PLATFORM", "s3_region")}
              onChange={(v: string) => updateSetting("PLATFORM", "s3_region", v)}
            />
            <InputGroup
              label="Access Key ID"
              value={getVal("PLATFORM", "s3_access_key")}
              onChange={(v: string) => updateSetting("PLATFORM", "s3_access_key", v)}
              type="password"
            />
            <InputGroup
              label="Secret Access Key"
              value={getVal("PLATFORM", "s3_secret_key")}
              onChange={(v: string) => updateSetting("PLATFORM", "s3_secret_key", v)}
              type="password"
            />
            <InputGroup
              label="Endpoint URL (R2/Custom)"
              value={getVal("PLATFORM", "s3_endpoint")}
              onChange={(v: string) => updateSetting("PLATFORM", "s3_endpoint", v)}
              placeholder="Optional"
            />
          </div>
        )}

        {activeProvider === "CLOUDINARY" && (
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
            />
            <InputGroup
              label="API Secret"
              value={getVal("PLATFORM", "cloudinary_api_secret")}
              onChange={(v: string) => updateSetting("PLATFORM", "cloudinary_api_secret", v)}
              type="password"
            />
          </div>
        )}

        {activeProvider !== "LOCAL" && (
          <div className="mt-4 pt-6 border-t border-border/30">
             <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-primary" /> 
                  Storage Handshake
                </p>
                <p className="text-xs text-foreground/50 font-medium italic">
                  Ensures the {activeProvider} bucket/cloud is accessible with these credentials.
                </p>
              </div>
              <button
                onClick={handleVerifyStorage}
                disabled={isVerifying}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 h-10"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-4 h-4" />}
                {isVerifying ? 'Verifying...' : 'Test Handshake'}
              </button>
            </div>

            {verifyStatus.type && (
              <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300 ${
                verifyStatus.type === 'success' 
                  ? 'bg-green-500/5 border-green-500/20 text-green-600' 
                  : 'bg-red-500/5 border-red-500/20 text-red-600'
              }`}>
                {verifyStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                <p className="text-xs font-bold leading-relaxed">{verifyStatus.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
