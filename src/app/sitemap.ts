import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { withBuildSafety } from "@/lib/db-utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch dynamic base URL from platform settings
  const siteSettings = await withBuildSafety(
    () => prisma.platformSetting.findMany({ where: { key: "app_url" } }),
    []
  );
  
  const BASE_URL = siteSettings[0]?.value || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/experiences`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Dynamic experience pages
  const experiences = await withBuildSafety(
    () =>
      prisma.experience.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
    [],
  );

  const experiencePages: MetadataRoute.Sitemap = experiences.map((exp) => ({
    url: `${BASE_URL}/experiences/${exp.slug}`,
    lastModified: exp.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Dynamic blog pages
  const blogs = await withBuildSafety(
    () =>
      prisma.blog.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: { slug: true, updatedAt: true },
      }),
    [],
  );

  const blogPages: MetadataRoute.Sitemap = blogs.map((blog) => ({
    url: `${BASE_URL}/blog/${blog.slug}`,
    lastModified: blog.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...experiencePages, ...blogPages];
}
