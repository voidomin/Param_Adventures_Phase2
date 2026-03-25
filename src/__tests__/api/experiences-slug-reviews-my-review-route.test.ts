import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findUnique: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
    },
    experienceReview: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/experiences/[slug]/reviews/my-review/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockExperienceFindUnique = vi.mocked(prisma.experience.findUnique);
const mockBookingFindFirst = vi.mocked(prisma.booking.findFirst);
const mockReviewFindUnique = vi.mocked(prisma.experienceReview.findUnique);

describe("GET /api/experiences/[slug]/reviews/my-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/experiences/everest/reviews/my-review",
      ),
      {
        params: Promise.resolve({ slug: "everest" }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/experiences/everest/reviews/my-review",
        {
          headers: { authorization: "Bearer bad-token" },
        },
      ),
      { params: Promise.resolve({ slug: "everest" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when experience is missing", async () => {
    mockVerifyAccessToken.mockResolvedValue({
      userId: "u1",
      roleName: "CUSTOMER",
    } as any);
    mockExperienceFindUnique.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/experiences/everest/reviews/my-review",
        {
          headers: { authorization: "Bearer token-1" },
        },
      ),
      { params: Promise.resolve({ slug: "everest" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns review and canReview=true for eligible user", async () => {
    mockVerifyAccessToken.mockResolvedValue({
      userId: "u1",
      roleName: "CUSTOMER",
    } as any);
    mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
    mockBookingFindFirst.mockResolvedValue({ id: "b1" } as any);
    mockReviewFindUnique.mockResolvedValue({ id: "rev-1", rating: 4 } as any);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/experiences/everest/reviews/my-review",
        {
          headers: { authorization: "Bearer token-1" },
        },
      ),
      { params: Promise.resolve({ slug: "everest" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.review.id).toBe("rev-1");
    expect(data.canReview).toBe(true);
  });

  it("returns canReview=true for admins without booking", async () => {
    mockVerifyAccessToken.mockResolvedValue({
      userId: "admin-1",
      roleName: "ADMIN",
    } as any);
    mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
    mockBookingFindFirst.mockResolvedValue(null);
    mockReviewFindUnique.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/experiences/everest/reviews/my-review",
        {
          headers: { authorization: "Bearer token-1" },
        },
      ),
      { params: Promise.resolve({ slug: "everest" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.review).toBeNull();
    expect(data.canReview).toBe(true);
  });

  it("returns 500 on unexpected failure", async () => {
    mockVerifyAccessToken.mockResolvedValue({
      userId: "u1",
      roleName: "CUSTOMER",
    } as any);
    mockExperienceFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/experiences/everest/reviews/my-review",
        {
          headers: { authorization: "Bearer token-1" },
        },
      ),
      { params: Promise.resolve({ slug: "everest" }) },
    );

    expect(response.status).toBe(500);
  });
});
