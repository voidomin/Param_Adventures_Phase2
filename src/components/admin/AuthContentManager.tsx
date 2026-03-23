"use client";

import React, { useState, useEffect } from "react";
import { Save, Type, Layout, ImageIcon } from "lucide-react";

interface AuthSetting {
  key: string;
  label: string;
  value: string;
}

const DEFAULT_SETTINGS = [
  { key: "auth_common_tagline", label: "Common Tagline", value: "Curated Adventures" },
  { key: "auth_login_image_heading", label: "Login Side Heading", value: "Welcome Back\nTo The Trail" },
  { key: "auth_login_image_subheading", label: "Login Side Subheading", value: "Pick up where you left off — your next summit is waiting." },
  { key: "auth_login_form_heading", label: "Login Form Heading", value: "Welcome Back" },
  { key: "auth_login_form_subheading", label: "Login Form Subheading", value: "Sign in to continue your adventure" },
  { key: "auth_register_image_heading", label: "Register Side Heading", value: "Your Next\nAdventure Awaits" },
  { key: "auth_register_image_subheading", label: "Register Side Subheading", value: "Explore breathtaking treks across India’s most stunning landscapes." },
  { key: "auth_register_form_heading", label: "Register Form Heading", value: "Join The Adventure" },
  { key: "auth_register_form_subheading", label: "Register Form Subheading", value: "Create your account and start exploring." },
];

export default function AuthContentManager() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        const config: Record<string, string> = {};
        data.settings.forEach((s: { key: string; value: string }) => {
          config[s.key] = s.value;
        });
        setSettings(config);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (key: string, value: string) => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }));
        setMessage({ type: "success", text: "Setting saved successfully!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save setting." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderSection = (title: string, icon: React.ReactNode, keys: string[]) => (
    <div className="space-y-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border pb-4 mb-2">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
      </div>
      <div className="grid gap-6">
        {keys.map(key => {
          const def = DEFAULT_SETTINGS.find(d => d.key === key)!;
          const isTextarea = key.includes("subheading") || key.includes("heading");
          
          return (
            <div key={key} className="space-y-2">
              <label className="text-sm font-bold text-foreground/70 flex justify-between items-center">
                {def.label}
                <button
                  onClick={() => handleSave(key, settings[key] || def.value)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Save className="w-3 h-3" /> Save Changes
                </button>
              </label>
              <div className="relative group">
                {isTextarea ? (
                  <textarea
                    value={settings[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    onBlur={() => handleSave(key, settings[key] || "")}
                    placeholder={def.value}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all min-h-[80px] resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={settings[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    onBlur={() => handleSave(key, settings[key] || "")}
                    placeholder={def.value}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                )}
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none">
                  <Save className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl animate-in slide-in-from-right-8 duration-300 ${
          message.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {message.text}
        </div>
      )}

      {renderSection("Global Styles", <Type />, ["auth_common_tagline"])}
      
      <div className="grid gap-8 lg:grid-cols-2">
        {renderSection("Login Page Content", <Layout />, [
          "auth_login_image_heading",
          "auth_login_image_subheading",
          "auth_login_form_heading",
          "auth_login_form_subheading"
        ])}
        
        {renderSection("Register Page Content", <ImageIcon />, [
          "auth_register_image_heading",
          "auth_register_image_subheading",
          "auth_register_form_heading",
          "auth_register_form_subheading"
        ])}
      </div>
    </div>
  );
}
