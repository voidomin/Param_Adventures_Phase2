import { prisma } from "@/lib/db";
import { withBuildSafety } from "@/lib/db-utils";
import { getMediaUrl } from "@/lib/media/media-gateway";
import Link from "next/link";

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
  Wifi, 
  Activity, 
  CarFront, 
  Tent, 
  X, 
  ChevronDown, 
  CalendarDays,
  Footprints,
  Utensils,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  LucideIcon
} from "lucide-react";
import type { MediaSettings } from "@/types/media";
import { getPlainTextFromJSON } from "@/lib/utils/rich-text";
import BookingSidebarCard from "@/components/booking/BookingSidebarCard";
import ExperienceReviews from "@/components/experiences/ExperienceReviews";
import SaveButton from "@/components/experiences/SaveButton";
import SimilarTrips from "@/components/experiences/SimilarTrips";
import Image from "next/image";
import ExperienceGallery from "@/components/experiences/ExperienceGallery";
import MobileBookingBar from "@/components/booking/MobileBookingBar";
import ExperienceStickyNav from "@/components/experiences/ExperienceStickyNav";
import DifficultyMeter, { type DifficultyLevel } from "@/components/experiences/DifficultyMeter";
import RichTextRenderer from "@/components/blog/RichTextRenderer";
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
          status: true,
          deletedAt: true,
        },
      }),
    null,
  );

  if (!experience || experience.status === "DRAFT" || experience.status === "ARCHIVED" || !!experience.deletedAt) {
    return { title: "Experience Not Found" };
  }

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
  description: string | object;
  meals?: string[] | string;
  accommodation?: string;
  transportMode?: string;
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
  thingsToKeepInMind?: string[];
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

const CANCELLATION_TEMPLATES = {
  one_two_days: {
    title: "One- & Two-Days Treks or Trips Policy",
    headers: ["Policy", "21 days Prior", "20-16 days", "15-6 days", "5-0 days"],
    rows: [
      ["Batch Shifting", "✔", "✔", "✘", "✘"],
      ["Cancellation Charge", "Free Cancellation", "25% of the Trip Amount", "50% of the Trip Amount", "100% of the Trip Amount"],
      ["Booking Amount", "Refunded in mode of original payment", "Adjusted in Refund Deduction", "Adjusted in Refund Deduction", "No Refund"],
      ["Remaining Amount", "Full Refund (deduction of 5% booking amount)", "Refund, deduction 25% of the trip amount", "Refund, deduction 50% of the trip amount", "No Refund"]
    ]
  },
  multi_days: {
    title: "Multiple Days Treks or Trips Policy",
    headers: ["Policy", "46 days Prior", "45-31 days", "30-21 days", "20-0 days"],
    rows: [
      ["Batch Shifting", "✔", "✘", "✘", "✘"],
      ["Cancellation Charge", "Free Cancellation", "50% of the Trip Amount", "75% of the Trip Amount", "100% of the Trip Amount"],
      ["Booking Amount", "Refunded in mode of original payment", "Adjusted in Refund Deduction", "Adjusted in Refund Deduction", "No Refund"],
      ["Remaining Amount", "Full Refund (deduction of 5% booking amount)", "Refund, deduction 50% of the trip amount", "Refund, deduction 75% of the trip amount", "No Refund"]
    ]
  },
  international: {
    title: "International Treks & Trips Policy",
    headers: ["Policy", "61 days Prior", "60-46 days", "45-31 days", "30-0 days"],
    rows: [
      ["Batch Shifting", "✔", "✘", "✘", "✘"],
      ["Cancellation Charge", "Free Cancellation", "50% of the Trip Amount", "75% of the Trip Amount", "100% of the Trip Amount"],
      ["Booking Amount", "Refunded in mode of original payment", "Adjusted in Refund Deduction", "Adjusted in Refund Deduction", "No Refund"],
      ["Remaining Amount", "Full Refund (deduction of 10% booking amount)", "Refund, deduction 50% of the trip amount", "Refund, deduction 75% of the trip amount", "No Refund"]
    ]
  }
};

