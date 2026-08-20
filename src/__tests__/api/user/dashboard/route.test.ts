import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
    refundRequest: { findMany: vi.fn() },
    travelCoupon: { findMany: vi.fn() },
    experienceReview: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/user/dashboard/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockBookingFindMany = vi.mocked(prisma.booking.findMany);
const mockRefundRequestFindMany = vi.mocked((prisma as any).refundRequest.findMany);
const mockTravelCouponFindMany = vi.mocked((prisma as any).travelCoupon.findMany);
const mockExperienceReviewFindMany = vi.mocked((prisma as any).experienceReview.findMany);

type ReqOpts = { token?: string };

const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) =>
        name === "accessToken" && opts.token ? { value: opts.token } : undefined,
      ),
    },
  }) as unknown as NextRequest;

describe("GET /api/user/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing", async () => {
    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required.");
  });

  it("returns 401 when token is invalid", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await GET(createRequest({ token: "bad" }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid token.");
  });

  it("returns 404 when user is not found", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue(null);

    const response = await GET(createRequest({ token: "ok" }));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found.");
  });

  it("returns user dashboard with upcoming and past booking splits", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue({
      id: "u1",
      name: "Alex",
      email: "alex@example.com",
      role: { name: "USER" },
    } as any);
    mockBookingFindMany.mockResolvedValue([
      {
        id: "b1",
        bookingStatus: "CONFIRMED",
        canReview: false,
        slot: { status: "UPCOMING", date: future },
      },
      {
        id: "b2",
        bookingStatus: "CONFIRMED",
        canReview: true,
        experienceId: "exp-2",
        slot: { status: "COMPLETED", date: past },
      },
      {
        id: "b3",
        bookingStatus: "CANCELLED",
        canReview: false,
        slot: { status: "UPCOMING", date: future },
      },
      {
        id: "b4",
        bookingStatus: "CONFIRMED",
        canReview: false,
        slot: null,
      },
    ] as any);
    mockRefundRequestFindMany.mockResolvedValue([]);
    mockTravelCouponFindMany.mockResolvedValue([]);
    mockExperienceReviewFindMany.mockResolvedValue([]);

    const response = await GET(createRequest({ token: "ok" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.roleName).toBe("USER");
    expect(data.upcomingBookings.map((b: any) => b.id)).toEqual(["b1", "b4"]);
    expect(data.pastBookings.map((b: any) => b.id)).toEqual(["b2", "b3"]);
    expect(data.eligibleReviewBookings.map((b: any) => b.id)).toEqual(["b2"]);
    expect(data.refundRequests).toEqual([]);
    expect(data.coupons).toEqual([]);
    expect(data.stats).toEqual({ total: 4, upcoming: 2, past: 2 });
    expect(mockBookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", deletedAt: null },
      }),
    );
  });

  it("excludes bookings for experiences the user has already reviewed from eligibleReviewBookings", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue({
      id: "u1",
      name: "Alex",
      email: "alex@example.com",
      role: { name: "USER" },
    } as any);
    mockBookingFindMany.mockResolvedValue([
      {
        id: "b2",
        bookingStatus: "CONFIRMED",
        canReview: true,
        experienceId: "exp-2",
        slot: { status: "COMPLETED", date: past },
      },
      {
        id: "b5",
        bookingStatus: "CONFIRMED",
        canReview: true,
        experienceId: "exp-5",
        slot: { status: "COMPLETED", date: past },
      },
    ] as any);
    mockRefundRequestFindMany.mockResolvedValue([]);
    mockTravelCouponFindMany.mockResolvedValue([]);
    // Already left a review for exp-2's experience -- should stop being nagged for it.
    mockExperienceReviewFindMany.mockResolvedValue([{ experienceId: "exp-2" }] as any);

    const response = await GET(createRequest({ token: "ok" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.eligibleReviewBookings.map((b: any) => b.id)).toEqual(["b5"]);
  });

  it("returns 500 on unexpected error", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUserFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET(createRequest({ token: "ok" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to load dashboard data.");
  });
});
