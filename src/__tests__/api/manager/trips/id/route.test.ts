import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    slot: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET, PATCH } from "@/app/api/manager/trips/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockSlotFindUnique = vi.mocked(prisma.slot.findUnique);
const mockSlotUpdate = vi.mocked(prisma.slot.update);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);

const routeContext = { params: Promise.resolve({ id: "slot-1" }) };

describe("/api/manager/trips/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as unknown as Awaited<ReturnType<typeof authorizeRequest>>);

    const response = await GET({} as NextRequest, routeContext);

    expect(response.status).toBe(401);
  });

  it("GET returns 403 when non-owner non-admin tries to view slot", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "manager-2",
    } as unknown as Awaited<ReturnType<typeof authorizeRequest>>);

    mockSlotFindUnique.mockResolvedValueOnce({ managerId: "manager-1" } as never);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TREK_LEAD" } } as never);

    const response = await GET({} as NextRequest, routeContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden.");
  });

  it("GET returns slot for owner", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "manager-1",
    } as unknown as Awaited<ReturnType<typeof authorizeRequest>>);

    mockSlotFindUnique.mockResolvedValueOnce({
      id: "slot-1",
      managerId: "manager-1",
      experience: { title: "Kedarkantha" },
    } as never);

    mockUserFindUnique.mockResolvedValue({ role: { name: "TREK_MANAGER" } } as never);

    const response = await GET({} as NextRequest, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.slot.id).toBe("slot-1");
  });

  it("PATCH returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "manager-1",
    } as unknown as Awaited<ReturnType<typeof authorizeRequest>>);

    const request = {
      json: vi.fn().mockResolvedValue({ vendorContacts: [{ label: "", value: "123" }] }),
    } as unknown as NextRequest;

    const response = await PATCH(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error)).toContain("Label is required");
  });

  it("PATCH updates vendor contacts for owner", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "manager-1",
    } as unknown as Awaited<ReturnType<typeof authorizeRequest>>);

    mockSlotFindUnique.mockResolvedValueOnce({ managerId: "manager-1" } as never);
    mockUserFindUnique.mockResolvedValue({ role: { name: "TREK_MANAGER" } } as never);
    mockSlotUpdate.mockResolvedValue({ id: "slot-1", vendorContacts: [{ label: "Taxi", value: "999" }] } as never);

    const request = {
      json: vi.fn().mockResolvedValue({
        vendorContacts: [{ label: "Taxi", value: "999" }],
      }),
    } as unknown as NextRequest;

    const response = await PATCH(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockSlotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "slot-1" },
      }),
    );
    expect(data.slot.id).toBe("slot-1");
  });
});
