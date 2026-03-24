import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizeRequest } from "../lib/api-auth";
import { verifyAccessToken } from "../lib/auth";
import { prisma } from "../lib/db";
import { NextRequest } from "next/server";

vi.unmock("@/lib/api-auth");

vi.mock("../lib/auth");
vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("authorizeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (authHeader?: string, cookieValue?: string) => {
    const headers = new Headers();
    if (authHeader) headers.set("authorization", authHeader);
    
    return {
      headers,
      cookies: {
        get: vi.fn().mockReturnValue(cookieValue ? { value: cookieValue } : undefined),
      },
    } as unknown as NextRequest;
  };

  it("returns 401 if no token is provided", async () => {
    const req = createRequest();
    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 401 if token is invalid", async () => {
    const req = createRequest("Bearer invalid");
    vi.mocked(verifyAccessToken).mockResolvedValue(null);
    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 if user is not found or inactive", async () => {
    const req = createRequest("Bearer valid");
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns 401 if tokenVersion mismatch", async () => {
    const req = createRequest("Bearer valid");
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      status: "ACTIVE",
      tokenVersion: 2, // Mismatch
      deletedAt: null,
      role: { name: "USER", permissions: [] }
    } as any);

    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error).toContain("Session expired");
    }
  });

  it("authorizes a valid request without specific permission", async () => {
    const req = createRequest("Bearer valid");
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      status: "ACTIVE",
      tokenVersion: 1,
      deletedAt: null,
      role: { name: "USER", permissions: [] }
    } as any);

    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("u1");
    }
  });

  it("authorizes a valid request using cookies", async () => {
    const req = createRequest(undefined, "cookie-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      status: "ACTIVE",
      tokenVersion: 1,
      deletedAt: null,
      role: { name: "USER", permissions: [] }
    } as any);

    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(true);
    expect(verifyAccessToken).toHaveBeenCalledWith("cookie-token");
  });

  it("authorizes a SUPER_ADMIN regardless of requiredPermission", async () => {
    const req = createRequest("Bearer valid");
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "SUPER_ADMIN", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      status: "ACTIVE",
      tokenVersion: 1,
      deletedAt: null,
      role: { name: "SUPER_ADMIN", permissions: [] }
    } as any);

    const result = await authorizeRequest(req, "any-permission");
    expect(result.authorized).toBe(true);
  });

  it("checks for required permission", async () => {
    const req = createRequest("Bearer valid");
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      status: "ACTIVE",
      tokenVersion: 1,
      deletedAt: null,
      role: { 
        name: "USER", 
        permissions: [{ permission: { key: "can-view" } }] 
      }
    } as any);

    const okResult = await authorizeRequest(req, "can-view");
    expect(okResult.authorized).toBe(true);

    const failResult = await authorizeRequest(req, "can-delete");
    expect(failResult.authorized).toBe(false);
    if (!failResult.authorized) {
      expect(failResult.response.status).toBe(403);
    }
  });

  it("checks for multiple required permissions (OR logic)", async () => {
    const req = createRequest("Bearer valid");
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      status: "ACTIVE",
      tokenVersion: 1,
      deletedAt: null,
      role: { 
        name: "USER", 
        permissions: [{ permission: { key: "can-view" } }] 
      }
    } as any);

    const result = await authorizeRequest(req, ["can-edit", "can-view"]);
    expect(result.authorized).toBe(true);
  });

  it("returns 500 on internal error", async () => {
    const req = createRequest("Bearer valid");
    vi.mocked(verifyAccessToken).mockRejectedValue(new Error("Database down"));
    
    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(500);
    }
  });
});
