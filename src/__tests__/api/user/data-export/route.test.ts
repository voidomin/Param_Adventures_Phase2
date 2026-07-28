import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookieGet })),
}));
vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
    experienceReview: { findMany: vi.fn() },
    savedExperience: { findMany: vi.fn() },
    travelCoupon: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/user/data-export/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);

describe("GET /api/user/data-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);
    vi.mocked(prisma.experienceReview.findMany).mockResolvedValue([]);
    vi.mocked(prisma.savedExperience.findMany).mockResolvedValue([]);
    vi.mocked(prisma.travelCoupon.findMany).mockResolvedValue([]);
  });

  it("returns 401 when no access token cookie is present", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 401 when the token is invalid", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 404 when the user no longer exists", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(404);
  });

  it("returns the user's profile, bookings, reviews, saved experiences, and coupons", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1", email: "user@example.com", name: "Jane",
    } as any);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([{ id: "b1" }] as any);
    vi.mocked(prisma.experienceReview.findMany).mockResolvedValue([{ id: "r1" }] as any);
    vi.mocked(prisma.savedExperience.findMany).mockResolvedValue([{ savedAt: new Date() }] as any);
    vi.mocked(prisma.travelCoupon.findMany).mockResolvedValue([{ code: "PARAM-1" }] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.email).toBe("user@example.com");
    expect(data.bookings).toHaveLength(1);
    expect(data.reviews).toHaveLength(1);
    expect(data.savedExperiences).toHaveLength(1);
    expect(data.coupons).toHaveLength(1);
    expect(data.exportedAt).toBeDefined();
  });

  it("returns 500 on an unexpected error", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("db down"));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
