import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (password: string) => `mock-hash-${password}`),
    compare: vi.fn(async (password: string, hash: string) => hash === `mock-hash-${password}`),
  },
}));

// Try to unmock static imports if possible
vi.unmock("@/lib/auth");

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    platformSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

const TEST_PASSWORD_A = "mySecurePassword123"; // NOSONAR
const TEST_PASSWORD_B = "password456"; // NOSONAR


describe("Auth Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", "test-secret-key-12345");
  });

  describe("Password Hashing", () => {
    it("hashes password and returns a string", async () => {
      const { hashPassword } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      const password = TEST_PASSWORD_A;
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(typeof hash).toBe("string");
      expect(hash).toBe(`mock-hash-${TEST_PASSWORD_A}`);
    }, 15000);

    it("verifies a correct password", async () => {
      const { hashPassword, verifyPassword } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      const password = TEST_PASSWORD_B;
      const hash = await hashPassword(password);
      const isMatch = await verifyPassword(password, hash);
      expect(isMatch).toBe(true);
    }, 15000);

    it("rejects an incorrect password", async () => {
      const { hashPassword, verifyPassword } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      const password = TEST_PASSWORD_B;
      const hash = await hashPassword(password);
      const isMatch = await verifyPassword("wrongpassword", hash);
      expect(isMatch).toBe(false);
    }, 15000);
  });

  describe("JWT Tokens", () => {
    const userId = "test-user-id";
    const roleName = "USER";
    const tokenVersion = 1;

    it("generates an access token", async () => {
      const { generateAccessToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      const token = await generateAccessToken(userId, roleName, tokenVersion);
      expect(token).toBeDefined();
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.roleName).toBe(roleName);
      expect(decoded.tokenVersion).toBe(tokenVersion);
    });

    it("generates a refresh token", async () => {
      const { generateRefreshToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      const token = await generateRefreshToken(userId, tokenVersion);
      expect(token).toBeDefined();
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe("refresh");
      expect(decoded.tokenVersion).toBe(tokenVersion);
    });

    it("verifies a valid access token and fetches user status", async () => {
      const { generateAccessToken, verifyAccessToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      mockUserFindUnique.mockResolvedValue({
        status: "ACTIVE",
        tokenVersion: tokenVersion,
        deletedAt: null,
      } as any);

      const token = await generateAccessToken(userId, roleName, tokenVersion);
      const decoded = await verifyAccessToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(userId);
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { status: true, tokenVersion: true, deletedAt: true },
      });
    });

    it("returns null if access token user is deleted", async () => {
      const { generateAccessToken, verifyAccessToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      mockUserFindUnique.mockResolvedValue({
        status: "ACTIVE",
        tokenVersion: tokenVersion,
        deletedAt: new Date(),
      } as any);

      const token = await generateAccessToken(userId, roleName, tokenVersion);
      const decoded = await verifyAccessToken(token);

      expect(decoded).toBeNull();
    });

    it("returns null if access token user is inactive", async () => {
      const { generateAccessToken, verifyAccessToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      mockUserFindUnique.mockResolvedValue({
        status: "INACTIVE",
        tokenVersion: tokenVersion,
        deletedAt: null,
      } as any);

      const token = await generateAccessToken(userId, roleName, tokenVersion);
      const decoded = await verifyAccessToken(token);

      expect(decoded).toBeNull();
    });

    it("returns null if access token version mismatches (revoked)", async () => {
      const { generateAccessToken, verifyAccessToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      mockUserFindUnique.mockResolvedValue({
        status: "ACTIVE",
        tokenVersion: 2,
        deletedAt: null,
      } as any);

      const token = await generateAccessToken(userId, roleName, tokenVersion);
      const decoded = await verifyAccessToken(token);

      expect(decoded).toBeNull();
    });

    it("returns null for malformed access token", async () => {
      const { verifyAccessToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      const decoded = await verifyAccessToken("invalid.token.here");
      expect(decoded).toBeNull();
    });

    it("verifies a valid refresh token", async () => {
      const { generateRefreshToken, verifyRefreshToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      const token = await generateRefreshToken(userId, tokenVersion);
      const decoded = await verifyRefreshToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(userId);
    });

    it("returns null for malformed refresh token", async () => {
      const { verifyRefreshToken } = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
      const decoded = await verifyRefreshToken("bad-token");
      expect(decoded).toBeNull();
    });
  });
});
