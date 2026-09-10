import { prisma } from "@/lib/db";
import { serializeExperienceForCard } from "@/lib/serialize-experience-card";
import type { HomepageSectionLayout } from "@prisma/client";

// How many assigned experiences each layout was designed to hold -- see
// the approved Basecamp Layouts mockup. Spotlight uses the first as the
// hero and the rest as the manifest list; the others are a flat grid/track.
const SECTION_CAPS: Record<HomepageSectionLayout, number> = {
  MOSAIC_GRID: 4,
  SPOTLIGHT_MANIFEST: 4,
  PILGRIMAGE_TRAIL: 4,
  SPEC_PANELS: 3,
  ALTITUDE_TICKER: 6,
};

/**
 * Loads the active homepage showcase sections (fixed set of 5, ordered by
 * displayOrder) along with each one's assigned, published experiences,
 * serialized to the same shape ExperienceCard expects. A section with no
 * eligible experiences is dropped entirely -- there is no empty-state
 * placeholder for these, unlike Featured Experiences.
 */
export async function fetchHomepageSections() {
  const sections = await prisma.homepageSection.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const withExperiences = await Promise.all(
    sections.map(async (section) => {
      const raw = await prisma.experience.findMany({
        where: { homepageSectionId: section.id, status: "PUBLISHED" },
        include: {
          categories: { include: { category: true } },
          slots: {
            where: { date: { gte: new Date() }, status: "UPCOMING" },
            select: { date: true, capacity: true, remainingCapacity: true },
            orderBy: { date: "asc" },
            take: 4,
          },
        },
        take: SECTION_CAPS[section.layout] ?? 4,
        orderBy: { createdAt: "desc" },
      });

      return {
        ...section,
        experiences: raw.map(serializeExperienceForCard),
      };
    }),
  );

  return withExperiences.filter((section) => section.experiences.length > 0);
}

export type HomepageSectionWithExperiences = Awaited<
  ReturnType<typeof fetchHomepageSections>
>[number];
