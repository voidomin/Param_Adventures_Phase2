import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    customLead: {
      update: vi.fn(),
    },
  },
}));

import { PATCH } from "@/app/api/admin/leads/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLeadUpdate = vi.mocked(prisma.customLead.update);

const createRequest = (body: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as NextRequest;

describe("PATCH /api/admin/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PATCH(createRequest({ status: "CONTACTED" }), {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("passes through non-401 auth responses", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as any);

    const response = await PATCH(createRequest({ status: "CONTACTED" }), {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PATCH(createRequest({ status: "INVALID" }), {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 when status is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PATCH(createRequest({ adminNotes: "note" }), {
      params: Promise.resolve({ id: "lead-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("updates lead status and notes", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockLeadUpdate.mockResolvedValue({
      id: "lead-1",
      status: "CONTACTED",
      adminNotes: "Reached out",
    } as any);

    const response = await PATCH(
      createRequest({ status: "CONTACTED", adminNotes: "Reached out" }),
      {
        params: Promise.resolve({ id: "lead-1" }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("lead-1");
    expect(mockLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: {
        status: "CONTACTED",
        adminNotes: "Reached out",
      },
    });
  });

  it("updates lead with nullable adminNotes", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockLeadUpdate.mockResolvedValue({
      id: "lead-1",
      status: "INTERESTED",
      adminNotes: null,
    } as any);

    const response = await PATCH(
      createRequest({ status: "INTERESTED", adminNotes: null }),
      {
        params: Promise.resolve({ id: "lead-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(mockLeadUpdate).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: {
        status: "INTERESTED",
        adminNotes: null,
      },
    });
  });

  it("returns 500 with error message on failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockLeadUpdate.mockRejectedValue(new Error("db down"));

    const response = await PATCH(createRequest({ status: "CLOSED" }), {
      params: Promise.resolve({ id: "lead-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("db down");
  });

  it("returns fallback 500 error message when thrown error has no message", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockLeadUpdate.mockRejectedValue({ code: "E_UNKNOWN" });

    const response = await PATCH(createRequest({ status: "CLOSED" }), {
      params: Promise.resolve({ id: "lead-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update lead");
  });
});
