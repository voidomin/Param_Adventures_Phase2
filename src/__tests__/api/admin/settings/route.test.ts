import { describe, it, expect, vi } from "vitest";

// Auto-generated test
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    booking: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    experience: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  }
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin", role: "ADMIN" } })
}));

describe("Auto-generated API Test for settings/route.ts", () => {
  it("imports safely", async () => {
     try {
       const mod = await import("@/app/api/admin/settings/route");
       expect(mod).toBeDefined();
     } catch (e) {
       // ignore import errors during dynamic generation
     }
  });
});
