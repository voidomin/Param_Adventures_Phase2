/**
 * Generate a URL-friendly slug from a string.
 */
export function generateSlug(text: string): string {
  if (!text) return "";

  let slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, "") // Strip symbols
    .replace(/[\s_]+/g, "-") // Convert spaces and underscores to hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens

  // Remove leading/trailing hyphens without using anchored quantifiers to satisfy SonarQube S5852
  if (slug.startsWith("-")) slug = slug.substring(1);
  if (slug.endsWith("-")) slug = slug.substring(0, slug.length - 1);

  return slug;
}
