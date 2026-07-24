import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeSystemRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { count: vi.fn() },
    booking: { count: vi.fn() },
    experience: { count: vi.fn() },
    payment: { count: vi.fn() },
    auditLog: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import { GET } from "@/app/api/admin/settings/system/database/stats/route";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeSystemRequest = vi.mocked(authorizeSystemRequest);
const createRequest = () => ({}) as NextRequest;

describe("GET /api/admin/settings/system/database/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: true, userId: "admin-1", roleName: "SUPER_ADMIN" } as any);
    vi.mocked(prisma.user.count).mockResolvedValue(10);
    vi.mocked(prisma.booking.count).mockResolvedValue(20);
    vi.mocked(prisma.experience.count).mockResolvedValue(5);
    vi.mocked(prisma.payment.count).mockResolvedValue(15);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(100);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }] as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: false, response: { status: 401 } } as any);

    const response = await GET(createRequest());
    expect((response as any).status).toBe(401);
  });

  it("returns healthy stats with connection info", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@my-db.render.com:5432/db");

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("HEALTHY");
    expect(data.connection).toEqual({ host: "my-db.render.com", region: "Render (Managed)" });
    expect(data.stats).toEqual({ users: 10, bookings: 20, experiences: 5, payments: 15, auditLogs: 100 });
  });

  it("infers other known regions from the host", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@ep-x.aws.neon.tech/db");

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.connection.region).toBe("Neon (Managed)");
  });

  it("falls back to unknown host info when DATABASE_URL is invalid", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.connection).toEqual({ host: "unknown", region: "Unknown" });
  });

  it("returns 500 with UNHEALTHY status on a query failure", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("connection refused"));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.status).toBe("UNHEALTHY");
  });
});
