import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/utils/rich-text", () => ({ getPlainTextFromJSON: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    experience: { findUnique: vi.fn() },
    platformSetting: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/experiences/[slug]/itinerary-data/route";
import { getPlainTextFromJSON } from "@/lib/utils/rich-text";
import { prisma } from "@/lib/db";

const mockGetPlainTextFromJSON = vi.mocked(getPlainTextFromJSON);
const mockFindExperience = vi.mocked(prisma.experience.findUnique);
const mockFindSettings = vi.mocked(prisma.platformSetting.findMany);

describe("GET /api/experiences/[slug]/itinerary-data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when experience missing or not published", async () => {
    mockFindExperience.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "trip" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns transformed itinerary payload", async () => {
    mockFindExperience.mockResolvedValue({
      status: "PUBLISHED",
      title: "Snow Trek",
      slug: "snow-trek",
      location: "Manali",
      durationDays: 3,
      difficulty: "MODERATE",
      basePrice: 1000,
      capacity: 20,
      coverImage: "cover.jpg",
      cardImage: "card.jpg",
      images: ["a.jpg"],
      description: { type: "doc" },
      itinerary: [],
      inclusions: [],
      exclusions: [],
      thingsToCarry: [],
      highlights: [],
      cancellationPolicy: "policy",
      meetingPoint: "point",
      meetingTime: "10:00",
      dropoffTime: "18:00",
      maxAltitude: "12000ft",
      trekDistance: "10km",
      bestTimeToVisit: "summer",
      maxGroupSize: 20,
      minAge: 12,
      ageRange: "12-55",
      networkConnectivity: "low",
      lastAtm: "town",
      fitnessRequirement: "basic",
      vibeTags: ["snow"],
      categories: [{ category: { name: "Adventure" } }],
    } as any);
    mockFindSettings.mockResolvedValue([{ key: "companyName", value: "Param" }] as any);
    mockGetPlainTextFromJSON.mockReturnValue("Plain description" as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "snow-trek" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe("Snow Trek");
    expect(data.description).toBe("Plain description");
    expect(data.categories).toEqual(["Adventure"]);
    expect(data.company.name).toBe("Param");
  });

  it("uses string description and default company fallbacks when settings are missing", async () => {
    mockFindExperience.mockResolvedValue({
      status: "PUBLISHED",
      title: "Desert Trek",
      slug: "desert-trek",
      location: "Jaisalmer",
      durationDays: 2,
      difficulty: "EASY",
      basePrice: 800,
      capacity: 10,
      coverImage: null,
      cardImage: null,
      images: [],
      description: "Simple plain description",
      itinerary: [],
      inclusions: [],
      exclusions: [],
      thingsToCarry: [],
      highlights: [],
      cancellationPolicy: "policy",
      meetingPoint: "point",
      meetingTime: "09:00",
      dropoffTime: "17:00",
      maxAltitude: null,
      trekDistance: null,
      bestTimeToVisit: null,
      maxGroupSize: 10,
      minAge: 10,
      ageRange: "10-60",
      networkConnectivity: null,
      lastAtm: null,
      fitnessRequirement: null,
      vibeTags: [],
      categories: [],
    } as any);
    mockFindSettings.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "desert-trek" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.description).toBe("Simple plain description");
    expect(data.company.name).toBe("Param Adventures");
    expect(data.company.phone).toBe("+91 98765 43210");
    expect(data.company.email).toBe("booking@paramadventures.in");
  });

  it("falls back to empty description when description is null", async () => {
    mockFindExperience.mockResolvedValue({
      status: "PUBLISHED",
      title: "Lake Trek",
      slug: "lake-trek",
      location: "Nainital",
      durationDays: 1,
      difficulty: "EASY",
      basePrice: 500,
      capacity: 15,
      coverImage: null,
      cardImage: null,
      images: [],
      description: null,
      itinerary: [],
      inclusions: [],
      exclusions: [],
      thingsToCarry: [],
      highlights: [],
      cancellationPolicy: "policy",
      meetingPoint: "point",
      meetingTime: "08:00",
      dropoffTime: "16:00",
      maxAltitude: null,
      trekDistance: null,
      bestTimeToVisit: null,
      maxGroupSize: 15,
      minAge: 8,
      ageRange: "8-60",
      networkConnectivity: null,
      lastAtm: null,
      fitnessRequirement: null,
      vibeTags: [],
      categories: [],
    } as any);
    mockFindSettings.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "lake-trek" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.description).toBe("");
  });

  it("returns 500 on unexpected error", async () => {
    mockFindExperience.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ slug: "trip" }),
    });

    expect(response.status).toBe(500);
  });
});
