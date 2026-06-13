"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectStory() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/customization?tab=story");
  }, [router]);

  return null;
}
