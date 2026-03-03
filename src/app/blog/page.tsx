import Link from "next/link";
import { prisma } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import { MapPin, CalendarDays, ArrowRight, PenLine } from "lucide-react";

export const revalidate = 60;

export default async function BlogListingPage() {
  const blogs = await prisma.blog.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    include: {
      author: { select: { name: true, avatarUrl: true } },
      experience: { select: { title: true, slug: true, location: true } },
      coverImage: { select: { originalUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });

  return (
    <main className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Hero */}
      <div className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-bold mb-6">
            <PenLine className="w-3.5 h-3.5" /> Adventure Stories
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-black text-foreground mb-4">
            Real Stories from
            <br />
            <span className="text-primary">Real Adventurers</span>
          </h1>
          <p className="text-foreground/60 text-lg max-w-xl mx-auto">
            Written by travellers who&apos;ve actually been there. Experience
            the journey through their eyes.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-4">
        {blogs.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <PenLine className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground/60 mb-2">
              No stories yet
            </h2>
            <p className="text-foreground/40 text-sm">
              Be the first to share your adventure after booking a trip.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => {
              const cover =
                blog.coverImage?.originalUrl ??
                `https://picsum.photos/seed/${blog.id}/800/500`;

              return (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.slug}`}
                  className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  {/* Cover */}
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {blog.experience && (
                      <div className="absolute bottom-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black/40 backdrop-blur-sm border border-white/20 rounded-full text-white text-xs font-semibold">
                          <MapPin className="w-3 h-3" />
                          {blog.experience.location || blog.experience.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h2 className="font-heading font-bold text-foreground text-lg line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                      {blog.title}
                    </h2>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {blog.author.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={blog.author.avatarUrl}
                              alt={blog.author.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            blog.author.name[0].toUpperCase()
                          )}
                        </div>
                        <span className="text-sm text-foreground/60 font-medium">
                          {blog.author.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-foreground/40">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(blog.updatedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>

                    {blog.experience && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-foreground/50">
                        <span>
                          About:{" "}
                          <strong className="text-foreground/70">
                            {blog.experience.title}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          Read <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
