import { prisma } from "@/lib/db";
import { withBuildSafety } from "@/lib/db-utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Mountain, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { buildBlogAltText } from "@/lib/seo/alt-text";

export const revalidate = 60;

type Props = Readonly<{ params: Promise<{ id: string }> }>;

async function getAuthor(id: string) {
  return withBuildSafety(
    () =>
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
          certifications: true,
          deletedAt: true,
          status: true,
          role: { select: { name: true } },
        },
      }),
    null,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const author = await getAuthor(id);

  if (!author || author.deletedAt || author.status !== "ACTIVE") {
    return { title: "Author Not Found" };
  }

  const certifiedClause =
    author.certifications.length > 0 ? ` Certified: ${author.certifications.join(", ")}.` : "";
  const description =
    (author.bio || `Read trekking stories and guides by ${author.name} on the Param Adventures blog.`) +
    certifiedClause;

  return {
    title: `${author.name} | Param Adventures`,
    description,
    alternates: {
      canonical: `/authors/${id}`,
    },
    openGraph: {
      title: author.name,
      description,
      images: author.avatarUrl ? [{ url: author.avatarUrl, alt: author.name }] : undefined,
      type: "profile",
    },
  };
}

/**
 * Public author bio page -- the E-E-A-T fix for blog bylines that were
 * credited by name but never linked anywhere. Only community contributors
 * get a meaningful page here; official/staff posts already carry the
 * brand's own trust signals elsewhere (/why-param-adventures), so this
 * page works fine for any author id but is primarily reached via a
 * non-official blog byline (see src/app/blog/[slug]/page.tsx).
 */
export default async function AuthorPage({ params }: Props) {
  const { id } = await params;
  const author = await getAuthor(id);

  if (!author || author.deletedAt || author.status !== "ACTIVE") {
    notFound();
  }

  const posts = await withBuildSafety(
    () =>
      prisma.blog.findMany({
        where: { authorId: id, status: "PUBLISHED", deletedAt: null },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          coverImage: { select: { originalUrl: true } },
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 24,
      }),
    [],
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-32">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-10 border-b border-border">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center text-primary font-black text-3xl shrink-0 shadow-inner">
            {author.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt={author.name}
                fill
                className="object-cover"
              />
            ) : (
              author.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Author
            </p>
            <h1 className="text-3xl font-heading font-black text-foreground">
              {author.name}
            </h1>
            {author.bio && (
              <p className="text-foreground/70 mt-3 leading-relaxed max-w-xl">
                {author.bio}
              </p>
            )}
            {author.certifications.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                {author.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {cert}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-heading font-bold mb-6">
            Stories by {author.name}
          </h2>

          {posts.length === 0 ? (
            <p className="text-foreground/50">
              No published stories yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {posts.map((post) => {
                const cover =
                  post.coverImageUrl ||
                  post.coverImage?.originalUrl ||
                  `https://picsum.photos/seed/${post.id}/800/500`;

                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <Image
                        src={cover}
                        alt={buildBlogAltText(post.title)}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-foreground text-base line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-foreground/40 mt-2">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {new Date(post.updatedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <Mountain className="w-4 h-4" /> Back to all stories
          </Link>
        </div>
      </div>
    </div>
  );
}
