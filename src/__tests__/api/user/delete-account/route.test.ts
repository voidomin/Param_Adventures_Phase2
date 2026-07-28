import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookieGet })),
}));
vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { compare: vi.fn() } }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    booking: { findFirst: vi.fn() },
  },
}));

import { POST } from "@/app/api/user/delete-account/route";
import { verifyAccessToken } from "@/lib/auth";
import { logActivity } from "@/lib/audit-logger";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockCompare = vi.mocked(bcrypt.compare);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

const validBody = { password: "correct-password", confirmation: "DELETE" };
const baseUser = { id: "u1", password: "hashed" };

describe("POST /api/user/delete-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: "token" });
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as any);
    mockCompare.mockResolvedValue(true as never);
    vi.mocked(prisma.booking.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "u1" } as any);
  });

  it("returns 401 when no access token cookie is present", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("returns 401 when the token is invalid", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("returns 400 when the confirmation text isn't exactly DELETE", async () => {
    const response = await POST(createRequest({ password: "x", confirmation: "delete" }));
    expect(response.status).toBe(400);
  });

  it("returns 404 when the user no longer has a password (already deleted/OAuth)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", password: null } as any);

    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(404);
  });

  it("returns 400 for an incorrect password", async () => {
    mockCompare.mockResolvedValue(false as never);

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Incorrect password");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns 409 when there's an unresolved payment obligation", async () => {
    vi.mocked(prisma.booking.findFirst).mockResolvedValue({ id: "b1" } as any);

    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain("upcoming trip or an unresolved payment");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("checks for both unresolved payments and future confirmed bookings", async () => {
    await POST(createRequest(validBody));

    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          OR: expect.arrayContaining([
            { paymentStatus: { in: ["PENDING", "PARTIALLY_PAID", "REFUND_PENDING"] } },
            expect.objectContaining({ bookingStatus: "CONFIRMED" }),
          ]),
        }),
      }),
    );
  });

  it("anonymizes the user, bumps tokenVersion, and logs activity", async () => {
    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("deleted");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({
        email: "deleted-u1@deleted.paramadventures.in",
        name: "Deleted User",
        password: null,
        phoneNumber: null,
        deletedAt: expect.any(Date),
        tokenVersion: { increment: 1 },
      }),
    });
    expect(logActivity).toHaveBeenCalledWith("ACCOUNT_DELETED", "u1", "User", "u1", { requestedBy: "self" });
  });

  it("returns 500 on an unexpected error", async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest(validBody));
    expect(response.status).toBe(500);
  });
});
