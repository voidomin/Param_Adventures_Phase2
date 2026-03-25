import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/user/dashboard/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockBookingFindMany = vi.mocked(prisma.booking.findMany);

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
        slot: { status: "UPCOMING", date: future },
      },
      {
        id: "b2",
        bookingStatus: "CONFIRMED",
        slot: { status: "COMPLETED", date: past },
      },
      {
        id: "b3",
        bookingStatus: "CANCELLED",
        slot: { status: "UPCOMING", date: future },
      },
      {
        id: "b4",
        bookingStatus: "CONFIRMED",
        slot: null,
      },
    ] as any);

    const response = await GET(createRequest({ token: "ok" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.roleName).toBe("USER");
    expect(data.upcomingBookings.map((b: any) => b.id)).toEqual(["b1", "b4"]);
    expect(data.pastBookings.map((b: any) => b.id)).toEqual(["b2", "b3"]);
    expect(data.stats).toEqual({ total: 4, upcoming: 2, past: 2 });
    expect(mockBookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", deletedAt: null },
      }),
    );
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
