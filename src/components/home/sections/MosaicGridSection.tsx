import ScrollReveal from "@/components/ui/ScrollReveal";
import CompactExperienceCard from "./CompactExperienceCard";
import SectionHeading from "./SectionHeading";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";
import type { CSSProperties } from "react";

// Overrides the site's --primary token for this section only -- the
// compact card (badge, price, Book Now, border) picks it up automatically
// via the same CSS variable it always used, no component changes needed.
// Matches the approved Basecamp Layouts mockup's "Weekend" mood color.
const MOOD_STYLE = { "--primary": "#0f9b8e" } as CSSProperties;

/**
 * Weekend Getaways: a fixed-height horizontal strip of compact cards --
 * no single trip dominates, matching the "quick, low-commitment escape"
 * mood, and the section's height never grows no matter how many trips
 * (up to the cap) get assigned -- extras just scroll, the same way
 * Featured Experiences already behaves.
 */
export default function MosaicGridSection({
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
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar">
          {section.experiences.map((exp) => (
            <div key={exp.id} className="shrink-0 w-[70vw] sm:w-70 snap-start">
              <CompactExperienceCard experience={exp} mediaSettings={mediaSettings} />
            </div>
          ))}
        </div>
      </ScrollReveal>
    </div>
  );
}
