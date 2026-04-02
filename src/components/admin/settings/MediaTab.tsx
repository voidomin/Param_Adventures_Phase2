import React from "react";
import { ImageIcon, Database } from "lucide-react";
import { SectionTitle, InputGroup, TabProps } from "./Common";

export default function MediaTab(props: TabProps) {
  const { getVal, updateSetting } = props;
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
          value={getVal("PLATFORM", "media_provider")}
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
          {(getVal("PLATFORM", "media_provider") || "STORAGE").replace("_", " ")} Configuration
        </h4>

        {getVal("PLATFORM", "media_provider") === "S3" && (
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

        {getVal("PLATFORM", "media_provider") === "CLOUDINARY" && (
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
      </div>
    </div>
  );
}
