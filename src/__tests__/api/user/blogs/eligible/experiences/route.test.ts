import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ verifyAccessToken: vi.fn() }));

const { mockBlogFindMany, mockBookingFindMany, mockUserFindUnique } = vi.hoisted(() => ({
  mockBlogFindMany: vi.fn(),
  mockBookingFindMany: vi.fn(),
  mockUserFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    blog: { findMany: mockBlogFindMany },
    booking: { findMany: mockBookingFindMany },
    user: { findUnique: mockUserFindUnique },
  },
}));

import { GET } from "@/app/api/user/blogs/eligible-experiences/route";
import { verifyAccessToken } from "@/lib/auth";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);

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
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: { name: "REGISTERED_USER" } } as any);
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
