import type { MetadataRoute } from "next";
import { withBuildSafety } from "@/lib/db-utils";
import { prisma } from "@/lib/db";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await withBuildSafety(
    () => prisma.platformSetting.findMany({
      where: { key: "app_url" }
    }),
    []
  );
  
  const BASE_URL = settings[0]?.value || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/dashboard"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
