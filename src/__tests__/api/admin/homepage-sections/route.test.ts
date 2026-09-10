import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    homepageSection: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/admin/homepage-sections/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.homepageSection.findMany);

describe("GET /api/admin/homepage-sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET({} as NextRequest);
    expect(response.status).toBe(401);
  });

  it("lists sections ordered by displayOrder, with experienceCount flattened", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockResolvedValue([
      {
        id: "sec-1",
        layout: "MOSAIC_GRID",
        name: "Weekend Getaways",
        heading: "Weekend Getaways",
        subheading: "Short escapes",
        displayOrder: 1,
        isActive: true,
        _count: { experiences: 3 },
      },
    ] as any);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { displayOrder: "asc" } }),
    );
    expect(data.sections[0]).toMatchObject({
      id: "sec-1",
      name: "Weekend Getaways",
      experienceCount: 3,
    });
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest);
    expect(response.status).toBe(500);
  });
});
