import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import Navbar from "@/components/layout/Navbar";
import dynamic from "next/dynamic";
import {
  MapPin,
  CalendarDays,
  ArrowLeft,
  IndianRupee,
  ArrowRight,
  Mountain,
} from "lucide-react";

// Render Tiptap JSON read-only
const TiptapEditor = dynamic(() => import("@/components/blog/TiptapEditor"), {
  ssr: false,
});

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;

  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, avatarUrl: true } },
      experience: {
        select: {
          id: true,
          title: true,
          slug: true,
          location: true,
          basePrice: true,
          images: true,
        },
      },
      coverImage: { select: { originalUrl: true } },
    },
  });

  if (!blog || blog.status !== "PUBLISHED" || blog.deletedAt) {
    notFound();
  }

  const cover =
    blog.coverImage?.originalUrl ??
    blog.experience?.images[0] ??
    `https://picsum.photos/seed/${blog.id}/1200/600`;

  const publishDate = new Date(blog.updatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-background pb-20">
      <Navbar />

      {/* Hero Cover */}
      <div className="relative h-[45vh] min-h-[300px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={blog.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-4 pb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All Stories
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading font-black text-foreground leading-tight">
            {blog.title}
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-border">
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center font-bold text-primary">
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
            <div>
              <p className="font-semibold text-foreground text-sm">
                {blog.author.name}
              </p>
              <p className="text-xs text-foreground/40">Adventure Traveller</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-foreground/40 ml-auto">
            <CalendarDays className="w-3.5 h-3.5" />
            {publishDate}
          </div>
          {blog.experience && (
            <div className="flex items-center gap-1.5 text-sm text-foreground/50">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {blog.experience.location}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="prose prose-sm md:prose dark:prose-invert max-w-none mb-12">
          <TiptapEditor
            content={blog.content as object}
            onChange={() => {}}
            editable={false}
          />
        </div>

        {/* Experience CTA */}
        {blog.experience && (
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
              {blog.experience.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blog.experience.images[0]}
                  alt={blog.experience.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <Mountain className="w-6 h-6 text-primary/50" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/40 mb-1 font-medium uppercase tracking-wider">
                About this adventure
              </p>
              <h3 className="font-bold text-foreground text-lg">
                {blog.experience.title}
              </h3>
              <div className="flex items-center gap-1 text-foreground/50 text-sm mt-1">
                <MapPin className="w-3 h-3" /> {blog.experience.location}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-1 font-black text-xl text-foreground">
                <IndianRupee className="w-4 h-4 text-primary" />
                {Number(blog.experience.basePrice).toLocaleString("en-IN")}
              </div>
              <Link
                href={`/experiences/${blog.experience.slug}`}
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
              >
                Book this Trip <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
