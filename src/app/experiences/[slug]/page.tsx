import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import {
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Mountain,
  Check,
  CalendarDays,
  Activity,
  Image as ImageIcon,
} from "lucide-react";
import BookNowButton from "@/components/booking/BookNowButton";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const experience = await prisma.experience.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      images: true,
      location: true,
    },
  });

  if (!experience) return { title: "Experience Not Found" };

  const ogImage = experience.images?.[0] || "/param-logo.png";

  return {
    title: experience.title,
    description:
      experience.description ||
      `Explore ${experience.title} in ${experience.location || "India"} with Param Adventures.`,
    openGraph: {
      title: experience.title,
      description: experience.description || undefined,
      images: [{ url: ogImage, alt: experience.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: experience.title,
      description: experience.description || undefined,
      images: [ogImage],
    },
  };
}

export default async function ExperienceDetailPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  const experience = await prisma.experience.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
    },
  });

  if (!experience || experience.status !== "PUBLISHED") {
    notFound();
  }

  const primaryMedia =
    experience.images[0] || "https://picsum.photos/seed/placeholder/1920/1080";
  const isVideo = /\.(mp4|webm)$/i.exec(primaryMedia);

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] w-full mt-16 group">
        <div className="absolute inset-0 z-0 bg-black">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
          {isVideo ? (
            <video
              src={primaryMedia}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryMedia}
              alt={experience.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-12">
          <div className="flex flex-wrap gap-2 mb-4">
            {experience.categories.map((c) => (
              <span
                key={c.category.id}
                className="bg-primary/90 backdrop-blur-md text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-lg"
              >
                {c.category.name}
              </span>
            ))}
            <span className="bg-background/80 backdrop-blur-md text-foreground px-4 py-1.5 rounded-full text-sm font-bold border border-border shadow-lg">
              Difficulty: {experience.difficulty}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-black text-white leading-tight drop-shadow-2xl max-w-4xl">
            {experience.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 mt-6 text-white font-medium text-lg drop-shadow-md">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> {experience.location}
            </div>
            <div className="flex items-center gap-2">
              {experience.durationDays} Days /{" "}
              {experience.durationDays > 1 ? experience.durationDays - 1 : 0}{" "}
              Nights
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-16">
          {/* About */}
          <section>
            <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
              <Mountain className="w-8 h-8 text-primary" />
              The Experience
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed whitespace-pre-line">
              {experience.description}
            </p>
          </section>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium">
                  Duration
                </p>
                <p className="font-bold">{experience.durationDays} Days</p>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium">
                  Difficulty
                </p>
                <p className="font-bold">{experience.difficulty}</p>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium">
                  Group Size
                </p>
                <p className="font-bold">Max {experience.capacity}</p>
              </div>
            </div>
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium">
                  Best Season
                </p>
                <p className="font-bold">Year Round</p>
              </div>
            </div>
          </section>

          {/* Itinerary */}
          {Array.isArray(experience.itinerary) &&
            experience.itinerary.length > 0 && (
              <section>
                <h2 className="text-3xl font-heading font-bold mb-8 flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-primary" />
                  Detailed Itinerary
                </h2>
                <div className="space-y-6">
                  {(experience.itinerary as any[]).map(
                    (dayItem: any, index: number) => (
                      <div
                        key={dayItem.id || dayItem._id || `day-${index}`}
                        className="relative pl-8 md:pl-0"
                      >
                        <div className="hidden md:flex absolute left-0 top-0 bottom-0 w-12 flex-col items-center">
                          <div className="h-full w-px bg-border"></div>
                        </div>
                        <div className="md:ml-12 bg-card border border-border rounded-2xl p-6 relative group hover:border-primary/50 transition-colors">
                          <div className="absolute -left-11 md:-left-12 top-6 w-6 h-6 rounded-full border-4 border-background bg-primary z-10"></div>
                          <h3 className="text-xl font-bold mb-2 flex items-center gap-3">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-black text-sm flex-shrink-0">
                              {index + 1}
                            </span>
                            <span>
                              <span className="text-primary/60 text-sm font-semibold uppercase tracking-widest block leading-none mb-0.5">
                                Day {index + 1}
                              </span>
                              {dayItem.title}
                            </span>
                          </h3>
                          <p className="text-foreground/70 leading-relaxed whitespace-pre-line">
                            {dayItem.description}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}

          {/* Gallery */}
          {experience.images.length > 1 && (
            <section>
              <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                <ImageIcon className="w-8 h-8 text-primary" />
                Visual Gallery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {experience.images.slice(1).map((url) => (
                  <div
                    key={url}
                    className="aspect-square rounded-2xl overflow-hidden bg-muted relative group"
                  >
                    {/\.(mp4|webm)$/i.exec(url) ? (
                      <video
                        src={url}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt=""
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Sticky Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-card border border-border rounded-3xl p-8 shadow-2xl shadow-black/5">
            <h3 className="text-2xl font-bold mb-2 font-heading">
              Reserve Your Spot
            </h3>
            <p className="text-foreground/60 mb-6">
              Join the waitlist for the next departure date.
            </p>

            <div className="flex items-end gap-2 mb-8 pb-8 border-b border-border">
              <span className="text-4xl font-black flex items-center">
                <IndianRupee className="w-8 h-8" />
                {Number(experience.basePrice as any).toLocaleString("en-IN")}
              </span>
              <span className="text-foreground/50 font-medium mb-1">
                / person
              </span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                <Check className="w-5 h-5 text-green-500 shrink-0" /> Includes
                local expert guides
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                <Check className="w-5 h-5 text-green-500 shrink-0" /> All safety
                gear & permits
              </li>
              <li className="flex items-start gap-3 text-sm text-foreground/80 font-medium">
                <Check className="w-5 h-5 text-green-500 shrink-0" /> Nutritious
                trail meals
              </li>
            </ul>

            <BookNowButton
              experienceId={experience.id}
              experienceTitle={experience.title}
              experienceSlug={experience.slug}
              basePrice={Number(experience.basePrice)}
              maxCapacity={experience.capacity}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
