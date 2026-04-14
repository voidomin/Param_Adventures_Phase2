import { prisma } from "@/lib/db";
import { ExperienceInput } from "@/lib/validators/experience.schema";
import { ExperienceStatus, Difficulty, Prisma } from "@prisma/client";

export const ExperienceRepo = {
  /**
   * Fetches all experiences with their categories and counts.
   */
  async findMany() {
    return prisma.experience.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        categories: { include: { category: true } },
        _count: { select: { slots: true, bookings: true } },
      },
    });
  },

  /**
   * Checks if a slug is already in use.
   */
  async findBySlug(slug: string) {
    return prisma.experience.findUnique({
      where: { slug }
    });
  },

  /**
   * Creates a new experience record.
   */
  async create(data: ExperienceInput, uniqueSlug: string) {
    const { categoryIds, ...rest } = data;

    return prisma.experience.create({
      data: {
        ...rest,
        slug: uniqueSlug,
        durationDays: rest.durationDays || 1,
        location: rest.location || "",
        difficulty: rest.difficulty || Difficulty.EASY,
        status: ExperienceStatus.DRAFT,
        isFeatured: rest.isFeatured || false,
        images: rest.images || [],
        itinerary: rest.itinerary || [],
        inclusions: (rest.inclusions as Prisma.InputJsonValue) || [],
        exclusions: (rest.exclusions as Prisma.InputJsonValue) || [],
        thingsToCarry: (rest.thingsToCarry as Prisma.InputJsonValue) || [],
        pickupPoints: rest.pickupPoints || [],
        faqs: (rest.faqs as Prisma.InputJsonValue) || [],
        highlights: rest.highlights || [],
        vibeTags: rest.vibeTags || [],
        categories: (categoryIds && categoryIds.length > 0)
          ? {
              create: categoryIds.map((catId: string) => ({
                categoryId: catId,
              })),
            }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
      },
    });
  }
};
