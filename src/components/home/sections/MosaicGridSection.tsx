import ScrollReveal from "@/components/ui/ScrollReveal";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import SectionHeading from "./SectionHeading";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";
import type { CSSProperties } from "react";

// Overrides the site's --primary token for this section only -- the real
// ExperienceCard (badges, price, buttons, border) picks it up automatically
// via the same CSS variable it always used, no component changes needed.
// Matches the approved Basecamp Layouts mockup's "Weekend" mood color.
const MOOD_STYLE = { "--primary": "#0f9b8e" } as CSSProperties;

/**
 * Weekend Getaways: a tight, dense grid -- no single trip dominates,
 * matching the "quick, low-commitment escape" mood. Uses the real
 * ExperienceCard unchanged (its image area has a fixed aspect ratio, so a
 * grid keeps every tile proportioned correctly rather than forcing one
 * tile to stretch to an arbitrary hero size).
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
        {/* auto-fit with a 340px floor -- never squeezes a card narrower
            than its footer (price + save/share + Book Now) actually
            needs, while still packing as many columns as fit on wide
            screens (up to the original 4-across on desktop). */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-3.5">
          {section.experiences.map((exp) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <ExperienceCard key={exp.id} experience={exp as any} mediaSettings={mediaSettings} />
          ))}
        </div>
      </ScrollReveal>
    </div>
  );
}
