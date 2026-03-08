import Hero from "@/components/layout/Hero";
import CategoryBar from "@/components/home/CategoryBar";
import InfiniMarquee from "@/components/home/InfiniMarquee";
import ImpactStats from "@/components/home/ImpactStats";
import Testimonials from "@/components/home/Testimonials";
import { prisma } from "@/lib/db";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import CustomTripForm from "@/components/home/CustomTripForm";
import { format } from "date-fns";
import Link from "next/link";
import ScrollReveal from "@/components/ui/ScrollReveal";
import Carousel from "@/components/ui/Carousel";

export default async function Home() {
  // Fetch active hero slides for the homepage carousel
  const heroSlides = await prisma.heroSlide.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  // Fetch featured experiences
  const featuredExperiencesRaw = await prisma.experience.findMany({
    where: { isFeatured: true, status: "PUBLISHED" },
    include: {
      categories: { include: { category: true } },
      _count: { select: { slots: true } },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  // Serialize Decimal and Date objects for Client Component compatibility
  const featuredExperiences = featuredExperiencesRaw.map((exp) => ({
    ...exp,
    basePrice: Number(exp.basePrice),
  }));

  const recentBlogs = await prisma.blog.findMany({
    where: { status: "PUBLISHED" },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true, avatarUrl: true } },
      coverImage: { select: { mediumUrl: true, originalUrl: true } },
      experience: { select: { title: true } },
    },
  });

  // Fetch dynamic destinations for marquee
  const uniqueLocationsInfo = await prisma.experience.findMany({
    where: { status: "PUBLISHED", location: { not: "" } },
    select: { location: true },
    distinct: ["location"],
  });
  let marqueeDestinations = uniqueLocationsInfo.map((l) =>
    l.location.toUpperCase(),
  );
  if (marqueeDestinations.length < 5) {
    const fallbacks = [
      "KASHMIR",
      "EVEREST BASE CAMP",
      "SPITI VALLEY",
      "LEH LADAKH",
      "KERALA",
      "HIMALAYAS",
    ];
    marqueeDestinations = [...new Set([...marqueeDestinations, ...fallbacks])];
  }

  // Calculate dynamic impact stats
  const confirmedBookings = await prisma.booking.findMany({
    where: { bookingStatus: "CONFIRMED" },
    select: {
      participantCount: true,
      experience: { select: { trekDistance: true } },
    },
  });

  let totalAdventurers = 0;
  let totalKmTrekked = 0;

  confirmedBookings.forEach((b) => {
    totalAdventurers += b.participantCount;
    if (b.experience?.trekDistance) {
      const distanceRegex = /(\d+)/;
      const match = distanceRegex.exec(b.experience.trekDistance);
      if (match) {
        totalKmTrekked += Number.parseInt(match[1], 10) * b.participantCount;
      }
    }
  });

  // Use real data, with small fallbacks just in case the DB is completely empty for a new setup
  const uniqueRoutesCount = await prisma.experience.count({
    where: { status: "PUBLISHED" },
  });
  const reviewAgg = await prisma.experienceReview.aggregate({
    _avg: { rating: true },
  });

  const dynamicStats = {
    adventurers: totalAdventurers > 0 ? totalAdventurers : 120,
    routes: uniqueRoutesCount > 0 ? uniqueRoutesCount : 15,
    kmTrekked: totalKmTrekked > 0 ? totalKmTrekked : 450,
    rating: reviewAgg._avg.rating
      ? Number(reviewAgg._avg.rating.toFixed(1))
      : 4.9,
  };

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      {/* Global Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-orange-500/5 rounded-full blur-[120px]" />
      </div>

      <Hero slides={heroSlides} />
      <InfiniMarquee destinations={marqueeDestinations} />
      <CategoryBar />

      <div className="pt-12 pb-24 px-4 md:px-12 lg:px-16 relative z-10">
        <ScrollReveal variant="blur" stagger>
          <h2 className="text-4xl font-heading font-black text-foreground mb-4 text-center">
            Featured Experiences
          </h2>
          <p className="text-foreground/60 max-w-2xl mx-auto text-center mb-12">
            Discover our hand-picked, most extraordinary adventures designed for
            the bold.
          </p>
        </ScrollReveal>

        {featuredExperiences.length > 0 ? (
          <ScrollReveal>
            <Carousel>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {featuredExperiences.map((exp: any) => (
                <div
                  key={exp.id}
                  className="w-[85vw] sm:w-[350px] md:w-[400px] shrink-0 snap-start"
                >
                  <ExperienceCard experience={exp} />
                </div>
              ))}
            </Carousel>
          </ScrollReveal>
        ) : (
          <div className="text-center py-12">
            <p className="text-foreground/60">
              We are currently curating an amazing selection of featured trips.
              Stay tuned!
            </p>
          </div>
        )}
      </div>

      <div className="relative py-12">
        <ImpactStats dynamicData={dynamicStats} />
      </div>

      {/* Featured Stories Section */}
      <div className="py-24 bg-foreground/[0.015] border-y border-white/[0.02] relative px-4 md:px-12 lg:px-16">
        <div className="w-full">
          <ScrollReveal direction="left" variant="blur">
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
                href="/blog"
                className="hidden md:inline-flex items-center px-6 py-3 bg-primary/10 text-primary font-bold rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                View All Stories
              </Link>
            </div>
          </ScrollReveal>

          {recentBlogs.length > 0 ? (
            <ScrollReveal>
              <Carousel>
                {recentBlogs.map((blog) => (
                  <div
                    key={blog.id}
                    className="w-[85vw] sm:w-[350px] md:w-[400px] shrink-0 snap-start h-full flex flex-col"
                  >
                    <Link
                      href={`/blog/${blog.slug}`}
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
                  </div>
                ))}
              </Carousel>
            </ScrollReveal>
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
              href="/blog"
              className="inline-flex items-center px-8 py-3.5 bg-primary text-primary-foreground font-bold rounded-full transition-transform hover:scale-105 shadow-xl shadow-primary/20"
            >
              View All Stories
            </Link>
          </div>
        </div>
      </div>

      <Testimonials />

      <div className="py-20 px-4 md:px-12 lg:px-16 relative z-10 font-heading">
        <ScrollReveal direction="up">
          <CustomTripForm />
        </ScrollReveal>
      </div>
    </main>
  );
}
