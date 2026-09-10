import ScrollReveal from "@/components/ui/ScrollReveal";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import SectionHeading from "./SectionHeading";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";

/**
 * Extreme Adventure Challenges: a dense horizontal strip, each trip tagged
 * with its own peak altitude (Experience.maxAltitude) so the difficulty
 * reads as a real number, not just a badge. Reuses the real ExperienceCard.
 */
export default function AltitudeTickerSection({
  section,
  mediaSettings,
}: Readonly<{
  section: HomepageSectionWithExperiences;
  mediaSettings: MediaSettings;
}>) {
  return (
    <div className="pt-12 pb-4 px-4 md:px-12 lg:px-16 relative z-10">
      <SectionHeading heading={section.heading} subheading={section.subheading} />
      <ScrollReveal>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {section.experiences.map((exp) => (
            <div key={exp.id} className="relative shrink-0 w-70">
              {exp.maxAltitude && (
                <span className="absolute top-2.5 left-2.5 z-10 bg-primary text-primary-foreground text-[11px] font-black rounded-md px-2 py-0.5 tracking-wide">
                  {exp.maxAltitude}
                </span>
              )}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <ExperienceCard experience={exp as any} mediaSettings={mediaSettings} />
            </div>
          ))}
        </div>
      </ScrollReveal>
    </div>
  );
}
