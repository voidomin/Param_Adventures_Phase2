/**
 * Generate a URL-friendly slug from a string.
 */
export function generateSlug(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .normalize("NFD") // Split accents into separate characters
    .replace(/[\u0300-\u036f]/g, "") // Remove all accent marks
    .trim()
    .replace(/[^a-z0-9\s_-]/g, "") // Remove non-alphanumeric except space, hyphen, and underscore
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with a single hyphen
    .replace(/-+/g, "-") // Collapse multiple hyphens into a single one
    .replace(/^-+/, "") // Remove leading hyphens
    .replace(/-+$/, ""); // Remove trailing hyphens
}
