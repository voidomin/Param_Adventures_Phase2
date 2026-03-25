import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    role: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/admin/roles/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockRoleFindMany = vi.mocked(prisma.role.findMany);

describe("GET /api/admin/roles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(401);
  });

  it("returns 403 when actor role is not privileged", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "REGISTERED_USER" } } as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(403);
  });

  it("returns 403 when actor user record is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(403);
  });

  it("SUPER_ADMIN excludes only alwaysExcluded roles", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "SUPER_ADMIN" } } as any);
    mockRoleFindMany.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(200);
    expect(mockRoleFindMany).toHaveBeenCalledWith({
      where: { name: { notIn: ["GUEST", "USER"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    });
  });

  it("ADMIN additionally excludes SUPER_ADMIN", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
    mockRoleFindMany.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(200);
    expect(mockRoleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { notIn: ["GUEST", "USER", "SUPER_ADMIN"] } },
      }),
    );
  });

  it("TRIP_MANAGER sees only TREK_LEAD", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);
    mockRoleFindMany.mockResolvedValue([] as any);

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(200);
    expect(mockRoleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: "TREK_LEAD" } }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(500);
  });
});
