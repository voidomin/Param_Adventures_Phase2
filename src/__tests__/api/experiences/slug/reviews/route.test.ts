import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findUnique: vi.fn(),
    },
    experienceReview: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/experiences/[slug]/reviews/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockExperienceFindUnique = vi.mocked(prisma.experience.findUnique);
const mockReviewFindMany = vi.mocked(prisma.experienceReview.findMany);
const mockReviewCount = vi.mocked(prisma.experienceReview.count);
const mockReviewAggregate = vi.mocked(prisma.experienceReview.aggregate);
const mockReviewGroupBy = vi.mocked(prisma.experienceReview.groupBy);
const mockReviewFindFirst = vi.mocked(prisma.experienceReview.findFirst);
const mockReviewUpsert = vi.mocked(prisma.experienceReview.upsert);
const mockBookingFindFirst = vi.mocked(prisma.booking.findFirst);

describe("/api/experiences/[slug]/reviews route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 404 when experience is missing", async () => {
      mockExperienceFindUnique.mockResolvedValue(null);

      const response = await GET(
        new NextRequest("http://localhost/api/experiences/everest/reviews"),
        {
          params: Promise.resolve({ slug: "everest" }),
        },
      );

      expect(response.status).toBe(404);
    });

    it("returns list, featured review and stats", async () => {
      mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
      mockReviewFindMany.mockResolvedValue([
        { id: "rev-1", isFeaturedExperience: true },
        { id: "rev-2", isFeaturedExperience: false },
      ] as any);
      mockReviewCount.mockResolvedValue(2);
      mockReviewAggregate.mockResolvedValue({ _avg: { rating: 4.5 } } as any);
      mockReviewGroupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 1 } },
      ] as any);
      mockReviewFindFirst.mockResolvedValue({
        id: "rev-1",
        isFeaturedExperience: true,
        user: { name: "A" },
      } as any);

      const response = await GET(
        new NextRequest(
          "http://localhost/api/experiences/everest/reviews?page=1&limit=10",
        ),
        {
          params: Promise.resolve({ slug: "everest" }),
        },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.featuredReview.id).toBe("rev-1");
      expect(data.reviews).toHaveLength(1);
      expect(data.stats.averageRating).toBe(4.5);
      expect(data.stats.breakdown[5]).toBe(1);
    });
  });

  describe("POST", () => {
    it("returns auth response when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      } as any);

      const response = await POST(
        new NextRequest("http://localhost/api/experiences/everest/reviews", {
          method: "POST",
          body: JSON.stringify({
            rating: 5,
            reviewText: "Excellent trek experience.",
          }),
        }),
        {
          params: Promise.resolve({ slug: "everest" }),
        },
      );

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "u1",
        roleName: "CUSTOMER",
      } as any);

      const response = await POST(
        new NextRequest("http://localhost/api/experiences/everest/reviews", {
          method: "POST",
          body: JSON.stringify({ rating: 6, reviewText: "short" }),
        }),
        {
          params: Promise.resolve({ slug: "everest" }),
        },
      );

      expect(response.status).toBe(400);
    });

    it("returns 403 when user is not eligible and not admin", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "u1",
        roleName: "CUSTOMER",
      } as any);
      mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
      mockBookingFindFirst.mockResolvedValue(null);

      const response = await POST(
        new NextRequest("http://localhost/api/experiences/everest/reviews", {
          method: "POST",
          body: JSON.stringify({
            rating: 5,
            reviewText: "Absolutely loved the route and views.",
          }),
        }),
        {
          params: Promise.resolve({ slug: "everest" }),
        },
      );

      expect(response.status).toBe(403);
    });

    it("upserts review for admin even without booking", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "admin-1",
        roleName: "ADMIN",
      } as any);
      mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
      mockBookingFindFirst.mockResolvedValue(null);
      mockReviewUpsert.mockResolvedValue({ id: "rev-9", rating: 5 } as any);

      const response = await POST(
        new NextRequest("http://localhost/api/experiences/everest/reviews", {
          method: "POST",
          body: JSON.stringify({
            rating: 5,
            reviewText: "Outstanding experience with perfect support team.",
          }),
        }),
        {
          params: Promise.resolve({ slug: "everest" }),
        },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.review.id).toBe("rev-9");
      expect(mockReviewUpsert).toHaveBeenCalled();
    });

    it("returns 500 on unexpected failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "admin-1",
        roleName: "ADMIN",
      } as any);
      mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
      mockBookingFindFirst.mockResolvedValue({ id: "b1" } as any);
      mockReviewUpsert.mockRejectedValue(new Error("db down"));

      const response = await POST(
        new NextRequest("http://localhost/api/experiences/everest/reviews", {
          method: "POST",
          body: JSON.stringify({
            rating: 5,
            reviewText: "Outstanding experience with perfect support team.",
          }),
        }),
        {
          params: Promise.resolve({ slug: "everest" }),
        },
      );

      expect(response.status).toBe(500);
    });
  });
});
