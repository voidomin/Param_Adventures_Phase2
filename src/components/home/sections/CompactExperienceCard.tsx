import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, IndianRupee } from "lucide-react";
import { buildTrekAltText } from "@/lib/seo/alt-text";
import { resolveExperienceImageUrl } from "@/lib/serialize-experience-card";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY: "bg-green-500/10 text-green-500 border-green-500/20",
  MODERATE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  HARD: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  EXTREME: "bg-red-500/10 text-red-500 border-red-500/20",
};

/**
 * A deliberately small trip card for the homepage showcase sections --
 * distinct from (and about 30% narrower than) the full ExperienceCard used
 * on /experiences and in Featured Experiences. Drops the save/share
 * buttons and the upcoming-dates block, both real space costs with little
 * value at this size (save/share is still one click away on the trip's
 * own page). The whole card is one link rather than three separate click
 * targets, which a card this small doesn't have room for anyway.
 */
export default function CompactExperienceCard({
  experience: exp,
  mediaSettings,
  darkTheme = false,
}: Readonly<{
  experience: HomepageSectionWithExperiences["experiences"][number];
  mediaSettings: MediaSettings;
  darkTheme?: boolean;
}>) {
  const image = resolveExperienceImageUrl(exp, mediaSettings, { width: 560, crop: "fill" });

  return (
    <Link
      href={`/experiences/${exp.slug}`}
      className={`group/compact flex flex-col rounded-2xl border overflow-hidden transition-colors hover:border-primary/50 ${
        darkTheme ? "bg-[#0c0c0c] border-[#262626]" : "bg-card border-border"
      }`}
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-foreground/5">
        <Image
          src={image}
          alt={buildTrekAltText(exp.title, exp.location)}
          fill
          sizes="280px"
          className="object-cover group-hover/compact:scale-105 transition-transform duration-700"
        />
        <span
          className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
            DIFFICULTY_STYLES[exp.difficulty] ?? "bg-border text-foreground"
          }`}
        >
          {exp.difficulty}
        </span>
      </div>
      <div className={`p-3.5 flex flex-col flex-1 ${darkTheme ? "text-white" : ""}`}>
        <h3 className="font-heading font-bold text-sm leading-tight line-clamp-2 min-h-9 mb-2">
          {exp.title}
        </h3>
        <div className={`flex items-center gap-2 text-[11px] font-semibold mb-3 ${darkTheme ? "text-white/60" : "text-foreground/60"}`}>
          <span className="flex items-center gap-1 min-w-0 truncate">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{exp.location}</span>
          </span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-primary shrink-0" />
            {exp.durationDays}D
          </span>
        </div>
        <div className={`mt-auto pt-3 flex items-center justify-between border-t ${darkTheme ? "border-[#262626]" : "border-border"}`}>
          <span className="font-heading font-black text-sm flex items-center">
            <IndianRupee className="w-3 h-3 mr-0.5 text-primary" />
            {Number(exp.basePrice).toLocaleString("en-IN")}
          </span>
          <span className="px-2.5 py-1 bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-wider rounded-lg">
            Book Now
          </span>
        </div>
      </div>
    </Link>
  );
}
