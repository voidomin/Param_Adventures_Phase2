import ScrollReveal from "@/components/ui/ScrollReveal";
import ExperienceCard from "@/components/experiences/ExperienceCard";
import SectionHeading from "./SectionHeading";
import type { HomepageSectionWithExperiences } from "@/lib/homepage-sections";
import type { MediaSettings } from "@/types/media";

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
    <div className="pt-12 pb-4 px-4 md:px-12 lg:px-16 relative z-10">
      <SectionHeading heading={section.heading} subheading={section.subheading} />
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {section.experiences.map((exp) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <ExperienceCard key={exp.id} experience={exp as any} mediaSettings={mediaSettings} />
          ))}
        </div>
      </ScrollReveal>
    </div>
  );
}
