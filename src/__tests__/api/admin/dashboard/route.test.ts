import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    slot: {
      count: vi.fn(),
    },
    blog: {
      count: vi.fn(),
    },
    customLead: {
      count: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
    experience: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    experienceReview: {
      count: vi.fn(),
    },
    savedExperience: {
      count: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/admin/dashboard/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockBookingAggregate = vi.mocked(prisma.booking.aggregate);
const mockBookingCount = vi.mocked(prisma.booking.count);
const mockBookingFindMany = vi.mocked(prisma.booking.findMany);
const mockSlotCount = vi.mocked(prisma.slot.count);
const mockBlogCount = vi.mocked(prisma.blog.count);
const mockLeadCount = vi.mocked(prisma.customLead.count);
const mockAuditLogFindMany = vi.mocked(prisma.auditLog.findMany);
const mockExperienceFindMany = vi.mocked(prisma.experience.findMany);
const mockExperienceCount = vi.mocked(prisma.experience.count);
const mockUserFindMany = vi.mocked(prisma.user.findMany);
const mockUserCount = vi.mocked(prisma.user.count);
const mockReviewCount = vi.mocked(prisma.experienceReview.count);
const mockSavedCount = vi.mocked(prisma.savedExperience.count);

const createRequest = () => new NextRequest("http://localhost/api/admin/dashboard");

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when role is not SUPER_ADMIN", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("SUPER_ADMIN only");
  });

  it("returns dashboard payload with computed metrics and charts", async () => {
    const now = new Date();
    const lastMonth = new Date(now);
    lastMonth.setMonth(now.getMonth() - 1);

    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);

    mockBookingAggregate.mockResolvedValue({ _sum: { totalPrice: 12345 } } as any);

    mockBookingCount
      .mockResolvedValueOnce(12) // activeBookings30d
      .mockResolvedValueOnce(4) // pending bookings
      .mockResolvedValueOnce(9) // requested
      .mockResolvedValueOnce(20) // confirmed
      .mockResolvedValueOnce(3); // cancelled

    mockSlotCount.mockResolvedValue(7);
    mockBlogCount.mockResolvedValue(6);
    mockLeadCount.mockResolvedValue(8);

    mockAuditLogFindMany.mockResolvedValue([
      { id: "a1", action: "BOOKING_CREATED", timestamp: now },
    ] as any);

    mockBookingFindMany.mockResolvedValue([
      { totalPrice: 1000, createdAt: now },
      { totalPrice: 2500, createdAt: now },
      { totalPrice: 3000, createdAt: lastMonth },
    ] as any);

    mockExperienceFindMany.mockResolvedValue([
      {
        id: "e1",
        title: "A Very Long Experience Title That Should Be Truncated",
        _count: { bookings: 22 },
      },
      {
        id: "e2",
        title: "Short Title",
        _count: { bookings: 10 },
      },
    ] as any);

    mockUserFindMany.mockResolvedValue([
      { createdAt: now },
      { createdAt: now },
      { createdAt: lastMonth },
    ] as any);

    mockUserCount.mockResolvedValue(100);
    mockExperienceCount.mockResolvedValue(18);
    mockReviewCount.mockResolvedValue(321);
    mockSavedCount.mockResolvedValue(222);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);

    expect(data.metrics).toEqual(
      expect.objectContaining({
        totalRevenue30d: 12345,
        activeBookings30d: 12,
        upcomingTrips: 7,
        totalUsers: 100,
        totalExperiences: 18,
        totalReviews: 321,
        totalSaves: 222,
      }),
    );

    expect(data.pendingActions).toEqual({
      blogs: 6,
      bookings: 4,
      leads: 8,
    });

    expect(data.charts.revenueByMonth).toHaveLength(6);
    const totalRevenueByMonth = data.charts.revenueByMonth.reduce(
      (sum: number, p: { revenue: number }) => sum + p.revenue,
      0,
    );
    expect(totalRevenueByMonth).toBe(6500);

    expect(data.charts.bookingsByStatus).toEqual([
      { status: "Requested", count: 9, color: "#f59e0b" },
      { status: "Confirmed", count: 20, color: "#22c55e" },
      { status: "Cancelled", count: 3, color: "#ef4444" },
    ]);

    expect(data.charts.topExperiences[0].bookings).toBe(22);
    expect(data.charts.topExperiences[0].name.length).toBeLessThanOrEqual(26);
    expect(data.charts.topExperiences[0].name.endsWith("…")).toBe(true);
    expect(data.charts.userGrowth).toHaveLength(6);
  });

  it("defaults revenue to 0 when aggregate sum is null", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);

    mockBookingAggregate.mockResolvedValue({ _sum: { totalPrice: null } } as any);
    mockBookingCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockSlotCount.mockResolvedValue(0);
    mockBlogCount.mockResolvedValue(0);
    mockLeadCount.mockResolvedValue(0);
    mockAuditLogFindMany.mockResolvedValue([] as any);
    mockBookingFindMany.mockResolvedValue([] as any);
    mockExperienceFindMany.mockResolvedValue([] as any);
    mockUserFindMany.mockResolvedValue([] as any);
    mockUserCount.mockResolvedValue(0);
    mockExperienceCount.mockResolvedValue(0);
    mockReviewCount.mockResolvedValue(0);
    mockSavedCount.mockResolvedValue(0);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metrics.totalRevenue30d).toBe(0);
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);

    mockBookingAggregate.mockRejectedValue(new Error("db down"));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch admin dashboard data.");
  });
});
