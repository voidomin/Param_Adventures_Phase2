import { prisma } from "@/lib/db";
import { withBuildSafety } from "@/lib/db-utils";
import { getMediaUrl } from "@/lib/media/media-gateway";

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { 
  Mountain, 
  MapPin, 
  Clock, 
  Check, 
  Users, 
  Baby, 
  Backpack, 
  Info, 
  Shield, 
  IndianRupee, 
  Wifi, 
  Banknote, 
  Activity, 
  CarFront, 
  Tent, 
  X, 
  ChevronDown, 
  CalendarDays,
  Footprints,
  Utensils
} from "lucide-react";
import type { MediaSettings } from "@/types/media";
import { getPlainTextFromJSON } from "@/lib/utils/rich-text";
import BookNowButton from "@/components/booking/BookNowButton";
import ExperienceReviews from "@/components/experiences/ExperienceReviews";
import SaveButton from "@/components/experiences/SaveButton";
import SimilarTrips from "@/components/experiences/SimilarTrips";
import Image from "next/image";
import ExperienceGallery from "@/components/experiences/ExperienceGallery";
import MobileBookingBar from "@/components/booking/MobileBookingBar";
import ExperienceStickyNav from "@/components/experiences/ExperienceStickyNav";
import DifficultyMeter, { type DifficultyLevel } from "@/components/experiences/DifficultyMeter";
import RichTextRenderer from "@/components/blog/RichTextRenderer";
import DownloadItineraryBtn from "@/components/experiences/DownloadItineraryBtn";
import ShareButton from "@/components/ui/ShareButton";
import type { RichTextNode } from "@/lib/utils/rich-text";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const experience = await withBuildSafety(
    () =>
      prisma.experience.findUnique({
        where: { slug },
        select: {
          title: true,
          description: true,
          coverImage: true,
          cardImage: true,
          images: true,
          location: true,
        },
      }),
    null,
  );

  if (!experience) return { title: "Experience Not Found" };

  const ogImage =
    experience.coverImage ||
    experience.cardImage ||
    experience.images?.[0] ||
    "/param-logo.png";

  const description =
    experience.description && typeof experience.description === "object"
      ? getPlainTextFromJSON(experience.description as RichTextNode)
      : String(experience.description || "");

  const finalDescription =
    description ||
    `Explore ${experience.title} in ${experience.location || "India"} with Param Adventures.`;

  return {
    title: experience.title,
    description: finalDescription,
    keywords: [
      experience.title,
      experience.location || "",
      "trekking",
      "adventure",
      "Param Adventures",
    ],
    alternates: {
      canonical: `/experiences/${slug}`,
    },
    openGraph: {
      title: experience.title,
      description: finalDescription,
      images: [{ url: ogImage, alt: experience.title }],
      type: "website",
      siteName: "Param Adventures",
    },
    twitter: {
      card: "summary_large_image",
      title: experience.title,
      description: finalDescription,
      images: [ogImage],
    },
  };
}

interface CategoryWithRelation {
  category: {
    id: string;
    name: string;
  };
}

