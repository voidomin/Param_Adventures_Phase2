import { prisma } from "@/lib/db";
import { ExperienceInput } from "@/lib/validators/experience.schema";
import { ExperienceStatus, Difficulty, Prisma } from "@prisma/client";

export const ExperienceRepo = {
  /**
   * Fetches a page of experiences with their categories and counts, newest
   * first, plus the total count needed to render pagination controls.
   */
  async findMany({ page = 1, limit = 50 }: { page?: number; limit?: number } = {}) {
    const skip = (page - 1) * limit;
    const where: Prisma.ExperienceWhereInput = { deletedAt: null };

    const [experiences, total] = await Promise.all([
      prisma.experience.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          categories: { include: { category: true } },
          _count: {
            select: {
              slots: true,
              bookings: true,
            },
          },
        },
      }),
      prisma.experience.count({ where }),
    ]);

    return { experiences, total };
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
        allowAdvancePayment: rest.allowAdvancePayment || false,
        advancePaymentAmount: rest.advancePaymentAmount ? new Prisma.Decimal(rest.advancePaymentAmount) : null,
        extraAmenities: (rest.extraAmenities as Prisma.InputJsonValue) || [],
        images: rest.images || [],
        itinerary: rest.itinerary || [],
        inclusions: (rest.inclusions as Prisma.InputJsonValue) || [],
        exclusions: (rest.exclusions as Prisma.InputJsonValue) || [],
        thingsToCarry: (rest.thingsToCarry as Prisma.InputJsonValue) || [],
        pickupPoints: rest.pickupPoints || [],
        dropPoints: rest.dropPoints || [],
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
