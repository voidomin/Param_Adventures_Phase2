import { describe, expect, it } from "vitest";
import { buildTrekAltText, buildBlogAltText } from "@/lib/seo/alt-text";

describe("buildTrekAltText", () => {
  it("includes the location when provided", () => {
    expect(buildTrekAltText("Uttari Betta Trek", "Bangalore")).toBe(
      "Uttari Betta Trek trek near Bangalore",
    );
  });

  it("omits the location clause when null/undefined", () => {
    expect(buildTrekAltText("Uttari Betta Trek", null)).toBe("Uttari Betta Trek trek");
    expect(buildTrekAltText("Uttari Betta Trek")).toBe("Uttari Betta Trek trek");
  });

  it("appends an optional detail (e.g. a gallery photo index)", () => {
    expect(buildTrekAltText("Uttari Betta Trek", "Bangalore", "photo 3")).toBe(
      "Uttari Betta Trek trek near Bangalore — photo 3",
    );
  });
});

describe("buildBlogAltText", () => {
  it("includes the location when provided", () => {
    expect(buildBlogAltText("Chardham Yatra Guide", "Uttarakhand")).toBe(
      "Chardham Yatra Guide near Uttarakhand — Param Adventures blog",
    );
  });

  it("omits the location clause when null/undefined", () => {
    expect(buildBlogAltText("Chardham Yatra Guide", null)).toBe(
      "Chardham Yatra Guide — Param Adventures blog",
    );
  });
});
