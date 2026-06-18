import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/bootstrap/route";
import { NextRequest } from "next/server";
import { SystemService } from "@/services/system.service";
import { authLimiter } from "@/lib/rate-limiter";

vi.mock("@/services/system.service", () => ({
  SystemService: {
    bootstrapDatabase: vi.fn(),
    repairSchema: vi.fn(),
    verifySmtpConnection: vi.fn()
  }
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    $disconnect: vi.fn()
  }
}));

describe("Bootstrap Endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore the rate-limiter mock cleared by resetAllMocks
    vi.mocked(authLimiter.check).mockReturnValue({ success: true, limit: 20, remaining: 19, reset: 0 });
    vi.stubEnv("BOOTSTRAP_TOKEN", "super-secret-bootstrap-token");
    vi.stubEnv("NODE_ENV", "development");
  });

  it("should return 403 in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const req = new NextRequest("http://localhost/api/admin/bootstrap", {
      method: "POST",
      headers: {
        "X-Bootstrap-Token": "super-secret-bootstrap-token"
      }
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Bootstrap actions are disabled in production");
  });

  it("should return 401 when bootstrap token is invalid", async () => {
    const req = new NextRequest("http://localhost/api/admin/bootstrap", {
      method: "POST",
      headers: {
        "X-Bootstrap-Token": "wrong-token"
      }
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Unauthorized");
  });

  it("should run seeding successfully when bootstrap token is valid in development", async () => {
    vi.mocked(SystemService.bootstrapDatabase).mockResolvedValue({ seeded: true } as any);

    const req = new NextRequest("http://localhost/api/admin/bootstrap", {
      method: "POST",
      headers: {
        "X-Bootstrap-Token": "super-secret-bootstrap-token"
      }
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("Database bootstrap completed successfully");
    expect(SystemService.bootstrapDatabase).toHaveBeenCalled();
  });
});
