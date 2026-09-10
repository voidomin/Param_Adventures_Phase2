import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock, IndianRupee } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { buildTrekAltText } from "@/lib/seo/alt-text";
import { resolveExperienceImageUrl } from "@/lib/serialize-experience-card";
import SectionHeading from "./SectionHeading";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";
import type { CSSProperties } from "react";

// See MosaicGridSection.tsx for why this works -- overrides --primary for
// just this section. Matches the mockup's "Spiritual" mood color.
const MOOD_STYLE = { "--primary": "#d98a4f" } as CSSProperties;

/**
 * A plain vertical list of full-width rows -- deliberately narrative-free
 * (no numbering, no "stop"/journey framing) since the section it renders
 * is one of the 5 admins can freely rename to anything, and a layout
 * built around one specific story stops making sense the moment the name
 * changes. Works the same under any name. Bounded height by its fixed
 * cap (SECTION_CAPS.PILGRIMAGE_TRAIL), not by scrolling, since a handful
 * of rows never grows tall enough to need it.
 */
export default function TripListSection({
  section,
  mediaSettings,
}: Readonly<{
  section: HomepageSectionWithExperiences;
  mediaSettings: MediaSettings;
}>) {
  return (
    <div className="pt-12 pb-4 px-4 md:px-12 lg:px-16 relative z-10" style={MOOD_STYLE}>
      <SectionHeading heading={section.heading} subheading={section.subheading} />
      <ScrollReveal>
        <div className="flex flex-col max-w-4xl mx-auto">
          {section.experiences.map((exp, i) => {
            const image = resolveExperienceImageUrl(exp, mediaSettings, { width: 300, crop: "fill" });
            return (
              <Link
                key={exp.id}
                href={`/experiences/${exp.slug}`}
                className={`group/row flex items-center gap-4 py-4 transition-colors hover:bg-foreground/5 rounded-xl px-2 -mx-2 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="relative w-20 h-20 sm:w-27.5 sm:h-27.5 rounded-xl overflow-hidden shrink-0 bg-foreground/5">
                  <Image
                    src={image}
                    alt={buildTrekAltText(exp.title, exp.location)}
                    fill
                    sizes="110px"
                    className="object-cover group-hover/row:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary mb-1.5">
                    {exp.difficulty}
                  </span>
                  <h3 className="font-heading font-bold text-base leading-tight truncate">{exp.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-foreground/60 font-semibold mt-1">
                    <span className="flex items-center gap-1 min-w-0 truncate">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{exp.location}</span>
                    </span>
                    <span className="opacity-40">·</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      {exp.durationDays}D / {Math.max(exp.durationDays - 1, 0)}N
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-foreground/40 mb-0.5">From</span>
                  <span className="font-heading font-black text-base sm:text-lg flex items-center justify-end">
                    <IndianRupee className="w-3.5 h-3.5 mr-0.5 text-primary" />
                    {Number(exp.basePrice).toLocaleString("en-IN")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollReveal>
    </div>
  );
}
