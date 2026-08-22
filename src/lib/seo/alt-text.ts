/**
 * Builds descriptive, keyword-carrying alt text for trek photography.
 * Previously every image on the site used the bare experience title as
 * its alt text (or an empty string) -- accessible, but not descriptive of
 * the actual scene, and missing the location keyword a searcher/image-search
 * crawler would look for (e.g. "Uttari Betta trek" alone vs. "Uttari Betta
 * trek near Bangalore").
 */
export function buildTrekAltText(
  title: string,
  location?: string | null,
  detail?: string,
): string {
  const locationPart = location ? ` near ${location}` : "";
  const detailPart = detail ? ` — ${detail}` : "";
  return `${title} trek${locationPart}${detailPart}`;
}

/** Same idea for blog cover/inline imagery, which isn't always trek-specific. */
export function buildBlogAltText(title: string, location?: string | null): string {
  const locationPart = location ? ` near ${location}` : "";
  return `${title}${locationPart} — Param Adventures blog`;
}
