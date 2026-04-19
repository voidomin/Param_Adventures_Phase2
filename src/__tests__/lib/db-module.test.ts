import { afterEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/db");

declare global {
  var prisma: unknown;
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  delete ((globalThis as unknown) as Record<string, any>).prisma;
});

describe("lib/db module", () => {
  it("creates client and caches it on global in non-production", async () => {
    delete ((globalThis as unknown) as Record<string, any>).prisma;

    const poolCtor = vi.fn(function (this: Record<string, unknown>, options: unknown) {
      this.options = options;
    });
    const adapterCtor = vi.fn(function (this: Record<string, unknown>, pool: unknown) {
      this.pool = pool;
    });
    const prismaCtor = vi.fn(function () {
      return {
        user: {},
        savedExperience: {},
      };
    });

    vi.doMock("pg", () => ({
      default: {
        Pool: poolCtor,
      },
    }));

    vi.doMock("@prisma/adapter-pg", () => ({
      PrismaPg: adapterCtor,
    }));

    vi.doMock("@prisma/client", () => ({
      PrismaClient: prismaCtor,
    }));

    vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb");
    vi.stubEnv("NODE_ENV", "test");

    const dbModule = await import("../../lib/db");

    expect(dbModule.prisma).toBeDefined();
    expect(poolCtor).toHaveBeenCalledWith({
      connectionString: "postgres://test:test@localhost:5432/testdb",
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    expect(adapterCtor).toHaveBeenCalledTimes(1);
    expect(prismaCtor).toHaveBeenCalledTimes(1);
    expect(((globalThis as unknown) as Record<string, any>).prisma).toBe(dbModule.prisma);
  });

  it("does not cache prisma on global in production", async () => {
    delete ((globalThis as unknown) as Record<string, any>).prisma;

    vi.doMock("pg", () => ({
      default: {
        Pool: vi.fn(function () {}),
      },
    }));

    vi.doMock("@prisma/adapter-pg", () => ({
      PrismaPg: vi.fn(function () {}),
    }));

    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(function () {
        return { user: {} };
      }),
    }));

    vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb");
    vi.stubEnv("NODE_ENV", "production");

    const dbModule = await import("../../lib/db");

    expect(dbModule.prisma).toBeDefined();
    expect(((globalThis as unknown) as Record<string, any>).prisma).toBeUndefined();
  });
});