const CANCEL_POLICY_OPTIONS = [
  {
    id: "gst",
    label: "GST",
    defaultText: "GST and convenience charges are non-refundable under all circumstances.",
    icon: "AlertTriangle",
    color: "yellow",
  },
  {
    id: "refund_processing",
    label: "Pending Refund",
    defaultText: "Eligible refunds will be processed to the original payment method within 5–7 working days after approval. Credit timelines may vary depending on your bank/payment provider.",
    icon: "CheckCircle2",
    color: "green",
  },
  {
    id: "partial_refund",
    label: "Partial Refund",
    defaultText: "Refunds, if applicable, will be calculated after deducting the non-refundable booking amount and the applicable cancellation charges.",
    icon: "Info",
    color: "gray",
  },
  {
    id: "refundable_amount",
    label: "Remaining Amount",
    defaultText: "Only the amount paid over and above the booking amount is eligible for a refund, subject to the cancellation policy.",
    icon: "Info",
    color: "gray",
  },
  {
    id: "force_majeure",
    label: "Bypass Policy",
    defaultText: "In case of natural disasters, pandemics, government restrictions, war, adverse weather, or other unforeseen events, our Emergency Case Cancellation Policy will override the standard cancellation and refund policy. Refunds, credits, or rescheduling will depend on recoveries from our vendors and service providers.",
    icon: "AlertTriangle",
    color: "red",
  },
  {
    id: "calculation_days",
    label: "Cancellation Days Calculation",
    defaultText: "The date of cancellation is counted, while the trip departure date is not counted when calculating the applicable cancellation period.",
    icon: "Info",
    color: "gray",
  }
];

