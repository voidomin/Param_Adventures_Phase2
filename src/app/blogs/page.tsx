import { prisma } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { format } from "date-fns";

export const revalidate = 60; // Revalidate every minute

export default async function BlogsPage() {
  const blogs = await prisma.blog.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, avatarUrl: true } },
      coverImage: { select: { mediumUrl: true, originalUrl: true } },
      experience: { select: { title: true, slug: true } },
    },
  });

  return (
    <main className="min-h-screen bg-background pb-20 pt-24">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12 text-center mt-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-black text-foreground mb-4 drop-shadow-sm">
            Stories & Guides
          </h1>
          <p className="text-lg md:text-xl text-foreground/60 max-w-2xl mx-auto">
            Discover breathtaking adventures, trail guides, and inspiring
            stories from our expert trek leads and community.
          </p>
        </header>

        {blogs.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border mt-8">
            <h3 className="text-2xl font-bold mb-2">No stories yet</h3>
            <p className="text-foreground/50 text-lg">
              Check back later for exciting adventure logs.
            </p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {blogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/blogs/${blog.slug}`}
                className="break-inside-avoid block bg-card rounded-3xl border border-border overflow-hidden group hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5"
              >
                {blog.coverImage && (
                  <div className="w-full relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        blog.coverImage.mediumUrl || blog.coverImage.originalUrl
                      }
                      alt={blog.title}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
                <div className="p-6">
                  {blog.experience && (
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full mb-4">
                      {blog.experience.title}
                    </span>
                  )}
                  <h2 className="text-2xl font-bold font-heading mb-4 group-hover:text-primary transition-colors leading-tight">
                    {blog.title}
                  </h2>
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden">
                      {blog.author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={blog.author.avatarUrl}
                          alt={blog.author.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        blog.author.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {blog.author.name}
                      </span>
                      <span className="text-xs text-foreground/50 font-medium">
                        {format(new Date(blog.createdAt), "MMMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
