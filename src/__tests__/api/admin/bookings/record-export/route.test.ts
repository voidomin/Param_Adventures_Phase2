import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));

import { POST } from "@/app/api/admin/bookings/record-export/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("POST /api/admin/bookings/record-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false, response: { status: 403 } } as any);

    const response = await POST(createRequest({ format: "excel" }));

    expect((response as any).status).toBe(403);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("records the export with actor, format, filters, and row count -- never the exported rows", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);

    const response = await POST(
      createRequest({
        format: "excel",
        filters: { experienceId: "exp-1", startDate: "2026-08-01", endDate: "2026-08-31", status: "CONFIRMED" },
        rowCount: 12,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockLogActivity).toHaveBeenCalledWith("BOOKING_EXPORT_GENERATED", "admin-1", "Booking", null, {
      format: "excel",
      filters: { experienceId: "exp-1", startDate: "2026-08-01", endDate: "2026-08-31", status: "CONFIRMED" },
      rowCount: 12,
    });
  });

  it("returns 500 without throwing when the request body is malformed", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    const badRequest = { json: vi.fn().mockRejectedValue(new Error("bad json")) } as unknown as NextRequest;

    const response = await POST(badRequest);

    expect(response.status).toBe(500);
  });
});
