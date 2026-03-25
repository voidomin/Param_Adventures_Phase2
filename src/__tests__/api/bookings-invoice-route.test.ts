import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
    },
    platformSetting: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/bookings/[id]/invoice/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockBookingFindUnique = vi.mocked(prisma.booking.findUnique);
const mockPlatformSettingsFindMany = vi.mocked(prisma.platformSetting.findMany);

type ReqOpts = { token?: string };
const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) => (name === "accessToken" && opts.token ? { value: opts.token } : undefined)),
    },
  }) as unknown as NextRequest;

describe("GET /api/bookings/[id]/invoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing", async () => {
    const response = await GET(createRequest(), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await GET(createRequest({ token: "bad" }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(401);
  });

  it("returns 404 when booking is not found", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindUnique.mockResolvedValue(null);

    const response = await GET(createRequest({ token: "ok" }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(404);
  });

  it("returns 403 when booking belongs to another user", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindUnique.mockResolvedValue({ id: "b1", userId: "u2" } as any);

    const response = await GET(createRequest({ token: "ok" }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(403);
  });

  it("returns invoice payload with primary contact and latest payment", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindUnique.mockResolvedValue({
      id: "b1",
      userId: "u1",
      createdAt: new Date("2026-01-01"),
      totalPrice: 1000,
      baseFare: 900,
      taxBreakdown: [],
      bookingStatus: "CONFIRMED",
      participantCount: 2,
      experience: { title: "Trip", location: "Himalaya" },
      participants: [
        { name: "A", isPrimary: false, email: "a@x.com", phoneNumber: "1", pickupPoint: "P" },
        { name: "B", isPrimary: true, email: "b@x.com", phoneNumber: "2", pickupPoint: "Q" },
      ],
      payments: [{ id: "p1", status: "PAID" }],
    } as any);
    mockPlatformSettingsFindMany.mockResolvedValue([
      { key: "companyName", value: "Param Adventures" },
      { key: "gstNumber", value: "GST123" },
    ] as any);

    const response = await GET(createRequest({ token: "ok" }), { params: Promise.resolve({ id: "b1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.booking.id).toBe("b1");
    expect(data.primaryContact.name).toBe("B");
    expect(data.payment.id).toBe("p1");
    expect(data.company.companyName).toBe("Param Adventures");
  });

  it("falls back to first participant and null payment", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindUnique.mockResolvedValue({
      id: "b1",
      userId: "u1",
      createdAt: new Date("2026-01-01"),
      totalPrice: 1000,
      baseFare: 900,
      taxBreakdown: [],
      bookingStatus: "CONFIRMED",
      participantCount: 1,
      experience: { title: "Trip", location: "Himalaya" },
      participants: [{ name: "A", isPrimary: false }],
      payments: [],
    } as any);
    mockPlatformSettingsFindMany.mockResolvedValue([] as any);

    const response = await GET(createRequest({ token: "ok" }), { params: Promise.resolve({ id: "b1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.primaryContact.name).toBe("A");
    expect(data.payment).toBeNull();
  });

  it("returns 500 on unexpected error", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBookingFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET(createRequest({ token: "ok" }), { params: Promise.resolve({ id: "b1" }) });

    expect(response.status).toBe(500);
  });
});
