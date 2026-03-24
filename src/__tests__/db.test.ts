import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock Prisma and pg
vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(function() { return {}; }),
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(function() { return {}; }),
}));

vi.mock("pg", () => {
  const Pool = vi.fn(function() {
    return {
      on: vi.fn(),
      connect: vi.fn(),
      query: vi.fn(),
    };
  });
  return {
    default: {
      Pool: Pool,
    },
  };
});

describe("DB Utils", () => {
  let db: any;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    db = await import("@/lib/db");
  });

  it("prisma instance is exported", () => {
    expect(db.prisma).toBeDefined();
  });
});
