import { ExperienceRepo } from "@/repositories/experience.repo";
import { ExperienceInput } from "@/lib/validators/experience.schema";
import { generateSlug } from "@/lib/slugify";
import { logActivity } from "@/lib/audit-logger";

export const ExperienceService = {
  /**
   * Orchestrates the browsing of experiences.
   */
  async getAllExperiences() {
    return ExperienceRepo.findMany();
  },

  /**
   * Orchestrates the creation of a new experience.
   * Handles unique slug generation logic.
   */
  async createExperience(userId: string, data: ExperienceInput) {
    // 1. Generate unique slug
    const baseSlug = generateSlug(data.title);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await ExperienceRepo.findBySlug(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 2. Persist in Repository
    const newExperience = await ExperienceRepo.create(data, uniqueSlug);

    // 3. Audit Logging
    await logActivity(
      "EXPERIENCE_CREATED",
      userId,
      "Experience",
      newExperience.id,
      { title: data.title, slug: uniqueSlug }
    );

    return newExperience;
  }
};
