"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { MapPin, CalendarDays, ArrowRight, PenLine, Search, Mountain } from "lucide-react";

interface BlogAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: { name: string } | null;
}

interface Blog {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  coverImage?: { originalUrl: string } | null;
  updatedAt: string;
  author: BlogAuthor;
  experience: { id: string; title: string; slug: string; location: string | null } | null;
}

interface BlogListingClientProps {
  readonly initialBlogs: readonly Blog[];
}

export default function BlogListingClient({ initialBlogs }: Readonly<BlogListingClientProps>) {
  const [filter, setFilter] = useState<"ALL" | "OFFICIAL" | "COMMUNITY">("ALL");
  const [search, setSearch] = useState("");

  const processedBlogs = useMemo(() => {
    return initialBlogs.map((blog) => {
      const isOfficial =
        blog.author?.role?.name === "ADMIN" ||
        blog.author?.role?.name === "SUPER_ADMIN" ||
        blog.author?.role?.name === "MEDIA_UPLOADER";
      return {
        ...blog,
        isOfficial,
        displayName: isOfficial ? "Param Adventures" : blog.author.name,
        displayAvatar: isOfficial ? "/param-logo.png" : blog.author.avatarUrl,
      };
    });
  }, [initialBlogs]);

  const filteredBlogs = useMemo(() => {
    return processedBlogs.filter((blog) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "OFFICIAL" && blog.isOfficial) ||
        (filter === "COMMUNITY" && !blog.isOfficial);

      const matchesSearch =
        blog.title.toLowerCase().includes(search.toLowerCase()) ||
        blog.displayName.toLowerCase().includes(search.toLowerCase()) ||
        (blog.experience?.title || "").toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [processedBlogs, filter, search]);

  const counts = useMemo(() => {
    return {
      ALL: processedBlogs.length,
      OFFICIAL: processedBlogs.filter((b) => b.isOfficial).length,
      COMMUNITY: processedBlogs.filter((b) => !b.isOfficial).length,
    };
  }, [processedBlogs]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Hero */}
      <div className="relative pt-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-bold mb-6">
            <PenLine className="w-3.5 h-3.5" /> Adventure Stories
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-black text-foreground mb-4">
            Real Stories from
            <br />
            <span className="text-primary">Real Adventurers</span>
          </h1>
          <p className="text-foreground/60 text-lg max-w-xl mx-auto">
            Explore authentic journeys written by travelers and official guides alike.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 backdrop-blur-md border border-border p-4 rounded-2xl shadow-xl">
          {/* animated pill toggle */}
          <div className="flex gap-1.5 p-1 bg-foreground/5 rounded-xl border border-border/50 w-full md:w-auto">
            {(["ALL", "OFFICIAL", "COMMUNITY"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                  filter === type
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                {type === "ALL" && `All Stories (${counts.ALL})`}
                {type === "OFFICIAL" && `Official Blogs (${counts.OFFICIAL})`}
                {type === "COMMUNITY" && `Community Stories (${counts.COMMUNITY})`}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories, destinations..."
              className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4">
        {filteredBlogs.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <Mountain className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground/60 mb-2">No stories found</h2>
            <p className="text-foreground/40 text-sm">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredBlogs.map((blog) => {
              const cover =
                blog.coverImageUrl ||
                blog.coverImage?.originalUrl ||
                `https://picsum.photos/seed/${blog.id}/800/500`;

              return (
                <Link
                  key={blog.id}
                  href={`/blog/${blog.slug}`}
                  className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full"
                >
                  {/* Cover */}
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={cover}
                      alt={blog.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Official badge overlay */}
                    {blog.isOfficial && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xxs font-extrabold shadow-lg">
                          Official
                        </span>
                      </div>
                    )}

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
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="font-heading font-bold text-foreground text-lg line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                      {blog.title}
                    </h2>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="relative w-7 h-7 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center text-xs font-bold text-primary border border-border/40">
                          {blog.displayAvatar ? (
                            <Image
                              src={blog.displayAvatar}
                              alt={blog.displayName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            blog.displayName[0].toUpperCase()
                          )}
                        </div>
                        <span className="text-sm text-foreground/60 font-medium">
                          {blog.displayName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-foreground/40">
                        <CalendarDays className="w-3 h-3" />
                        {format(new Date(blog.updatedAt), "dd MMM yyyy")}
                      </div>
                    </div>

                    {blog.experience && (
                      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-foreground/50">
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
    </div>
  );
}