const iconMap: Record<string, LucideIcon> = {
  AlertTriangle,
  CheckCircle2,
  Info,
  Shield,
};

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
    <div className="flex flex-wrap gap-2 mb-8 bg-foreground/2 p-4 rounded-2xl border border-border/50 relative z-30">
      {experience.categories.map((c: CategoryWithRelation) => (
        <span
          key={c.category.id}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-sm whitespace-nowrap"
        >
          {c.category.name}
        </span>
      ))}
      {experience.vibeTags?.map((tag: string) => (
        <span
          key={tag}
          className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold border border-primary/20 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
        >
          {tag}
        </span>
      ))}
      <div className="whitespace-nowrap relative">
        <DifficultyMeter difficulty={experience.difficulty} />
      </div>
      {!!experience.maxGroupSize && (
        <span className="bg-background text-foreground px-4 py-1.5 rounded-full text-sm font-bold border border-border shadow-sm flex items-center gap-1.5 whitespace-nowrap">
          <Users className="w-4 h-4 text-primary" /> Max Group:{" "}
          {experience.maxGroupSize}
        </span>
      )}
      {!!(experience.minAge || experience.ageRange) && (
        <span className="bg-background text-foreground px-4 py-1.5 rounded-full text-sm font-bold border border-border shadow-sm flex items-center gap-1.5 whitespace-nowrap">
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
    !experience.fitnessRequirement &&
    !experience.ageRange &&
    !experience.meetingTime &&
    !experience.dropoffTime &&
    (!experience.pickupPoints || experience.pickupPoints.length === 0) &&
    (!experience.dropPoints || experience.dropPoints.length === 0)
  )
    return null;

  const hasStats = !!(experience.networkConnectivity || experience.fitnessRequirement || experience.ageRange);
  const hasLocations = !!(experience.meetingTime || experience.meetingPoint || (experience.pickupPoints && experience.pickupPoints.length > 0) || experience.dropoffTime || (experience.dropPoints && experience.dropPoints.length > 0));

  return (
    <div className="space-y-4">
      {hasStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-start">
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
        </div>
      )}

      {hasLocations && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {(experience.meetingTime || experience.meetingPoint || (experience.pickupPoints && experience.pickupPoints.length > 0)) && (
            <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <CarFront className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-foreground/60 font-medium">
                    Starting Point
                  </p>
                  <p className="font-bold text-sm leading-tight mt-0.5">
                    {experience.meetingPoint || "Multiple options available"} {experience.meetingTime && `\u2022 ${experience.meetingTime}`}
                  </p>
                </div>
              </div>

              {experience.pickupPoints && experience.pickupPoints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between cursor-pointer text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors list-none select-none">
                      <span>Available Pickup Locations ({experience.pickupPoints.length})</span>
                      <ChevronDown className="w-4 h-4 text-primary transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="mt-2.5 flex flex-col gap-2 text-xs font-semibold text-foreground/80 max-h-52 overflow-y-auto custom-scrollbar pt-1">
                      {experience.pickupPoints.map((point) => (
                        <div key={point} className="flex items-center gap-2 bg-foreground/[0.03] border border-border/40 px-3 py-2 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {(experience.dropoffTime || (experience.dropPoints && experience.dropPoints.length > 0)) && (
            <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-2 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-foreground/60 font-medium">
                    Drop-off Details
                  </p>
                  <p className="font-bold text-sm leading-tight mt-0.5">
                    {experience.meetingPoint || "Multiple options available"} {experience.dropoffTime && `\u2022 ${experience.dropoffTime}`}
                  </p>
                </div>
              </div>

              {experience.dropPoints && experience.dropPoints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <details className="group [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between cursor-pointer text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors list-none select-none">
                      <span>Available Drop-off Locations ({experience.dropPoints.length})</span>
                      <ChevronDown className="w-4 h-4 text-primary transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="mt-2.5 flex flex-col gap-2 text-xs font-semibold text-foreground/80 max-h-52 overflow-y-auto custom-scrollbar pt-1">
                      {experience.dropPoints.map((point) => (
                        <div key={point} className="flex items-center gap-2 bg-foreground/[0.03] border border-border/40 px-3 py-2 rounded-xl hover:bg-primary/5 hover:border-primary/20 transition-all">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
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
                <div className="text-foreground/70 leading-relaxed border-t border-border/10 pt-4 prose prose-sm max-w-none">
                  {typeof dayItem.description === "string" ? (
                    <p className="whitespace-pre-line">{dayItem.description}</p>
                  ) : (
                    <RichTextRenderer content={dayItem.description} />
                  )}
                </div>
                {(dayItem.meals || dayItem.accommodation || dayItem.transportMode) && (
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
                    {dayItem.transportMode && (
                      <div className="flex items-start gap-2 text-foreground/80 bg-background/50 p-3 rounded-xl border border-border/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg>
                        <span>
                          <strong className="block text-xs uppercase tracking-wider text-foreground/50 mb-0.5">
                            Transport Mode
                          </strong>
                          {dayItem.transportMode}
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

function getExperienceDescription(exp: ExperienceWithInclusions): string {
  const description =
    exp.description && typeof exp.description === "object"
      ? getPlainTextFromJSON(exp.description)
      : String(exp.description || "");

  return (
    description ||
    `Explore ${exp.title} in ${exp.location || "India"} with Param Adventures.`
  );
}

function getPrimaryMedia(exp: ExperienceWithInclusions): string {
  return (
    exp.coverImage ||
    exp.images[0] ||
    "https://picsum.photos/seed/placeholder/1920/1080"
  );
}

function resolveMediaSettings(settings: { key: string; value: string }[]): MediaSettings {
  const get = (key: string) => settings.find((s) => s.key === key)?.value;
  return {
    provider: (get("media_provider") || "CLOUDINARY") as "CLOUDINARY" | "AWS_S3" | "S3" | "LOCAL",
    cloudinaryCloudName: get("cloudinary_cloud_name"),
    s3Bucket: get("s3_bucket"),
    s3Region: get("s3_region"),
    globalQuality: Number.parseInt(get("media_quality") || "100"),
    highFidelity: get("media_high_fidelity") === "true",
    cdnUrl: get("cdn_url"),
  };
}

async function ExperienceNotFound() {
  const activeExperiences = await withBuildSafety(
    () =>
      prisma.experience.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        take: 3,
        orderBy: { isFeatured: "desc" },
        select: { id: true, title: true, slug: true, location: true, basePrice: true, cardImage: true, durationDays: true },
      }),
    [],
  );
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 pt-24 pb-20 text-center max-w-7xl mx-auto">
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        <Mountain className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-3xl md:text-5xl font-heading font-black text-foreground mb-4">
        Adventure Currently Unavailable
      </h1>
      <p className="text-foreground/60 mb-12 max-w-lg text-base leading-relaxed">
        This trail is currently in draft or has been archived. But don&apos;t worry, there are plenty of other active paths to explore!
      </p>
      {activeExperiences.length > 0 && (
        <div className="w-full max-w-4xl mt-6">
          <h2 className="text-xl font-bold text-foreground mb-6 uppercase tracking-wider">
            Recommended Trails
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeExperiences.map((item) => (
              <Link
                key={item.id}
                href={`/experiences/${item.slug}`}
                className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all text-left shadow-xs hover:shadow-md"
              >
                <div className="relative aspect-[16/10] bg-muted w-full overflow-hidden">
                  {item.cardImage ? (
                    <Image
                      src={item.cardImage}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 30vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/20">
                      <Mountain className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-bold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-foreground/50 text-xs mt-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.location || "India"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-4 text-xs font-semibold">
                    <span className="text-foreground/50">
                      {item.durationDays} {item.durationDays === 1 ? "Day" : "Days"}
                    </span>
                    <span className="text-foreground font-bold text-sm">
                      ₹{Number(item.basePrice).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mt-12 flex gap-4">
        <Link
          href="/experiences"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/25"
        >
          Browse All Trails
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-foreground/5 border border-border px-6 py-3 font-bold text-foreground hover:bg-foreground/10 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Base Camp
        </Link>
      </div>
    </div>
  );
}

function getNavSections(exp: ExperienceWithInclusions): { id: string; label: string }[] {
  const sections: { id: string; label: string }[] = [{ id: "about", label: "About" }];

  if (Array.isArray(exp.itinerary) && exp.itinerary.length > 0) {
    sections.push({ id: "itinerary", label: "Itinerary" });
  }

  const hasInclusions = Array.isArray(exp.inclusions) && exp.inclusions.length > 0;
  const hasExclusions = Array.isArray(exp.exclusions) && exp.exclusions.length > 0;
  if (hasInclusions || hasExclusions) {
    sections.push({ id: "inclusions", label: "Inclusions" });
  }

  if (Array.isArray(exp.thingsToCarry) && exp.thingsToCarry.length > 0) {
    sections.push({ id: "things-to-carry", label: "Things to Carry" });
  }

  if (Array.isArray(exp.thingsToKeepInMind) && exp.thingsToKeepInMind.length > 0) {
    sections.push({ id: "things-to-keep-in-mind", label: "Keep in Mind" });
  }

  if (exp.images && exp.images.length > 0) {
    sections.push({ id: "gallery", label: "Gallery" });
  }

  if (Array.isArray(exp.faqs) && exp.faqs.length > 0) {
    sections.push({ id: "faqs", label: "FAQs" });
  }

  sections.push({ id: "reviews", label: "Reviews" });

  return sections;
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
        key: { in: ["media_provider", "cloudinary_cloud_name", "s3_bucket", "s3_region", "media_quality", "media_high_fidelity", "cdn_url"] }
      }
    }),
    []
  );

  const mediaSettings = resolveMediaSettings(dbPlatformSettings);

  const experience = await withBuildSafety(
    () =>
      prisma.experience.findUnique({
        where: { slug },
        include: {
          categories: { include: { category: true } },
          slots: {
            where: { date: { gte: new Date() }, status: "UPCOMING" },
            orderBy: { date: "asc" },
          },
        },
      }),
    null,
  );

  if (!experience || experience.status === "DRAFT" || experience.status === "ARCHIVED" || !!experience.deletedAt) {
    return <ExperienceNotFound />;
  }

  // Cast after null check for type safety
  const exp = experience as unknown as ExperienceWithInclusions;

  const finalDescription = getExperienceDescription(exp);
  const primaryMedia = getPrimaryMedia(exp);
  const isVideo = /\.(mp4|webm)$/i.exec(primaryMedia);

  const heroMediaUrl = getMediaUrl(
    primaryMedia,
    mediaSettings.provider,
    {
      cloudinaryCloudName: mediaSettings.cloudinaryCloudName,
      s3Bucket: mediaSettings.s3Bucket,
      s3Region: mediaSettings.s3Region,
      globalQuality: mediaSettings.globalQuality,
      highFidelity: mediaSettings.highFidelity,
    }
  );

  const nightsCount = exp.durationDays > 1 ? exp.durationDays - 1 : 0;
  const navSections = getNavSections(exp);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-16">
      <ExperienceJsonLd
        experience={exp}
        url={`${process.env.NEXT_PUBLIC_APP_URL || ""}/experiences/${slug}`}
        description={finalDescription}
      />
      {/* Hero Section */}
      <section className="relative aspect-[16/9] md:aspect-auto md:h-[75vh] lg:h-[80vh] w-full mt-0 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black">
          {isVideo ? (
            <div className="relative w-full h-full">
              <video
                src={heroMediaUrl}
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-105 md:hidden"
                muted
                loop
                autoPlay
                playsInline
              />
              <video
                src={heroMediaUrl}
                className="absolute inset-0 w-full h-full object-contain md:object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Blurred background copy to prevent solid black bars on non-16:9 images - hidden on PC */}
              <Image
                src={heroMediaUrl}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover blur-2xl opacity-40 scale-105 md:hidden"
              />
              {/* Main crisp contained image (no cropping on mobile, fills container on PC) */}
              <Image
                src={heroMediaUrl}
                alt={exp.title}
                fill
                priority
                sizes="100vw"
                className="object-contain md:object-cover"
              />
            </div>
          )}

          <div className="absolute inset-0 bg-black/20 md:bg-black/40 z-10" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/90 via-black/40 to-transparent z-10 hidden md:block" />

        </div>

        {/* Action Buttons - Standardized positioning */}
        <div className="absolute top-4 right-4 md:top-6 md:right-8 z-40 flex items-center gap-3">
          <SaveButton
            experienceId={exp.id}
            className="scale-100 md:scale-110"
          />
          <ShareButton
            title={exp.title}
            className="scale-100 md:scale-110"
            variant="outline"
          />
        </div>

        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 flex flex-col">
          {/* Spacing from the top */}
          <div className="h-4 md:h-8 lg:h-12 shrink-0" />

          <div className="hidden md:flex flex-1 flex-col justify-end pb-12">
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
                {nightsCount}{" "}
                Nights
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Title & Meta Section (Visible only on mobile) */}
      <div className="md:hidden px-4 pt-6 pb-2 space-y-4">
        <h1 className="text-3xl font-heading font-black text-foreground leading-tight">
          {exp.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-foreground/75 font-semibold text-sm">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" /> {exp.location}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />{" "}
            {exp.durationDays} Days / {nightsCount} Nights
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 mt-6 md:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-16 min-w-0">
          <ExperienceStickyNav
            sections={navSections}
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
              <RichTextRenderer content={exp.description} />
            </div>
          </section>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium">
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
                <p className="text-sm text-foreground/60 font-medium">
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
                <p className="text-sm text-foreground/60 font-medium">
                  Total Distance (Both Ways)
                </p>
                <p className="font-bold">{exp.trekDistance || "N/A"}</p>
              </div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-foreground/60 font-medium">
                  Best Season
                </p>
                <p className="font-bold">
                  {exp.bestTimeToVisit || "Year Round"}
                </p>
              </div>
            </div>
          </section>

          <EssentialLogistics experience={exp} />

          <ItinerarySection itinerary={exp.itinerary} />

          <InclusionsExclusions
            inclusions={exp.inclusions}
            exclusions={exp.exclusions}
          />

          {/* Things to Carry */}
          {Array.isArray(exp.thingsToCarry) &&
            exp.thingsToCarry.length > 0 && (
              <section
                id="things-to-carry"
                className="scroll-mt-32"
              >
                <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                  <Backpack className="w-8 h-8 text-primary" />
                  Things to Carry
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 pl-2">
                  {exp.thingsToCarry.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-foreground/80"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                      <span className="leading-relaxed font-medium">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {/* Things to Keep in Mind */}
          {Array.isArray(exp.thingsToKeepInMind) &&
            exp.thingsToKeepInMind.length > 0 && (
              <section
                id="things-to-keep-in-mind"
                className="scroll-mt-32"
              >
                <h2 className="text-3xl font-heading font-bold mb-6 flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Things to Keep in Mind
                </h2>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                  <ul className="space-y-3">
                    {exp.thingsToKeepInMind.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-foreground/85"
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" />
                        <span className="leading-relaxed font-medium">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

          {exp.images.length > 0 && (
            <section id="gallery" className="scroll-mt-32">
              <ExperienceGallery
                images={exp.images}
                mediaSettings={mediaSettings}
                experienceTitle={exp.title}
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
                {exp.faqs.map((faq, _ix) => (
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
              {(() => {
                let policyTemplate = "custom";
                let policyText = "";
                let selectedPolicies: string[] = [];
                try {
                  const parsed = JSON.parse(exp.cancellationPolicy);
                  if (parsed && typeof parsed === "object" && "template" in parsed) {
                    policyTemplate = parsed.template || "custom";
                    policyText = parsed.text || "";
                    selectedPolicies = Array.isArray(parsed.selectedPolicies) ? parsed.selectedPolicies : [];
                  } else {
                    policyText = exp.cancellationPolicy;
                  }
                } catch {
                  policyText = exp.cancellationPolicy;
                }

                const isTemplate = policyTemplate in CANCELLATION_TEMPLATES;
                const t = isTemplate ? CANCELLATION_TEMPLATES[policyTemplate as keyof typeof CANCELLATION_TEMPLATES] : null;

                return (
                  <div className="space-y-6">
                    {t && (
                      <div className="space-y-4">
                        <p className="font-bold text-lg text-foreground">{t.title}</p>
                        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider">
                                {t.headers.map((h) => (
                                  <th key={h} className="p-3 border-b border-r border-border font-bold last:border-r-0 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card text-xs">
                              {t.rows.map((row) => (
                                <tr key={row[0]}>
                                  {row.map((cell, cellIndex) => {
                                    const isCheck = cell === "✔";
                                    const isCross = cell === "✘";
                                    return (
                                      <td
                                        key={`${cellIndex}-${cell}`}
                                        className={`p-3 border-r border-border last:border-r-0 ${
                                          cellIndex === 0 ? "font-semibold text-foreground/80 whitespace-nowrap" : "whitespace-normal"
                                        } ${isCheck ? "text-green-600 font-bold text-center" : ""} ${
                                          isCross ? "text-red-500 font-bold text-center" : ""
                                        }`}
                                      >
                                        {cell}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {policyText && (
                      <p className="text-foreground/80 leading-relaxed whitespace-pre-line text-sm">
                        {policyText}
                      </p>
                    )}

                    {selectedPolicies && selectedPolicies.length > 0 && (
                      <div className="space-y-4 mt-6">
                        {selectedPolicies.map((policyId: string) => {
                          const policy = CANCEL_POLICY_OPTIONS.find(p => p.id === policyId);
                          if (!policy) return null;
                          
                          let bgClass = "bg-amber-500/5 border-amber-500/20 text-foreground";
                          let iconClass = "text-amber-500";
                          let sideBorderClass = "border-l-4 border-amber-500";
                          
                          if (policy.color === "green") {
                            bgClass = "bg-green-500/5 border-green-500/20 text-foreground";
                            iconClass = "text-green-500";
                            sideBorderClass = "border-l-4 border-green-500";
                          } else if (policy.color === "red") {
                            bgClass = "bg-red-500/5 border-red-500/20 text-foreground";
                            iconClass = "text-red-500";
                            sideBorderClass = "border-l-4 border-red-500";
                          } else if (policy.color === "gray") {
                            bgClass = "bg-foreground/5 border-border text-foreground";
                            iconClass = "text-foreground/40";
                            sideBorderClass = "border-l-4 border-foreground/30";
                          }
                          
                          const IconComp = iconMap[policy.icon] || Info;
                          
                          return (
                            <div key={policy.id} className={`flex items-start gap-3 p-4 rounded-xl border ${bgClass} ${sideBorderClass} text-left`}>
                              <IconComp className={`w-5 h-5 shrink-0 mt-0.5 ${iconClass}`} />
                              <div className="text-sm">
                                <strong className="font-bold">{policy.label}: </strong>
                                <span className="opacity-95">{policy.defaultText}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
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
        <div className="lg:col-span-1 lg:sticky lg:top-28 lg:h-fit flex flex-col gap-6 z-20">
          <BookingSidebarCard
            experienceId={exp.id}
            experienceTitle={exp.title}
            experienceSlug={exp.slug}
            basePrice={Number(exp.basePrice)}
            maxCapacity={exp.capacity}
            pickupPoints={exp.pickupPoints || []}
            dropPoints={exp.dropPoints || []}
            slots={experience.slots}
          />

          <SimilarTrips
            currentExperienceId={exp.id}
            categoryIds={exp.categories.map((c: CategoryWithRelation) => c.category.id)}
            mediaSettings={mediaSettings}
          />
        </div>
      </div>

      <MobileBookingBar
        experienceId={exp.id}
        experienceTitle={exp.title}
        experienceSlug={exp.slug}
        basePrice={Number(exp.basePrice)}
        maxCapacity={exp.capacity}
        pickupPoints={exp.pickupPoints || []}
        dropPoints={exp.dropPoints || []}
      />
    </div>
  );
}
