import React from "react";
import { LucideIcon } from "lucide-react";

export interface TabProps {
  getVal: (type: "PLATFORM" | "SITE", key: string) => string;
  updateSetting: (type: "PLATFORM" | "SITE", key: string, value: string) => void;
}

export function SectionTitle({ title, subtitle, icon: Icon }: Readonly<{ title: string; subtitle: string; icon: LucideIcon }>) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="p-3 rounded-2xl bg-primary/10 text-primary">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-xl font-bold font-heading text-foreground">{title}</h3>
        <p className="text-sm text-foreground/50">{subtitle}</p>
      </div>
    </div>
  );
}

export function InputGroup({ label, value, onChange, placeholder, type = "text", options, description, textarea }: Readonly<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  options?: { label: string; value: string }[];
  description?: string;
  textarea?: boolean;
}>) {
  let inputElement;
  if (type === "select") {
    inputElement = (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 bg-background border border-border rounded-2xl px-4 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all appearance-none cursor-pointer"
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  } else if (textarea) {
    inputElement = (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[120px] py-3 bg-background border border-border rounded-2xl px-4 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all resize-none"
      />
    );
  } else {
    inputElement = (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 bg-background border border-border rounded-2xl px-4 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
      />
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-foreground/40 uppercase tracking-widest pl-1">{label}</label>
      {inputElement}
      {description && <p className="text-[10px] text-foreground/40 pl-2 leading-relaxed">{description}</p>}
    </div>
  );
}

export function StatCard({ label, value, color = "text-foreground" }: Readonly<{ label: string; value: string; color?: string }>) {
  return (
    <div className="p-6 bg-background border border-border rounded-2xl space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-foreground/30">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}
