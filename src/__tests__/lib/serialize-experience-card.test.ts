import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/media/media-gateway", () => ({
  getMediaUrl: vi.fn((path: string) => `https://res.cloudinary.com/resolved/${path}`),
}));

import { serializeExperienceForCard, resolveExperienceImageUrl, EXPERIENCE_PLACEHOLDER_IMAGE } from "@/lib/serialize-experience-card";
import { getMediaUrl } from "@/lib/media/media-gateway";

const baseExperience = {
  id: "exp1",
  title: "Test Trek",
  basePrice: { toString: () => "5000" } as unknown as number,
  advancePaymentAmount: null,
  capacity: 10,
  slots: [] as { date: Date | string; capacity: number; remainingCapacity: number }[],
} as any;

describe("serializeExperienceForCard", () => {
  it("converts basePrice to a plain number", () => {
    const result = serializeExperienceForCard(baseExperience);
    expect(result.basePrice).toBe(5000);
  });

  it("derives nextDeparture and nextDepartureSlot from the first valid slot", () => {
    const exp = {
      ...baseExperience,
      slots: [
        { date: new Date("2026-06-15T00:00:00.000Z"), capacity: 10, remainingCapacity: 4 },
        { date: new Date("2026-07-01T00:00:00.000Z"), capacity: 10, remainingCapacity: 10 },
      ],
    };
    const result = serializeExperienceForCard(exp);
    expect(result.nextDeparture).toBe("2026-06-15T00:00:00.000Z");
    expect(result.nextDepartureSlot).toEqual({
      date: "2026-06-15T00:00:00.000Z",
      capacity: 10,
      remainingCapacity: 4,
    });
    expect(result.upcomingSlots).toHaveLength(2);
  });

  it("filters out slots with an invalid date", () => {
    const exp = {
      ...baseExperience,
      slots: [{ date: "not-a-date", capacity: 10, remainingCapacity: 10 }],
    };
    const result = serializeExperienceForCard(exp);
    expect(result.upcomingSlots).toHaveLength(0);
    expect(result.nextDeparture).toBeNull();
    expect(result.nextDepartureSlot).toBeNull();
  });

  it("returns null nextDeparture when there are no slots", () => {
    const result = serializeExperienceForCard(baseExperience);
    expect(result.nextDeparture).toBeNull();
    expect(result.nextDepartureSlot).toBeNull();
  });

  it("converts advancePaymentAmount to a number when present, null otherwise", () => {
    const withAdvance = { ...baseExperience, advancePaymentAmount: { toString: () => "1500" } };
    expect(serializeExperienceForCard(withAdvance).advancePaymentAmount).toBe(1500);
    expect(serializeExperienceForCard(baseExperience).advancePaymentAmount).toBeNull();
  });
});

describe("resolveExperienceImageUrl", () => {
  const mediaSettings = { provider: "CLOUDINARY" as const, globalQuality: 90, highFidelity: true };

  it("returns the local branded placeholder when the trek has no image at all", () => {
    const exp = { cardImage: null, coverImage: null, images: [] };
    expect(resolveExperienceImageUrl(exp, mediaSettings, { width: 800, crop: "fill" })).toBe(
      EXPERIENCE_PLACEHOLDER_IMAGE,
    );
    expect(getMediaUrl).not.toHaveBeenCalled();
  });

  it("never routes the placeholder path through getMediaUrl (would mangle a same-origin static asset)", () => {
    const exp = { cardImage: undefined, coverImage: undefined, images: [] as string[] };
    resolveExperienceImageUrl(exp, mediaSettings, { width: 800, crop: "fill" });
    expect(getMediaUrl).not.toHaveBeenCalled();
  });

  it("resolves a real cardImage through getMediaUrl, preferring cardImage over coverImage/images", () => {
    const exp = { cardImage: "card.jpg", coverImage: "cover.jpg", images: ["gallery.jpg"] };
    const result = resolveExperienceImageUrl(exp, mediaSettings, { width: 800, crop: "fill" });
    expect(getMediaUrl).toHaveBeenCalledWith("card.jpg", "CLOUDINARY", expect.anything(), { width: 800, crop: "fill" });
    expect(result).toBe("https://res.cloudinary.com/resolved/card.jpg");
  });

  it("falls back to coverImage, then images[0], when cardImage is absent", () => {
    resolveExperienceImageUrl({ cardImage: null, coverImage: "cover.jpg", images: [] }, mediaSettings, { width: 800, crop: "fill" });
    expect(getMediaUrl).toHaveBeenCalledWith("cover.jpg", expect.anything(), expect.anything(), expect.anything());

    resolveExperienceImageUrl({ cardImage: null, coverImage: null, images: ["gallery.jpg"] }, mediaSettings, { width: 800, crop: "fill" });
    expect(getMediaUrl).toHaveBeenCalledWith("gallery.jpg", expect.anything(), expect.anything(), expect.anything());
  });
});
