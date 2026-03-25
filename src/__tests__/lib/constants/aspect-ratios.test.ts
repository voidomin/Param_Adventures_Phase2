import { describe, it, expect } from "vitest";
import {
  ASPECT_RATIOS,
  ASPECT_RATIO_CLASSES,
} from "@/lib/constants/aspect-ratios";

describe("aspect-ratios constants", () => {
  it("exports expected numeric ratios", () => {
    expect(ASPECT_RATIOS.HERO_BANNER).toBeCloseTo(21 / 9);
    expect(ASPECT_RATIOS.EXPERIENCE_COVER).toBeCloseTo(21 / 9);
    expect(ASPECT_RATIOS.EXPERIENCE_CARD).toBeCloseTo(4 / 3);
    expect(ASPECT_RATIOS.BLOG_CARD).toBeCloseTo(16 / 9);
    expect(ASPECT_RATIOS.GALLERY_IMAGE).toBeCloseTo(3 / 2);
    expect(ASPECT_RATIOS.AVATAR).toBe(1);
  });

  it("exports matching tailwind aspect classes", () => {
    expect(ASPECT_RATIO_CLASSES.HERO_BANNER).toBe("aspect-[21/9]");
    expect(ASPECT_RATIO_CLASSES.EXPERIENCE_COVER).toBe("aspect-[21/9]");
    expect(ASPECT_RATIO_CLASSES.EXPERIENCE_CARD).toBe("aspect-[4/3]");
    expect(ASPECT_RATIO_CLASSES.BLOG_CARD).toBe("aspect-[16/9]");
    expect(ASPECT_RATIO_CLASSES.GALLERY_IMAGE).toBe("aspect-[3/2]");
    expect(ASPECT_RATIO_CLASSES.AVATAR).toBe("aspect-square");
  });
});
