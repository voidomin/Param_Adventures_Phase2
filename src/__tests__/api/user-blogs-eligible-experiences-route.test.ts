import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    blog: { findMany: vi.fn() },
    booking: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/user/blogs/eligible-experiences/route";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockBlogFindMany = vi.mocked(prisma.blog.findMany);
const mockBookingFindMany = vi.mocked(prisma.booking.findMany);

type ReqOpts = { token?: string };

const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) =>
        name === "accessToken" && opts.token
          ? { value: opts.token }
          : undefined,
      ),
    },
  }) as unknown as NextRequest;

describe("GET /api/user/blogs/eligible-experiences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when token missing", async () => {
    const response = await GET(createRequest());
    expect(response.status).toBe(401);
  });

  it("returns 401 when token invalid", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await GET(createRequest({ token: "bad" }));
    expect(response.status).toBe(401);
  });

  it("returns eligible experiences", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockBlogFindMany.mockResolvedValue([
      { experienceId: "e1" },
      { experienceId: null },
    ] as any);
    mockBookingFindMany.mockResolvedValue([
      { experience: { id: "e2", title: "Trip 2" } },
      { experience: { id: "e3", title: "Trip 3" } },
    ] as any);

    const response = await GET(createRequest({ token: "ok" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.experiences).toHaveLength(2);
    expect(mockBookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          experienceId: { notIn: ["e1"] },
        }),
      }),
    );
  });
});
