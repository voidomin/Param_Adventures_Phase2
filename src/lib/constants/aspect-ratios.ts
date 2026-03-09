/**
 * Centralized aspect ratios for the application.
 * Changing these values will update both the Admin Uploader's cropping frame
 * and the Frontend's display containers.
 */
export const ASPECT_RATIOS = {
  // Banners / Heros (Ultrawide)
  HERO_BANNER: 21 / 9,
  EXPERIENCE_COVER: 21 / 9,

  // Cards / Thumbnails (Standard Photo)
  EXPERIENCE_CARD: 4 / 3,
  BLOG_CARD: 16 / 9,

  // Gallery / Misc
  GALLERY_IMAGE: 3 / 2,

  // Profiles / Icons (Square)
  AVATAR: 1 / 1,
} as const;

// Helper to get Tailwind class equivalence (useful for React components)
export const ASPECT_RATIO_CLASSES = {
  HERO_BANNER: "aspect-[21/9]",
  EXPERIENCE_COVER: "aspect-[21/9]",
  EXPERIENCE_CARD: "aspect-[4/3]",
  BLOG_CARD: "aspect-[16/9]",
  GALLERY_IMAGE: "aspect-[3/2]",
  AVATAR: "aspect-square",
} as const;
