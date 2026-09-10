import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    homepageSection: { findMany: vi.fn() },
    experience: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { fetchHomepageSections } from "@/lib/homepage-sections";

const mockSection = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "sec1",
  layout: "MOSAIC_GRID",
  name: "Weekend Getaways",
  heading: "Weekend Getaways",
  subheading: "Short escapes",
  displayOrder: 1,
  isActive: true,
  ...overrides,
});

const mockExperience = (id: string) => ({
  id,
  title: `Trek ${id}`,
  basePrice: { toString: () => "1000" },
  advancePaymentAmount: null,
  capacity: 10,
  slots: [],
});

describe("fetchHomepageSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only queries active sections, ordered by displayOrder", async () => {
    vi.mocked(prisma.homepageSection.findMany).mockResolvedValue([]);
    await fetchHomepageSections();
    expect(prisma.homepageSection.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  });

  it("drops a section with zero assigned experiences", async () => {
    vi.mocked(prisma.homepageSection.findMany).mockResolvedValue([mockSection()] as any);
    vi.mocked(prisma.experience.findMany).mockResolvedValue([]);

    const result = await fetchHomepageSections();
    expect(result).toHaveLength(0);
  });

  it("keeps a section that has assigned experiences, with them serialized", async () => {
    vi.mocked(prisma.homepageSection.findMany).mockResolvedValue([mockSection()] as any);
    vi.mocked(prisma.experience.findMany).mockResolvedValue([mockExperience("e1"), mockExperience("e2")] as any);

    const result = await fetchHomepageSections();
    expect(result).toHaveLength(1);
    expect(result[0].experiences).toHaveLength(2);
    expect(result[0].experiences[0].basePrice).toBe(1000);
  });

  it("caps the query per layout (e.g. ALTITUDE_TICKER takes 6, SPEC_PANELS takes 3)", async () => {
    vi.mocked(prisma.homepageSection.findMany).mockResolvedValue([
      mockSection({ id: "s1", layout: "ALTITUDE_TICKER" }),
      mockSection({ id: "s2", layout: "SPEC_PANELS" }),
    ] as any);
    vi.mocked(prisma.experience.findMany).mockResolvedValue([mockExperience("e1")] as any);

    await fetchHomepageSections();

    const calls = vi.mocked(prisma.experience.findMany).mock.calls;
    expect(calls[0][0]).toMatchObject({ where: { homepageSectionId: "s1", status: "PUBLISHED" }, take: 6 });
    expect(calls[1][0]).toMatchObject({ where: { homepageSectionId: "s2", status: "PUBLISHED" }, take: 3 });
  });

  it("orders SPOTLIGHT_MANIFEST by basePrice desc (deterministic hero pick), other layouts by createdAt desc", async () => {
    vi.mocked(prisma.homepageSection.findMany).mockResolvedValue([
      mockSection({ id: "s1", layout: "SPOTLIGHT_MANIFEST" }),
      mockSection({ id: "s2", layout: "MOSAIC_GRID" }),
    ] as any);
    vi.mocked(prisma.experience.findMany).mockResolvedValue([mockExperience("e1")] as any);

    await fetchHomepageSections();

    const calls = vi.mocked(prisma.experience.findMany).mock.calls;
    expect(calls[0][0]).toMatchObject({ orderBy: { basePrice: "desc" } });
    expect(calls[1][0]).toMatchObject({ orderBy: { createdAt: "desc" } });
  });
});
