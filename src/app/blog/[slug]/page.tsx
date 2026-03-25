import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  MapPin,
  CalendarDays,
  ArrowLeft,
  IndianRupee,
  ArrowRight,
  Mountain,
  X,
} from "lucide-react";
// Custom Social SVGs to avoid Lucide deprecation warnings
const InstagramSVG = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
  </svg>
);

const YoutubeSVG = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

import ClientTiptapViewer from "@/components/blog/ClientTiptapViewer";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const revalidate = 60;

type Props = Readonly<{ params: Promise<{ slug: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
    select: {
      title: true,
      coverImage: { select: { originalUrl: true } },
    },
  });

  if (!blog) return { title: "Blog Not Found" };

  const ogImage = blog.coverImage?.originalUrl || "/param-logo.png";
  const desc = `Read "${blog.title}" on the Param Adventures blog.`;

  return {
    title: blog.title,
    description: desc,
    openGraph: {
      title: blog.title,
      description: desc,
      images: [{ url: ogImage, alt: blog.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description: desc,
      images: [ogImage],
    },
  };
}

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
    },
  });

  // Check authorization for preview
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  const isModerator =
    payload?.roleName === "SUPER_ADMIN" || payload?.roleName === "ADMIN";

  if (
    !blog ||
    (blog.status !== "PUBLISHED" && !isModerator) ||
    blog.deletedAt
  ) {
    notFound();
  }

  const theme = blog.theme || "CLASSIC";
  const cover =
    blog?.coverImageUrl ||
    blog?.experience?.images[0] ||
    `https://picsum.photos/seed/${blog?.id}/1200/600`;
  const socials =
    (blog?.authorSocials as
      | { instagram?: string; twitter?: string; youtube?: string }
      | null) ?? {};

  const publishDate = new Date(blog.updatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
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

      <div
        className={cn(
          "max-w-3xl mx-auto px-4 pt-8",
          theme === "MODERN" && "max-w-5xl",
          theme === "MINIMAL" && "max-w-2xl px-8",
        )}
      >
        {/* Meta */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-border",
            theme === "MODERN" && "mb-12 pb-8",
            theme === "MINIMAL" && "border-none mb-4 pb-0 items-start flex-col",
          )}
        >
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
              <div className="flex items-center gap-3 mt-1">
                {socials.instagram && (
                  <a
                    href={socials.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground/40 hover:text-primary transition-colors"
                  >
                    <InstagramSVG />
                  </a>
                )}
                {socials.twitter && (
                  <a
                    href={socials.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground/40 hover:text-primary transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </a>
                )}
                {socials.youtube && (
                  <a
                    href={socials.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground/40 hover:text-primary transition-colors"
                  >
                    <YoutubeSVG />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 text-sm text-foreground/40 ml-auto",
              theme === "MINIMAL" && "ml-0 mt-2",
            )}
          >
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
        <div
          className={cn(
            "prose prose-sm md:prose dark:prose-invert max-w-none mb-12",
            theme === "MODERN" && "md:prose-lg font-body leading-relaxed",
            theme === "MINIMAL" && "md:prose-base font-serif antialiased",
          )}
        >
          <ClientTiptapViewer content={blog.content as object} />
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
    </div>
  );
}
