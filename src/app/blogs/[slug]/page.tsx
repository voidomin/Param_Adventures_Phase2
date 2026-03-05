import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import RichTextRenderer from "@/components/blog/RichTextRenderer";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: { coverImage: true },
  });

  if (!blog) return { title: "Story Not Found" };

  return {
    title: blog.title,
    openGraph: {
      title: blog.title,
      images: blog.coverImage ? [{ url: blog.coverImage.originalUrl }] : [],
    },
  };
}

export default async function BlogDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;

  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, avatarUrl: true } },
      coverImage: { select: { originalUrl: true } },
      experience: {
        select: {
          title: true,
          slug: true,
          images: true,
          durationDays: true,
          location: true,
        },
      },
    },
  });

  if (!blog || blog.status !== "PUBLISHED") {
    notFound();
  }

  const coverUrl =
    blog.coverImage?.originalUrl ||
    "https://picsum.photos/seed/placeholder/1920/1080";

  return (
    <main className="min-h-screen bg-background pb-24">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative h-[65vh] min-h-[500px] w-full mt-16 flex items-end justify-center">
        <div className="absolute inset-0 z-0 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={blog.title}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 w-full pb-16 text-center">
          <div className="mb-6 flex justify-center">
            {blog.experience && (
              <Link href={`/experiences/${blog.experience.slug}`}>
                <span className="bg-primary/90 hover:bg-primary transition-colors px-5 py-2 rounded-full text-primary-foreground text-sm font-bold shadow-xl">
                  Related to: {blog.experience.title}
                </span>
              </Link>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-black text-foreground mb-8 leading-tight drop-shadow-md">
            {blog.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-foreground/80 font-medium">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden shadow-sm">
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
              <span className="text-lg font-bold text-foreground">
                {blog.author.name}
              </span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-foreground/70">
              {format(new Date(blog.createdAt), "MMMM d, yyyy")}
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
        <div className="mb-10">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Stories
          </Link>
        </div>

        {/* Render Tiptap Content */}
        <div className="bg-card rounded-[2.5rem] p-8 sm:p-12 border border-border shadow-2xl shadow-primary/5">
          <RichTextRenderer content={blog.content as object} />
        </div>

        {/* Linked Experience Promo Card */}
        {blog.experience && (
          <div className="mt-16 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-1.5 rounded-[2.5rem] shadow-xl">
            <div className="bg-card p-6 sm:p-8 rounded-[2.2rem] flex flex-col md:flex-row gap-8 items-center border border-border/50">
              <div className="w-full md:w-2/5 aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-border relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={blog.experience.images[0] || coverUrl}
                  alt={blog.experience.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="flex-1 text-center md:text-left flex flex-col justify-center">
                <span className="text-primary font-bold text-sm tracking-wider uppercase mb-2">
                  Featured Trip
                </span>
                <h3 className="text-3xl font-bold font-heading mb-3 leading-tight">
                  {blog.experience.title}
                </h3>
                <p className="text-foreground/70 mb-6 text-lg">
                  Join our next departure and experience the thrill yourself.
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 mb-8">
                  <span className="flex items-center gap-2 font-medium bg-foreground/5 px-4 py-2 rounded-xl text-sm">
                    <MapPin className="w-4 h-4 text-primary" />{" "}
                    {blog.experience.location}
                  </span>
                  <span className="flex items-center gap-2 font-medium bg-foreground/5 px-4 py-2 rounded-xl text-sm">
                    <Clock className="w-4 h-4 text-primary" />{" "}
                    {blog.experience.durationDays} Days
                  </span>
                </div>

                <Link
                  href={`/experiences/${blog.experience.slug}`}
                  className="inline-flex justify-center items-center px-8 py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl hover:scale-105 transition-transform shadow-lg shadow-primary/20 text-lg"
                >
                  View Experience details
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
