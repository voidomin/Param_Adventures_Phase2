"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, IndianRupee } from "lucide-react";
import type { MediaSettings } from "@/types/media";
import { motion } from "framer-motion";
import SaveButton from "./SaveButton";
import ShareButton from "../ui/ShareButton";
import { getMediaUrl } from "@/lib/media/media-gateway";

interface Category {
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ExperienceCardProps {
  experience: {
    id: string;
    title: string;
    slug: string;
    description: unknown;
    durationDays: number;
    location: string;
    basePrice: number;
    capacity: number;
    difficulty: "EASY" | "MODERATE" | "HARD" | "EXTREME";
    coverImage?: string;
    cardImage?: string;
    images: string[];
    categories: Category[];
    nextDeparture?: string | null;
    nextDepartureSlot?: {
      date: string;
      capacity: number;
      remainingCapacity: number;
    } | null;
    upcomingSlots?: {
      date: string;
      capacity: number;
      remainingCapacity: number;
    }[];
  };
  mediaSettings?: MediaSettings;
}

function FlippingDatePill({
  date,
  remainingCapacity,
}: Readonly<{
  date: string;
  remainingCapacity: number;
}>) {
  const [isFlipped, setIsFlipped] = useState(false);

  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  const isSoldOut = remainingCapacity <= 0;
  const statusText = isSoldOut ? "Sold Out" : `${remainingCapacity} left`;

  let frontStyle = "bg-foreground/5 text-foreground/80 border-border hover:border-primary/30";
  if (isSoldOut) {
    frontStyle = "bg-red-500/10 text-red-500 border-red-500/20 line-through";
  } else if (remainingCapacity <= 5) {
    frontStyle = "bg-amber-500/10 text-amber-600 border-amber-500/20";
  }

  let backStyle = "bg-primary text-primary-foreground border-primary font-bold";
  if (isSoldOut) {
    backStyle = "bg-red-500 text-white border-red-500 font-bold";
  } else if (remainingCapacity <= 5) {
    backStyle = "bg-amber-500 text-white border-amber-500 font-bold";
  }

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={(e) => {
        e.stopPropagation();
        setIsFlipped(!isFlipped);
      }}
      className={`flip-card interactive-element w-24 h-8 cursor-pointer relative z-10 ${isFlipped ? "flipped" : ""}`}
    >
      <span className="flip-card-inner relative w-full h-full block">
        {/* Front side */}
        <span className={`flip-card-front absolute inset-0 rounded-lg border text-xs font-bold transition-all shadow-sm ${frontStyle}`}>
          {formattedDate}
        </span>
        {/* Back side */}
        <span className={`flip-card-back absolute inset-0 rounded-lg border text-[10px] uppercase tracking-wider text-center transition-all shadow-sm ${backStyle}`}>
          {statusText}
        </span>
      </span>
    </button>
  );
}

