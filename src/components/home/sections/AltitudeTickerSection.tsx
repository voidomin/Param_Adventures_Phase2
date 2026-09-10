import ScrollReveal from "@/components/ui/ScrollReveal";
import CompactExperienceCard from "./CompactExperienceCard";
import SectionHeading from "./SectionHeading";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";
import type { CSSProperties } from "react";

// See MosaicGridSection.tsx for why this works -- overrides --primary for
// just this section. Matches the mockup's "Extreme" mood color (icy
// cyan), reading as altitude/glacier rather than the site's warm saffron.
const MOOD_STYLE = { "--primary": "#3aa7c9" } as CSSProperties;

/**
 * Extreme Adventure Challenges: a dense horizontal strip, each trip tagged
 * with its own peak altitude (Experience.maxAltitude) so the difficulty
 * reads as a real number, not just a badge. Deliberately near-black
 * regardless of site theme -- this section commits to a rugged, low-light
 * mood (see CompactExperienceCard's darkTheme prop).
 */
export default function AltitudeTickerSection({
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
        <div className="flex gap-4 overflow-x-auto pb-4">
          {section.experiences.map((exp) => (
            <div key={exp.id} className="relative shrink-0 w-[70vw] sm:w-70">
              {exp.maxAltitude && (
                <span className="absolute top-2.5 right-2.5 z-10 bg-primary text-primary-foreground text-[10px] font-black rounded-md px-2 py-0.5 tracking-wide">
                  {exp.maxAltitude}
                </span>
              )}
              <CompactExperienceCard experience={exp} mediaSettings={mediaSettings} darkTheme />
            </div>
          ))}
        </div>
      </ScrollReveal>
    </div>
  );
}
