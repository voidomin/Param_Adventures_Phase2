import { prisma } from "@/lib/db";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Mountain,
  Check,
  CalendarDays,
  Image as ImageIcon,
  Info,
  Shield,
  X,
  Footprints,
  Baby,
  Backpack,
  ChevronDown,
} from "lucide-react";
import BookNowButton from "@/components/booking/BookNowButton";
import ExperienceReviews from "@/components/experiences/ExperienceReviews";
import SaveButton from "@/components/experiences/SaveButton";
import SimilarTrips from "@/components/experiences/SimilarTrips";

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
      coverImage: true,
      cardImage: true,
      images: true,
      location: true,
    },
  });

  if (!experience) return { title: "Experience Not Found" };

  const ogImage =
    experience.coverImage ||
    experience.cardImage ||
    experience.images?.[0] ||
    "/param-logo.png";

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
    experience.coverImage ||
    experience.images[0] ||
    "https://picsum.photos/seed/placeholder/1920/1080";
  const isVideo = /\.(mp4|webm)$/i.exec(primaryMedia);

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] w-full mt-16 group">
        <div className="absolute inset-0 z-0 bg-black">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

          <SaveButton
            experienceId={experience.id}
            className="top-6 right-6 md:top-8 md:right-8 z-30 scale-125"
          />
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
            {experience.maxGroupSize && (
              <span className="bg-background/80 backdrop-blur-md text-foreground px-4 py-1.5 rounded-full text-sm font-bold border border-border shadow-lg flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Max Group:{" "}
                {experience.maxGroupSize}
              </span>
            )}
            {experience.minAge !== null && experience.minAge !== undefined && (
              <span className="bg-background/80 backdrop-blur-md text-foreground px-4 py-1.5 rounded-full text-sm font-bold border border-border shadow-lg flex items-center gap-1.5">
                <Baby className="w-4 h-4" /> Age {experience.minAge}+
              </span>
            )}
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
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium whitespace-nowrap">
                  Duration
                </p>
                <p className="font-bold">{experience.durationDays} Days</p>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Mountain className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium whitespace-nowrap">
                  Max Altitude
                </p>
                <p className="font-bold">{experience.maxAltitude || "N/A"}</p>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Footprints className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium whitespace-nowrap">
                  Trek Distance
                </p>
                <p className="font-bold">{experience.trekDistance || "N/A"}</p>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium whitespace-nowrap">
                  Best Season
                </p>
                <p className="font-bold">
                  {experience.bestTimeToVisit || "Year Round"}
                </p>
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
                  {(experience.itinerary as Record<string, any>[]).map(
                    (dayItem: Record<string, any>, index: number) => (
                      <div
                        key={dayItem.id || dayItem._id || `day-${index}`}
                        className="relative pl-8 md:pl-0"
                      >
                        <div className="hidden md:flex absolute left-0 top-0 bottom-0 w-12 flex-col items-center">
                          <div className="h-full w-px bg-border"></div>
                        </div>
                        <details className="md:ml-12 bg-card border border-border rounded-2xl relative group hover:border-primary/50 transition-colors [&_summary::-webkit-details-marker]:hidden">
                          <div className="absolute -left-11 md:-left-12 top-6 w-6 h-6 rounded-full border-4 border-background bg-primary z-10"></div>
                          <summary className="p-6 cursor-pointer select-none outline-none flex items-center justify-between gap-4">
                            <h3 className="text-xl font-bold flex items-center gap-3 m-0">
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
                            <ChevronDown className="w-5 h-5 text-primary transition-transform duration-300 group-open:-rotate-180 shrink-0" />
                          </summary>
                          <div className="px-6 pb-6 pt-0">
                            <p className="text-foreground/70 leading-relaxed whitespace-pre-line border-t border-border/10 pt-4">
                              {dayItem.description}
                            </p>
                          </div>
                        </details>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}

          {/* Logistics Split Section: Inclusions & Exclusions */}
          {(Array.isArray(experience.inclusions) &&
            experience.inclusions.length > 0) ||
          (Array.isArray(experience.exclusions) &&
            experience.exclusions.length > 0) ? (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Inclusions */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-green-500/90">
                  <Check className="w-6 h-6" /> What's Included
                </h3>
                <ul className="space-y-4">
                  {(experience.inclusions as string[]).map((item, ix) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-foreground/80"
                    >
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Exclusions */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-red-500/90">
                  <X className="w-6 h-6" /> What's Not Included
                </h3>
                <ul className="space-y-4">
                  {(experience.exclusions as string[]).map((item, ix) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-foreground/80"
                    >
                      <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {/* Things to Carry */}
          {Array.isArray(experience.thingsToCarry) &&
            experience.thingsToCarry.length > 0 && (
              <section className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                  <Backpack className="w-8 h-8 text-primary" />
                  Things to Carry
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                  {(experience.thingsToCarry as string[]).map((item, ix) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 border-b border-border/50 pb-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                      <span className="text-foreground/80 font-medium">
                        {item}
                      </span>
                    </div>
                  ))}
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

          {/* FAQs */}
          {Array.isArray(experience.faqs) && experience.faqs.length > 0 && (
            <section className="bg-background pt-4">
              <h2 className="text-3xl font-heading font-bold mb-8 flex items-center gap-3">
                <Info className="w-8 h-8 text-primary" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {(
                  experience.faqs as { question: string; answer: string }[]
                ).map((faq, ix) => (
                  <details
                    key={faq.question}
                    className="group bg-card border border-border rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer font-bold text-lg select-none hover:bg-foreground/5 transition-colors">
                      {faq.question}
                      <ChevronDown className="w-5 h-5 text-primary transition-transform duration-300 group-open:-rotate-180 shrink-0" />
                    </summary>
                    <div className="p-6 pt-0 text-foreground/70 leading-relaxed border-t border-border/10 bg-foreground/5">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Policies */}
          {experience.cancellationPolicy && (
            <section className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-500/90">
                <Shield className="w-6 h-6" /> Cancellation Policy
              </h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line text-sm">
                {experience.cancellationPolicy}
              </p>
            </section>
          )}

          {/* User Reviews */}
          <section className="pt-8 border-t border-border">
            <ExperienceReviews slug={experience.slug} />
          </section>
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

            <BookNowButton
              experienceId={experience.id}
              experienceTitle={experience.title}
              experienceSlug={experience.slug}
              basePrice={Number(experience.basePrice)}
              maxCapacity={experience.capacity}
            />

            <SimilarTrips
              currentExperienceId={experience.id}
              categoryIds={experience.categories.map((c) => c.category.id)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