export default function ExperienceCard({
  experience,
  mediaSettings,
}: Readonly<ExperienceCardProps>) {

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "EASY":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "MODERATE":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "HARD":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "EXTREME":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-border text-foreground";
    }
  };

  const rawImage =
    experience.cardImage ||
    experience.coverImage ||
    experience.images[0] ||
    "https://picsum.photos/seed/placeholder/800/600";

  const primaryImage = getMediaUrl(
    rawImage,
    mediaSettings?.provider || "CLOUDINARY",
    {
      cloudinaryCloudName: mediaSettings?.cloudinaryCloudName,
      s3Bucket: mediaSettings?.s3Bucket,
      s3Region: mediaSettings?.s3Region,
      globalQuality: mediaSettings?.globalQuality || 100,
      highFidelity: mediaSettings?.highFidelity ?? true
    },
    { width: 800, crop: "fill" }
  );

  const isVideo = /\.(mp4|webm)$/i.test(rawImage);

  const upcomingDatesContent = (() => {
    if (experience.upcomingSlots && experience.upcomingSlots.length > 0) {
      return experience.upcomingSlots.slice(0, 3).map((slot, index) => (
        <FlippingDatePill
          key={`${slot.date}-${index}`}
          date={slot.date}
          remainingCapacity={slot.remainingCapacity}
        />
      ));
    }
    if (experience.nextDepartureSlot) {
      return (
        <FlippingDatePill
          date={experience.nextDepartureSlot.date}
          remainingCapacity={experience.nextDepartureSlot.remainingCapacity}
        />
      );
    }
    return (
      <span className="text-xs text-foreground/40 font-medium italic">
        No upcoming dates scheduled
      </span>
    );
  })();

  return (
    <div
      className="group/card flex flex-col flex-1 card-container relative"
    >
      {/* CSS Styles injection for Flipping Date Pills */}
      <style dangerouslySetInnerHTML={{ __html: `
        .flip-card {
          perspective: 1000px;
          -webkit-perspective: 1000px;
        }
        .flip-card-inner {
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          -webkit-transition: -webkit-transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }
        .card-container:hover .flip-card-inner {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
        }
        .card-container:active .flip-card-inner {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .flip-card-back {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
          position: absolute;
          inset: 0;
        }
      `}} />

      <motion.div
        whileHover={{ y: -8, transition: { duration: 0.3 } }}
        className="flex flex-col flex-1 bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 relative duration-300"
      >
        {/* Clean Image Wrapper */}
        <div className="relative aspect-4/3 w-full overflow-hidden bg-foreground/5">
          {isVideo ? (
            <video
              src={primaryImage}
              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <Image
              src={primaryImage}
              alt={experience.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover/card:scale-105 transition-transform duration-700"
            />
          )}
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-1">
          {/* Categories and Difficulty Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {experience.categories.slice(0, 2).map((cat) => (
                <span
                  key={cat.category.id}
                  className="bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest"
                >
                  {cat.category.name}
                </span>
              ))}
            </div>
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getDifficultyColor(experience.difficulty)}`}
            >
              {experience.difficulty}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold font-heading text-foreground group-hover/card:text-primary transition-colors line-clamp-2 leading-tight mb-2 min-h-12">
            <Link href={`/experiences/${experience.slug}`} className="after:absolute after:inset-0">
              {experience.title}
            </Link>
          </h3>

          {/* Location and Duration */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-foreground/60 text-xs font-semibold mb-3.5">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{experience.location}</span>
            </div>
            <span className="text-foreground/30">•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                {experience.durationDays}D / {experience.durationDays > 1 ? experience.durationDays - 1 : 0}N
              </span>
            </div>
          </div>

          {/* Upcoming Dates pills */}
          <div className="flex flex-col gap-1.5 mb-4">
            <span className="text-[10px] text-foreground/40 font-black uppercase tracking-widest">Upcoming Dates</span>
            <div className="flex flex-wrap items-center gap-2 min-h-8">
              {upcomingDatesContent}
            </div>
          </div>

          {/* Bottom Section: Price & Action Buttons */}
          <div className="pt-4 border-t border-border mt-auto flex items-center justify-between gap-3">
            {/* Price */}
            <div className="flex flex-col">
              <span className="text-[10px] text-foreground/40 font-black uppercase tracking-widest leading-none mb-0.5">From</span>
              <span className="text-lg font-black text-foreground flex items-center leading-none">
                <IndianRupee className="w-3.5 h-3.5 mr-0.5 text-primary shrink-0" />
                {Number(experience.basePrice).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <SaveButton
                experienceId={experience.id}
                size={16}
                variant="card-inline"
                className="w-9 h-9 border border-border bg-background/50 hover:bg-foreground/5 relative z-10"
              />
              <ShareButton
                title={experience.title}
                url={`/experiences/${experience.slug}`}
                className="w-9 h-9 border border-border bg-background/50 hover:bg-foreground/5 relative z-10"
                variant="ghost"
              />
              <Link
                suppressHydrationWarning
                href={`/experiences/${experience.slug}?book=true`}
                className="px-4.5 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl shadow-md group-hover/card:scale-[1.05] group-hover/card:shadow-lg group-hover/card:shadow-primary/30 hover:scale-[1.08] active:scale-95 transition-all text-center interactive-element leading-none flex items-center h-9 duration-300 relative z-10"
              >
                Book Now
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
