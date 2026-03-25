import { afterEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/db");

declare global {
  // eslint-disable-next-line no-var
  var prisma: unknown;
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  delete (globalThis as any).prisma;
});

describe("lib/db module", () => {
  it("creates client and caches it on global in non-production", async () => {
    delete (globalThis as any).prisma;

    const poolCtor = vi.fn(function (this: any, options: unknown) {
      this.options = options;
    });
    const adapterCtor = vi.fn(function (this: any, pool: unknown) {
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
    });
    expect(adapterCtor).toHaveBeenCalledTimes(1);
    expect(prismaCtor).toHaveBeenCalledTimes(1);
    expect((globalThis as any).prisma).toBe(dbModule.prisma);
  });

  it("does not cache prisma on global in production", async () => {
    delete (globalThis as any).prisma;

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
    expect((globalThis as any).prisma).toBeUndefined();
  });
});
