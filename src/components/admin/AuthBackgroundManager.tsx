"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import MediaUploader from "./MediaUploader";

interface AuthBgSetting {
  key: string;
  label: string;
  value: string | null;
}

const AUTH_BG_KEYS: AuthBgSetting[] = [
  { key: "auth_login_bg", label: "Sign In Page", value: null },
  { key: "auth_register_bg", label: "Sign Up Page", value: null },
];

export default function AuthBackgroundManager() {
  const [settings, setSettings] = useState<AuthBgSetting[]>(AUTH_BG_KEYS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        const allSettings = data.settings || [];
        setSettings(
          AUTH_BG_KEYS.map((def) => {
            const found = allSettings.find(
              (s: { key: string; value: string }) => s.key === def.key,
            );
            return { ...def, value: found?.value ?? null };
          }),
        );
      }
    } catch (err) {
      console.error("Failed to fetch auth bg settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpload = async (key: string, urls?: string[]) => {
    if (!urls || urls.length === 0) return;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: urls[0] }),
      });
      if (res.ok) {
        fetchSettings();
      }
    } catch (err) {
      console.error("Failed to save auth bg:", err);
    }
  };

  const handleRemove = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/settings?key=${key}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchSettings();
      }
    } catch (err) {
      console.error("Failed to remove auth bg:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {settings.map((setting) => (
        <div
          key={setting.key}
          className="bg-card border border-border rounded-xl p-4"
        >
          <p className="text-sm font-bold text-foreground mb-3">
            {setting.label} Background
          </p>

          {setting.value ? (
            <div className="relative group rounded-lg overflow-hidden border border-border">
              {/\.(mp4|webm|ogv)$/i.test(setting.value) ||
              setting.value.includes("/video/upload/") ? (
                <video
                  src={setting.value}
                  className="w-full aspect-video object-cover"
                  muted
                  loop
                  autoPlay
                />
              ) : (
                <div className="w-full aspect-video relative">
                  <Image
                    src={setting.value}
                    alt={`${setting.label} background`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleRemove(setting.key)}
                  className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-xl flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-foreground/40 text-xs mb-2">
                <ImageIcon className="w-4 h-4" />
                <span>Using default image</span>
              </div>
              <MediaUploader
                id={`auth-bg-${setting.key}`}
                onUploadSuccess={(urls) => handleUpload(setting.key, urls)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
