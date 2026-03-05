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
  });

  if (!blog) return { title: "Story Not Found" };

  return {
    title: blog.title,
    openGraph: {
      title: blog.title,
      images: blog.coverImageUrl ? [{ url: blog.coverImageUrl }] : [],
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
    blog.coverImageUrl || "https://picsum.photos/seed/placeholder/1920/1080";

  const themeConfig = {
    CLASSIC: "font-serif prose-headings:font-serif",
    MODERN: "font-sans prose-headings:font-heading",
    MINIMAL: "font-mono prose-none", // simplistic rendering
  };
  const themeClass =
    themeConfig[blog.theme as keyof typeof themeConfig] || themeConfig.CLASSIC;

  // Typecast the JSON safely
  const socials = (blog.authorSocials as Record<string, string>) || {};

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 w-full pb-16 text-center text-white">
          <div className="mb-6 flex justify-center">
            {blog.experience && (
              <Link href={`/experiences/${blog.experience.slug}`}>
                <span className="bg-primary/90 hover:bg-primary transition-colors px-5 py-2 rounded-full text-primary-foreground text-sm font-bold shadow-xl">
                  Related to: {blog.experience.title}
                </span>
              </Link>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-black text-white mb-8 leading-tight drop-shadow-lg">
            {blog.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-white/80 font-medium">
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
              <span className="text-lg font-bold text-white">
                {blog.author.name}
              </span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <span className="text-white/70">
              {format(new Date(blog.createdAt), "MMMM d, yyyy")}
            </span>
          </div>

          {/* Socials Under Author */}
          {(socials.instagram || socials.twitter || socials.youtube) && (
            <div className="flex items-center justify-center gap-4 mt-6">
              {socials.instagram && (
                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-foreground/10 hover:bg-foreground/20 rounded-full transition-colors text-foreground"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              )}
              {socials.twitter && (
                <a
                  href={socials.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-foreground/10 hover:bg-foreground/20 rounded-full transition-colors text-foreground"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              )}
              {socials.youtube && (
                <a
                  href={socials.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-foreground/10 hover:bg-foreground/20 rounded-full transition-colors text-foreground"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              )}
            </div>
          )}
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
        <div
          className={`bg-card rounded-[2.5rem] p-8 sm:p-12 border border-border shadow-2xl shadow-primary/5 ${themeClass}`}
        >
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
