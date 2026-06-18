"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectCategories() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/customization?tab=categories");
  }, [router]);

  return null;
}
