import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword, verifyPassword, generateAccessToken, verifyAccessToken, generateRefreshToken, verifyRefreshToken } from "../lib/auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/db";

vi.mock("bcryptjs");
vi.mock("jsonwebtoken");
vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("auth library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("password hashing", () => {
    it("calls bcrypt.hash with correct rounds", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as any);
      const result = await hashPassword("password");
      expect(bcrypt.hash).toHaveBeenCalledWith("password", 12);
      expect(result).toBe("hashed");
    });

    it("verifies password correctly", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      const result = await verifyPassword("password", "hash");
      expect(bcrypt.compare).toHaveBeenCalledWith("password", "hash");
      expect(result).toBe(true);
    });
  });

  describe("JWT tokens", () => {
    it("generates an access token", () => {
      vi.mocked(jwt.sign).mockReturnValue("access-token" as any);
      const result = generateAccessToken("user1", "ADMIN", 1);
      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toBe("access-token");
    });

    it("generates a refresh token", () => {
      vi.mocked(jwt.sign).mockReturnValue("refresh-token" as any);
      const result = generateRefreshToken("user1", 1);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user1", type: "refresh" }),
        expect.any(String),
        expect.any(Object)
      );
      expect(result).toBe("refresh-token");
    });

    it("verifies a valid access token", async () => {
      const payload = { userId: "user1", roleName: "ADMIN", tokenVersion: 1 };
      vi.mocked(jwt.verify).mockReturnValue(payload as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        status: "ACTIVE",
        tokenVersion: 1,
        deletedAt: null,
      } as any);

      const result = await verifyAccessToken("valid-token");
      expect(result).toEqual(payload);
    });

    it("returns null for invalid user or status", async () => {
      vi.mocked(jwt.verify).mockReturnValue({ userId: "user1", roleName: "ADMIN", tokenVersion: 1 } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        status: "BANNED",
        tokenVersion: 1,
        deletedAt: null,
      } as any);

      const result = await verifyAccessToken("invalid-token");
      expect(result).toBeNull();
    });

    it("returns null if tokenVersion mismatch", async () => {
      vi.mocked(jwt.verify).mockReturnValue({ userId: "user1", roleName: "ADMIN", tokenVersion: 1 } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        status: "ACTIVE",
        tokenVersion: 2,
        deletedAt: null,
      } as any);

      const result = await verifyAccessToken("old-token");
      expect(result).toBeNull();
    });

    it("returns null for malformed token payload", async () => {
      vi.mocked(jwt.verify).mockReturnValue({ userId: "user1" } as any); // missing fields
      const result = await verifyAccessToken("malformed-token");
      expect(result).toBeNull();
    });

    it("returns null if jwt.verify throws", async () => {
      vi.mocked(jwt.verify).mockImplementation(() => { throw new Error("expired"); });
      const result = await verifyAccessToken("expired-token");
      expect(result).toBeNull();
    });

    it("verifies a valid refresh token", () => {
      const payload = { userId: "user1", type: "refresh", tokenVersion: 1 };
      vi.mocked(jwt.verify).mockReturnValue(payload as any);
      const result = verifyRefreshToken("valid-refresh");
      expect(result).toEqual(payload);
    });

    it("returns null for invalid refresh token type", () => {
      vi.mocked(jwt.verify).mockReturnValue({ userId: "user1", type: "access" } as any);
      const result = verifyRefreshToken("not-a-refresh-token");
      expect(result).toBeNull();
    });

    it("returns null if jwt.verify throws in verifyRefreshToken", () => {
      vi.mocked(jwt.verify).mockImplementation(() => { throw new Error("expired"); });
      const result = verifyRefreshToken("expired-token");
      expect(result).toBeNull();
    });
  });
});
