import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Unmock module to try and bypass setup files
vi.unmock("@/lib/api-auth");

// We still want to intercept verifyAccessToken calls 
// so we mock the dependency `@/lib/auth` here manually.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    verifyAccessToken: vi.fn(),
  };
});

import { verifyAccessToken } from "@/lib/auth";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

describe("authorizeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (authHeader?: string, cookieToken?: string) => {
    const req = new NextRequest("http://localhost");
    if (authHeader) {
      req.headers.set("authorization", authHeader);
    }
    if (cookieToken) {
      Object.defineProperty(req, "cookies", {
        value: {
          get: (name: string) => (name === "accessToken" ? { value: cookieToken } : undefined),
        },
      });
    }
    return req;
  };

  it("returns 401 if no token is provided", async () => {
    const { authorizeRequest } = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");
    
    const req = createRequest();
    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 401 if token is invalid or expired", async () => {
    const { authorizeRequest } = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");

    const req = createRequest("Bearer invalid-token");
    mockVerifyAccessToken.mockResolvedValue(null);

    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 if user is not found, deleted, or inactive", async () => {
    const { authorizeRequest } = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");

    const req = createRequest(undefined, "valid-cookie-token");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    
    // User deleted
    mockUserFindUnique.mockResolvedValueOnce({ deletedAt: new Date(), status: "ACTIVE" } as any);
    let result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) expect(result.response.status).toBe(403);

    // User inactive
    mockUserFindUnique.mockResolvedValueOnce({ deletedAt: null, status: "INACTIVE" } as any);
    result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) expect(result.response.status).toBe(403);
  });

  it("returns 401 if session is expired (tokenVersion mismatch)", async () => {
    const { authorizeRequest } = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");

    const req = createRequest("Bearer valid-token");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    mockUserFindUnique.mockResolvedValue({ deletedAt: null, status: "ACTIVE", tokenVersion: 2 } as any);

    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 if user lacks required permission", async () => {
    const { authorizeRequest } = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");

    const req = createRequest("Bearer valid-token");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    mockUserFindUnique.mockResolvedValue({
      deletedAt: null,
      status: "ACTIVE",
      tokenVersion: 1,
      role: { name: "USER", permissions: [{ permission: { key: "other:read" } }] },
    } as any);

    const result = await authorizeRequest(req, "trip:create");
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns authorized payload for SUPER_ADMIN regardless of permissions array", async () => {
    const { authorizeRequest } = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");

    const req = createRequest("Bearer valid-token");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1", roleName: "SUPER_ADMIN", tokenVersion: 1 });
    mockUserFindUnique.mockResolvedValue({
      deletedAt: null,
      status: "ACTIVE",
      tokenVersion: 1,
      role: { name: "SUPER_ADMIN", permissions: [] }, 
    } as any);

    const result = await authorizeRequest(req, "trip:create");
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("u1");
      expect(result.roleName).toBe("SUPER_ADMIN");
    }
  });

  it("returns authorized payload matching specific permission", async () => {
    const { authorizeRequest } = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");

    const req = createRequest("Bearer valid-token");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u2", roleName: "MANAGER", tokenVersion: 1 });
    mockUserFindUnique.mockResolvedValue({
      deletedAt: null,
      status: "ACTIVE",
      tokenVersion: 1,
      role: { name: "MANAGER", permissions: [{ permission: { key: "trip:create" } }] },
    } as any);

    const result = await authorizeRequest(req, "trip:create");
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("u2");
    }
  });

  it("returns 500 on unexpected internal errors", async () => {
    const { authorizeRequest } = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");

    const req = createRequest("Bearer valid-token");
    mockVerifyAccessToken.mockRejectedValue(new Error("Database offline"));

    const result = await authorizeRequest(req);
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.response.status).toBe(500);
    }
  });
});