interface ItineraryDay {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  meals?: string[] | string;
  accommodation?: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface ExperienceWithInclusions {
  id: string;
  title: string;
  slug: string;
  description: RichTextNode; // Rich text JSON
  coverImage: string | null;
  cardImage: string | null;
  images: string[];
  location: string;
  basePrice: number;
  durationDays: number;
  capacity: number;
  difficulty: DifficultyLevel;
  status: string;
  maxGroupSize?: number | null;
  minAge?: number | null;
  ageRange?: string | null;
  highlights?: string[];
  itinerary: ItineraryDay[];
  inclusions?: string[];
  exclusions?: string[];
  thingsToCarry?: string[];
  faqs?: FAQ[];
  cancellationPolicy?: string | null;
  meetingPoint?: string | null;
  meetingTime?: string | null;
  dropoffTime?: string | null;
  maxAltitude?: string | null;
  trekDistance?: string | null;
  bestTimeToVisit?: string | null;
  networkConnectivity?: string | null;
  lastAtm?: string | null;
  fitnessRequirement?: string | null;
  vibeTags?: string[];
  pickupPoints?: string[];
  dropPoints?: string[];
  categories: CategoryWithRelation[];
}

type ExperienceJsonLdProps = {
  experience: ExperienceWithInclusions;
  url: string;
  description: string;
};

function ExperienceJsonLd({
  experience,
  url,
  description,
}: Readonly<ExperienceJsonLdProps>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: experience.title,
    description: description,
    image: experience.coverImage || experience.images[0],
    offers: {
      "@type": "Offer",
      price: experience.basePrice,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: url,
    },
    brand: {
      "@type": "Brand",
      name: "Param Adventures",
    },
    location: {
      "@type": "Place",
      name: experience.location,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Helper components to reduce page complexity
function HeroTags({ experience }: Readonly<{ experience: ExperienceWithInclusions }>) {
  return (
    <div className="flex gap-2 mb-8 bg-foreground/2 p-4 pb-20 md:pb-4 rounded-2xl border border-border/50 overflow-x-auto md:overflow-visible md:flex-wrap no-scrollbar snap-x relative z-30">
      {experience.categories.map((c: CategoryWithRelation) => (
        <span
          key={c.category.id}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-sm snap-start whitespace-nowrap"
        >
          {c.category.name}
        </span>
      ))}
      {experience.vibeTags?.map((tag: string) => (
        <span
          key={tag}
          className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold border border-primary/20 shadow-sm flex items-center gap-1.5 snap-start whitespace-nowrap"
        >
          {tag}
        </span>
      ))}
      <div className="snap-start whitespace-nowrap relative">
        <DifficultyMeter difficulty={experience.difficulty} />
      </div>
      {experience.maxGroupSize && (
        <span className="bg-background text-foreground px-4 py-1.5 rounded-full text-sm font-bold border border-border shadow-sm flex items-center gap-1.5 snap-start whitespace-nowrap">
          <Users className="w-4 h-4 text-primary" /> Max Group:{" "}
          {experience.maxGroupSize}
        </span>
      )}
      {(experience.minAge || experience.ageRange) && (
        <span className="bg-background text-foreground px-4 py-1.5 rounded-full text-sm font-bold border border-border shadow-sm flex items-center gap-1.5 snap-start whitespace-nowrap">
          <Baby className="w-4 h-4 text-primary" /> Age:{" "}
          {experience.minAge || experience.ageRange}+
        </span>
      )}
    </div>
  );
}

function EssentialLogistics({ experience }: Readonly<{ experience: ExperienceWithInclusions }>) {
  if (
    !experience.networkConnectivity &&
    !experience.lastAtm &&
    !experience.fitnessRequirement &&
    !experience.ageRange &&
    !experience.meetingTime &&
    !experience.dropoffTime
  )
    return null;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {experience.networkConnectivity && (
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors">
          <Wifi className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-foreground/60 font-medium">
              Network/Wifi
            </p>
            <p className="font-bold text-sm leading-tight">
              {experience.networkConnectivity}
            </p>
          </div>
        </div>
      )}
      {experience.lastAtm && (
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors">
          <Banknote className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-foreground/60 font-medium">Last ATM</p>
            <p className="font-bold text-sm leading-tight">
              {experience.lastAtm}
            </p>
          </div>
        </div>
      )}
      {experience.fitnessRequirement && (
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors">
          <Activity className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-foreground/60 font-medium">Fitness</p>
            <p className="font-bold text-sm leading-tight">
              {experience.fitnessRequirement}
            </p>
          </div>
        </div>
      )}
      {experience.ageRange && (
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-foreground/60 font-medium">Age Range</p>
            <p className="font-bold text-sm leading-tight">
              {experience.ageRange}
            </p>
          </div>
        </div>
      )}
      {(experience.meetingTime || experience.meetingPoint) && (
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors col-span-2">
          <CarFront className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-foreground/60 font-medium">
              Meeting Point & Time
            </p>
            <p className="font-bold text-sm leading-tight">
              {experience.meetingPoint} &bull; {experience.meetingTime}
            </p>
          </div>
        </div>
      )}
      {experience.dropoffTime && (
        <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors col-span-2">
          <MapPin className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-foreground/60 font-medium">
              Drop-off Time
            </p>
            <p className="font-bold text-sm leading-tight">
              {experience.meetingPoint} &bull; {experience.dropoffTime}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ItinerarySection({ itinerary }: Readonly<{ itinerary: ItineraryDay[] }>) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null;

  return (
    <section id="itinerary" className="scroll-mt-32">
      <h2 className="text-3xl font-heading font-bold mb-8 flex items-center gap-3">
        <MapPin className="w-8 h-8 text-primary" />
        Detailed Itinerary
      </h2>
      <div className="space-y-6">
        {itinerary.map((dayItem: ItineraryDay, index: number) => (
          <div
            key={dayItem.id || dayItem._id || `day-${index}`}
            className="relative pl-8 md:pl-0"
          >
            <div className="hidden md:flex absolute left-0 top-0 bottom-0 w-12 flex-col items-center">
              <div className="h-full w-px bg-border"></div>
            </div>
            <details className="md:ml-12 bg-card border border-border rounded-2xl relative group hover:border-primary/50 transition-colors [&_summary::-webkit-details-marker]:hidden">
              <div className="absolute -left-11 md:-left-12 top-6 w-6 h-6 rounded-full border-4 border-background bg-primary z-10"></div>
              <summary className="p-6 cursor-pointer select-none outline-none flex items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
                <h3 className="text-xl font-bold flex items-center gap-3 m-0">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-black text-sm shrink-0">
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
                {(dayItem.meals || dayItem.accommodation) && (
                  <div className="mt-4 pt-4 border-t border-border/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {dayItem.meals &&
                      (Array.isArray(dayItem.meals)
                        ? dayItem.meals.length > 0
                        : true) && (
                        <div className="flex items-start gap-2 text-foreground/80 bg-background/50 p-3 rounded-xl border border-border/30">
                          <Utensils className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>
                            <strong className="block text-xs uppercase tracking-wider text-foreground/50 mb-0.5">
                              Meals Included
                            </strong>
                            {Array.isArray(dayItem.meals)
                              ? dayItem.meals.join(", ")
                              : dayItem.meals}
                          </span>
                        </div>
                      )}
                    {dayItem.accommodation && (
                      <div className="flex items-start gap-2 text-foreground/80 bg-background/50 p-3 rounded-xl border border-border/30">
                        <Tent className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>
                          <strong className="block text-xs uppercase tracking-wider text-foreground/50 mb-0.5">
                            Accommodation
                          </strong>
                          {dayItem.accommodation}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}

function InclusionsExclusions({
  inclusions,
  exclusions,
}: Readonly<{
  inclusions: string[] | undefined;
  exclusions: string[] | undefined;
}>) {
  const hasInclusions = Array.isArray(inclusions) && inclusions.length > 0;
  const hasExclusions = Array.isArray(exclusions) && exclusions.length > 0;

  if (!hasInclusions && !hasExclusions) return null;

  return (
    <section
      id="inclusions"
      className="grid grid-cols-1 md:grid-cols-2 gap-8 scroll-mt-32"
    >
      {hasInclusions && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-3xl p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-green-500/90">
            <Check className="w-6 h-6" /> What&apos;s Included
          </h3>
          <ul className="space-y-4">
            {inclusions.map((item: string) => (
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
      )}
      {hasExclusions && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-red-500/90">
            <X className="w-6 h-6" /> What&apos;s Not Included
          </h3>
          <ul className="space-y-4">
            {exclusions.map((item: string) => (
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
      )}
    </section>
  );
}

export default async function ExperienceDetailPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  const dbPlatformSettings = await withBuildSafety(
    () => prisma.platformSetting.findMany({
      where: {
        key: {
          in: ["media_provider", "cloudinary_cloud_name", "s3_bucket", "s3_region", "media_quality", "media_high_fidelity"]
        }
      }
    }),
    []
  );

  const mediaSettings: MediaSettings = {
    provider: (dbPlatformSettings.find(s => s.key === "media_provider")?.value || "CLOUDINARY") as "CLOUDINARY" | "AWS_S3",
    cloudinaryCloudName: dbPlatformSettings.find(s => s.key === "cloudinary_cloud_name")?.value,
    s3Bucket: dbPlatformSettings.find(s => s.key === "s3_bucket")?.value,
    s3Region: dbPlatformSettings.find(s => s.key === "s3_region")?.value,
    globalQuality: Number.parseInt(dbPlatformSettings.find(s => s.key === "media_quality")?.value || "100"),
    highFidelity: dbPlatformSettings.find(s => s.key === "media_high_fidelity")?.value === "true"
  };

  const experience = await withBuildSafety(
    () =>
      prisma.experience.findUnique({
        where: { slug },
        include: {
          categories: { include: { category: true } },
          slots: {
            where: {
              date: { gte: new Date() },
              status: "UPCOMING",
            },
            orderBy: { date: "asc" },
          },
        },
      }),
    null,
  );

  if (!experience) {
    notFound();
  }

  // Cast after null check for type safety
  const exp = experience as unknown as ExperienceWithInclusions;

  const description =
    exp.description && typeof exp.description === "object"
      ? getPlainTextFromJSON(exp.description as unknown as RichTextNode)
      : String(exp.description || "");

  const finalDescription =
    description ||
    `Explore ${exp.title} in ${exp.location || "India"} with Param Adventures.`;

  const primaryMedia =
    exp.coverImage ||
    exp.images[0] ||
    "https://picsum.photos/seed/placeholder/1920/1080";
  
  const isVideo = /\.(mp4|webm)$/i.exec(primaryMedia);

  const heroMediaUrl = getMediaUrl(
    primaryMedia,
    mediaSettings.provider,
    {
       cloudinaryCloudName: mediaSettings.cloudinaryCloudName,
       s3Bucket: mediaSettings.s3Bucket,
       s3Region: mediaSettings.s3Region,
       globalQuality: mediaSettings.globalQuality,
       highFidelity: mediaSettings.highFidelity
    }
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <ExperienceJsonLd
        experience={exp}
        url={`${process.env.NEXT_PUBLIC_APP_URL || ""}/experiences/${slug}`}
        description={finalDescription}
      />
      {/* Hero Section */}
      <section className="relative h-[65vh] md:h-[75vh] lg:h-[80vh] w-full mt-0">
        <div className="absolute inset-0 z-0 bg-black">
          {isVideo ? (
            <video
              src={heroMediaUrl}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <div className="relative w-full h-full">
              <Image
                src={heroMediaUrl}
                alt={exp.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>
          )}

          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/90 via-black/40 to-transparent z-10" />

        </div>

        {/* Action Buttons - Standardized positioning */}
        <div className="absolute top-24 right-6 md:top-28 md:right-8 z-40 flex items-center gap-3">
          <SaveButton
            experienceId={exp.id}
            className="scale-110"
          />
          <ShareButton
            title={exp.title}
            className="scale-110"
            variant="outline"
          />
        </div>

        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 flex flex-col">
          {/* Safe zone for fixed navbar */}
          <div className="h-24 md:h-32 lg:h-40 shrink-0" />

          <div className="flex-1 flex flex-col justify-end pb-12">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-black text-white leading-tight drop-shadow-2xl max-w-4xl">
            {exp.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 mt-6 text-white font-medium text-lg drop-shadow-md">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> {exp.location}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />{" "}
              {exp.durationDays} Days /{" "}
              {exp.durationDays > 1 ? exp.durationDays - 1 : 0}{" "}
              Nights
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-16 min-w-0">
          <ExperienceStickyNav
            sections={[
              { id: "about", label: "About" },
              ...(Array.isArray(exp.itinerary) &&
              exp.itinerary.length > 0
                ? [{ id: "itinerary", label: "Itinerary" }]
                : []),
              ...((Array.isArray(exp.inclusions) &&
                exp.inclusions.length > 0) ||
              (Array.isArray(exp.exclusions) &&
                exp.exclusions.length > 0)
                ? [{ id: "inclusions", label: "Inclusions" }]
                : []),
              ...(Array.isArray(exp.thingsToCarry) &&
              exp.thingsToCarry.length > 0
                ? [{ id: "things-to-carry", label: "Things to Carry" }]
                : []),
              ...(exp.images?.length > 0
                ? [{ id: "gallery", label: "Gallery" }]
                : []),
              ...(Array.isArray(exp.faqs) && exp.faqs.length > 0
                ? [{ id: "faqs", label: "FAQs" }]
                : []),
              { id: "reviews", label: "Reviews" },
            ]}
          />

          {/* About */}
          <section id="about" className="scroll-mt-32">
            <HeroTags experience={exp} />
            <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
              <Mountain className="w-8 h-8 text-primary" />
              The Experience
            </h2>
            {exp.highlights && exp.highlights.length > 0 && (
              <div className="mb-6 space-y-3 bg-primary/5 border border-primary/20 p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-foreground mb-4">
                  Trip Highlights
                </h3>
                <ul className="space-y-3">
                  {exp.highlights.map((item: string, i: number) => (
                    <li
                      key={`highlight-${i}-${item.substring(0, 10)}`}
                      className="flex items-start gap-3 text-foreground/80 font-medium"
                    >
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-lg text-foreground/80 leading-relaxed">
              <RichTextRenderer content={exp.description as unknown as RichTextNode} />
            </div>
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
                <p className="font-bold">{exp.durationDays} Days</p>
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
                <p className="font-bold">{exp.maxAltitude || "N/A"}</p>
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
                <p className="font-bold">{exp.trekDistance || "N/A"}</p>
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
                  {exp.bestTimeToVisit || "Year Round"}
                </p>
              </div>
            </div>
          </section>

          <EssentialLogistics experience={exp as unknown as ExperienceWithInclusions} />

          <ItinerarySection itinerary={exp.itinerary as unknown as ItineraryDay[]} />

          <InclusionsExclusions
            inclusions={exp.inclusions as unknown as string[]}
            exclusions={exp.exclusions as unknown as string[]}
          />

          {/* Things to Carry */}
          {Array.isArray(exp.thingsToCarry) &&
            exp.thingsToCarry.length > 0 && (
              <section
                id="things-to-carry"
                className="bg-card border border-border rounded-3xl p-8 shadow-sm scroll-mt-32"
              >
                <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                  <Backpack className="w-8 h-8 text-primary" />
                  Things to Carry
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                  {exp.thingsToCarry.map((item) => (
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
          {exp.images.length > 0 && (
            <section id="gallery" className="scroll-mt-32">
              <ExperienceGallery 
                images={exp.images} 
                mediaSettings={mediaSettings} 
              />
            </section>
          )}

          {/* FAQs */}
          {Array.isArray(exp.faqs) && exp.faqs.length > 0 && (
            <section id="faqs" className="bg-background pt-4 scroll-mt-32">
              <h2 className="text-3xl font-heading font-bold mb-8 flex items-center gap-3">
                <Info className="w-8 h-8 text-primary" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {(exp.faqs as unknown as FAQ[]).map((faq, _ix) => (
                  <details
                    key={`${_ix}-${faq.question}`}
                    className="group bg-card border border-border rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer font-bold text-lg select-none hover:bg-foreground/5 transition-colors list-none [&::-webkit-details-marker]:hidden">
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
          {exp.cancellationPolicy && (
            <section className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-500/90">
                <Shield className="w-6 h-6" /> Cancellation Policy
              </h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-line text-sm">
                {exp.cancellationPolicy}
              </p>
            </section>
          )}

          {/* User Reviews */}
          <section
            id="reviews"
            className="pt-8 border-t border-border scroll-mt-32"
          >
            <ExperienceReviews slug={exp.slug} />
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
                {Number(exp.basePrice).toLocaleString("en-IN")}
              </span>
              <span className="text-foreground/50 font-medium mb-1">
                / person
              </span>
            </div>

            <BookNowButton
              experienceId={exp.id}
              experienceTitle={exp.title}
              experienceSlug={exp.slug}
              basePrice={Number(exp.basePrice)}
              maxCapacity={exp.capacity}
              pickupPoints={exp.pickupPoints || []}
            />

            <SimilarTrips
              currentExperienceId={exp.id}
              categoryIds={exp.categories.map((c: CategoryWithRelation) => c.category.id)}
              mediaSettings={mediaSettings}
            />

            <DownloadItineraryBtn slug={exp.slug} />
          </div>
        </div>
      </div>

      <MobileBookingBar
        experienceId={exp.id}
        experienceTitle={exp.title}
        experienceSlug={exp.slug}
        basePrice={Number(exp.basePrice)}
        maxCapacity={exp.capacity}
        pickupPoints={exp.pickupPoints || []}
      />
    </div>
  );
}
