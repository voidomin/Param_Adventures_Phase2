"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/settings/system");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-foreground/50 font-medium animate-pulse">
        Relocating to Command Center...
      </p>
    </div>
  );
}
