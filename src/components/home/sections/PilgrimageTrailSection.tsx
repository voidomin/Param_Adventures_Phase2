import ScrollReveal from "@/components/ui/ScrollReveal";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import SectionHeading from "./SectionHeading";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";
import type { CSSProperties } from "react";

// See MosaicGridSection.tsx for why this works -- overrides --primary for
// just this section (the trail dots/line below read the same variable via
// var(--color-primary), so they pick up the new color too). Matches the
// mockup's "Spiritual" mood color.
const MOOD_STYLE = { "--primary": "#d98a4f" } as CSSProperties;

/**
 * Spiritual Journeys: a horizontal row of stops joined by a dotted trail
 * line, echoing the yatra route maps these trips already follow. Reuses
 * the real ExperienceCard; only the surrounding track/marker chrome is new.
 */
export default function PilgrimageTrailSection({
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
        {/* The connecting segment between two dots lives inside the item
            it trails (not one line spanning the whole row) -- that way it
            scrolls with its cards and stays correctly positioned no matter
            how many stops overflow the viewport, instead of being sized to
            the outer wrapper's initially-visible width only. */}
        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 pt-3">
          {section.experiences.map((exp, i) => (
            <div key={exp.id} className="relative shrink-0 w-[85vw] sm:w-87.5 md:w-100 snap-start flex flex-col">
              {i > 0 && (
                <span
                  className="hidden md:block absolute h-px opacity-50"
                  style={{
                    top: "-7px",
                    left: "calc(-50% - 12px)",
                    width: "calc(100% + 24px)",
                    backgroundImage:
                      "repeating-linear-gradient(90deg, var(--color-primary) 0 10px, transparent 10px 22px)",
                  }}
                  aria-hidden="true"
                />
              )}
              <span
                className="hidden md:block absolute z-10 left-1/2 -top-3 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background"
                aria-hidden="true"
              />
              <p className="hidden md:block text-center text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                Stop {String(i + 1).padStart(2, "0")}
              </p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <ExperienceCard experience={exp as any} mediaSettings={mediaSettings} />
            </div>
          ))}
        </div>
      </ScrollReveal>
    </div>
  );
}
