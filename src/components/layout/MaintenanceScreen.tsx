import React from "react";
import { AlertTriangle, Mountain } from "lucide-react";

export default function MaintenanceScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
            <div className="relative w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20">
              <Mountain className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Under Upgrade
          </div>
          <h1 className="text-4xl font-black font-heading leading-tight tracking-tight">
            Preparing the <span className="text-primary italic underline-offset-8 decoration-wavy">Next Trail</span>
          </h1>
          <p className="text-foreground/50 font-medium leading-relaxed">
            Param Adventures is currently under scheduled maintenance to bring you a smoother trekking experience. We&apos;ll be back on the peaks shortly!
          </p>
        </div>

        <div className="pt-8 border-t border-border/50">
          <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} Param Adventures &bull; Curated Expeditions
          </p>
        </div>
      </div>
    </div>
  );
}
