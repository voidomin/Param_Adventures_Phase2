"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, MapPin, Users, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import SaveButton from "./SaveButton";
import ShareButton from "../ui/ShareButton";
import { getPlainTextFromJSON, RichTextNode } from "@/lib/utils/rich-text";
import { getMediaUrl } from "@/lib/media/media-gateway";

interface Category {
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface MediaSettings {
  provider: "CLOUDINARY" | "AWS_S3";
  cloudinaryCloudName?: string;
  s3Bucket?: string;
  s3Region?: string;
  globalQuality?: number;
  highFidelity?: boolean;
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
  };
  mediaSettings?: MediaSettings;
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

  return (
    <Link
      href={`/experiences/${experience.slug}`}
      className="group block h-full"
    >
      <motion.div
        whileHover={{ y: -8, transition: { duration: 0.3 } }}
        className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 relative duration-300"
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-foreground/5">
          {isVideo ? (
            <video
              src={primaryImage}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
          )}

          <div className="absolute inset-x-0 top-0 p-4 flex justify-between items-start z-10">
            <div className="flex flex-col gap-2 relative z-20">
              {experience.categories.slice(0, 2).map((cat) => (
                <span
                  key={cat.category.id}
                  className="bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-foreground border border-border shadow-sm"
                >
                  {cat.category.name}
                </span>
              ))}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${getDifficultyColor(experience.difficulty)}`}
            >
              {experience.difficulty}
            </span>
          </div>

          {/* Gradient Overlay for bottom text protection */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent z-0 opacity-80" />

          <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-end">
            <div className="flex gap-3 text-white font-medium text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                <Clock className="w-4 h-4 text-primary" />
                {experience.durationDays}D /{" "}
                {experience.durationDays > 1 ? experience.durationDays - 1 : 0}N
              </div>
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="truncate max-w-25">
                  {experience.location}
                </span>
              </div>
            </div>
          </div>

          <div className="absolute top-16 right-4 z-30 flex flex-col gap-3">
            <SaveButton
              experienceId={experience.id}
              className="relative" // Reset to relative since parent is absolute
            />
            <ShareButton
              title={experience.title}
              url={`/experiences/${experience.slug}`}
              className="relative"
              variant="outline"
            />
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1">
          <div className="min-h-14 mb-2">
            <h3 className="text-xl font-bold font-heading text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {experience.title}
            </h3>
          </div>
          <p className="text-foreground/70 text-sm line-clamp-2 mb-6 flex-1 min-h-12">
            {typeof experience.description === 'string' 
              ? experience.description 
              : getPlainTextFromJSON(experience.description as RichTextNode)}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
            <div className="flex items-center gap-2 text-foreground/60 text-sm">
              <Users className="w-4 h-4" />
              <span>Up to {experience.capacity} pax</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-foreground/50 font-medium">
                Starting from
              </span>
              <span className="text-lg font-bold text-foreground flex items-center">
                <IndianRupee className="w-4 h-4 mr-0.5" />
                {Number(experience.basePrice).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
