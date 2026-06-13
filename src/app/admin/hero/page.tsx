"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectHero() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/customization?tab=hero");
  }, [router]);

  return null;
}
