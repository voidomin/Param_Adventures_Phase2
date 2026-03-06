import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/layout/Hero";
import CategoryBar from "@/components/home/CategoryBar";
import Testimonials from "@/components/home/Testimonials";
import { prisma } from "@/lib/db";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import { format } from "date-fns";
import Link from "next/link";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default async function Home() {
  // Fetch active hero slides for the homepage carousel
  const heroSlides = await prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  // Fetch featured experiences
  const featuredExperiences = await prisma.experience.findMany({
    where: { isFeatured: true, status: "PUBLISHED" },
    include: {
      categories: { include: { category: true } },
      _count: { select: { slots: true } },
    },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  // Fetch recent blogs
  const recentBlogs = await prisma.blog.findMany({
    where: { status: "PUBLISHED" },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, avatarUrl: true } },
      coverImage: { select: { mediumUrl: true, originalUrl: true } },
      experience: { select: { title: true } },
    },
  });

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero slides={heroSlides} />
      <CategoryBar />

      <div className="py-20 max-w-7xl mx-auto px-4">
        <ScrollReveal>
          <h2 className="text-4xl font-heading font-black text-foreground mb-4 text-center">
            Featured Experiences
          </h2>
          <p className="text-foreground/60 max-w-2xl mx-auto text-center mb-12">
            Discover our hand-picked, most extraordinary adventures designed for
            the bold.
          </p>
        </ScrollReveal>

        {featuredExperiences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {featuredExperiences.map((exp: any, idx: number) => (
              <ScrollReveal key={exp.id} delay={0.1 * idx}>
                <ExperienceCard experience={exp} />
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-foreground/60">
              We are currently curating an amazing selection of featured trips.
              Stay tuned!
            </p>
          </div>
        )}
      </div>

      {/* Featured Stories Section */}
      <div className="py-20 bg-foreground/[0.02]">
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal direction="left">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-12 gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-heading font-black text-foreground mb-4">
                  Latest Stories & Guides
                </h2>
                <p className="text-foreground/60 max-w-2xl">
                  Read about firsthand experiences, travel tips, and incredible
                  journeys curated by our experts.
                </p>
              </div>
              <Link
                href="/blogs"
                className="hidden md:inline-flex items-center px-6 py-3 bg-primary/10 text-primary font-bold rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                View All Stories
              </Link>
            </div>
          </ScrollReveal>

          {recentBlogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recentBlogs.map((blog, idx) => (
                <ScrollReveal key={blog.id} delay={0.1 * idx}>
                  <Link
                    href={`/blogs/${blog.slug}`}
                    className="group bg-card rounded-3xl border border-border flex flex-col h-full overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/50 transition-all"
                  >
                    {blog.coverImage && (
                      <div className="relative h-48 w-full overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            blog.coverImage.mediumUrl ||
                            blog.coverImage.originalUrl
                          }
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      {blog.experience && (
                        <span className="text-primary text-xs font-bold uppercase tracking-wider mb-2">
                          {blog.experience.title}
                        </span>
                      )}
                      <h3 className="text-xl font-bold font-heading mb-4 group-hover:text-primary transition-colors line-clamp-2">
                        {blog.title}
                      </h3>

                      <div className="mt-auto pt-4 border-t border-border flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shadow-sm">
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
                          <span className="font-semibold text-foreground/80">
                            {blog.author.name}
                          </span>
                        </div>
                        <span className="text-foreground/50 font-medium">
                          {format(new Date(blog.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 border border-dashed border-border rounded-3xl bg-card">
              <p className="text-foreground/60 text-lg">
                Awesome stories are being written! Soon you'll find amazing trek
                experiences here.
              </p>
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link
              href="/blogs"
              className="inline-flex items-center px-8 py-3.5 bg-primary text-primary-foreground font-bold rounded-full transition-transform hover:scale-105 shadow-xl shadow-primary/20"
            >
              View All Stories
            </Link>
          </div>
        </div>
      </div>

      <Testimonials />

      <Footer />
    </main>
  );
}
