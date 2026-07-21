import { prisma } from "@/lib/db";
import { withBuildSafety } from "@/lib/db-utils";
import BlogListingClient from "@/components/blog/BlogListingClient";

export const revalidate = 60;

export default async function BlogListingPage() {
  const blogs = await withBuildSafety(
    () =>
      prisma.blog.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              role: { select: { name: true } },
            },
          },
          experience: { select: { id: true, title: true, slug: true, location: true } },
          coverImage: { select: { originalUrl: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 24,
      }),
    [],
  );

  return <BlogListingClient initialBlogs={blogs as unknown as Parameters<typeof BlogListingClient>[0]["initialBlogs"]} />;
}

