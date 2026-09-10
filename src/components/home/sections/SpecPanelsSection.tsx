import Link from "next/link";
import Image from "next/image";
import { IndianRupee } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { buildTrekAltText } from "@/lib/seo/alt-text";
import SectionHeading from "./SectionHeading";
import { resolveExperienceImageUrl } from "@/lib/serialize-experience-card";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";
import type { CSSProperties } from "react";

// See MosaicGridSection.tsx for why this works -- overrides --primary for
// just this section. Matches the mockup's "Educational" mood color, close
// to the emerald-500 the top border already used (now driven by the same
// variable instead of two independent green definitions).
const MOOD_STYLE = { "--primary": "#4f9d6e" } as CSSProperties;

/**
 * Educational Expeditions: parents and schools compare these like a course
 * catalog, so the card leads with a scannable spec list rather than just a
 * photo. The mockup illustrated invented fields (grade level, focus, group
 * size) that don't exist on Experience -- this uses the fields that do:
 * location, duration, difficulty, price, in the same structured layout.
 */
export default function SpecPanelsSection({
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
        <div className="grid md:grid-cols-3 gap-4.5">
          {section.experiences.map((exp) => {
            const image = resolveExperienceImageUrl(exp, mediaSettings, { width: 700, crop: "fill" });

            return (
              <Link
                key={exp.id}
                href={`/experiences/${exp.slug}`}
                className="flex flex-col bg-card border-t-3 border-t-primary border-x border-b border-border rounded-2xl overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="relative aspect-16/10 w-full bg-foreground/5">
                  <Image
                    src={image}
                    alt={buildTrekAltText(exp.title, exp.location)}
                    fill
                    sizes="(max-width: 900px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-heading font-bold text-base mb-3 leading-tight min-h-10">{exp.title}</h3>
                  <dl className="flex flex-col border-t border-border">
                    <div className="flex items-center justify-between py-2 border-b border-border text-xs">
                      <dt className="text-foreground/40 font-semibold">Location</dt>
                      <dd className="font-bold text-right">{exp.location}</dd>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border text-xs">
                      <dt className="text-foreground/40 font-semibold">Duration</dt>
                      <dd className="font-bold text-right">{exp.durationDays}D / {Math.max(exp.durationDays - 1, 0)}N</dd>
                    </div>
                    <div className="flex items-center justify-between py-2 text-xs">
                      <dt className="text-foreground/40 font-semibold">Difficulty</dt>
                      <dd className="font-bold text-right">{exp.difficulty}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="font-heading font-black text-base flex items-center">
                      <IndianRupee className="w-3.5 h-3.5 mr-0.5 text-primary" />
                      {Number(exp.basePrice).toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-primary">Enquire →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollReveal>
    </div>
  );
}
