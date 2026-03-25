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

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/manager/trips/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns auth response when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      } as any);

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "slot-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 404 when slot not found", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "m1",
      } as any);
      mockSlotFindUnique.mockResolvedValue(null);

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "slot-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Trip not found.");
    });

    it("returns 403 when caller is not assigned manager and not admin", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "m1",
      } as any);
      mockSlotFindUnique.mockResolvedValue({ managerId: "m2" } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "USER" } } as any);

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "slot-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden.");
    });

    it("returns slot details for assigned manager", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "m1",
      } as any);
      mockSlotFindUnique.mockResolvedValue({ id: "slot-1", managerId: "m1" } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "slot-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slot.id).toBe("slot-1");
    });

    it("returns slot details for admin even when manager differs", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "a1",
      } as any);
      mockSlotFindUnique.mockResolvedValue({ id: "slot-1", managerId: "m2" } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "slot-1" }),
      });

      expect(response.status).toBe(200);
    });

    it("returns slot details for super admin even when manager differs", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: true,
        userId: "sa1",
      } as any);
      mockSlotFindUnique.mockResolvedValue({ id: "slot-1", managerId: "m2" } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "SUPER_ADMIN" } } as any);

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "slot-1" }),
      });

      expect(response.status).toBe(200);
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
      mockSlotFindUnique.mockRejectedValue(new Error("db down"));

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "slot-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch trip details.");
    });
  });

  describe("PATCH", () => {
    it("returns auth response when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      } as any);

      const response = await PATCH(createRequest({}), {
        params: Promise.resolve({ id: "slot-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);

      const response = await PATCH(createRequest({ vendorContacts: [{ label: "", value: "x" }] }), {
        params: Promise.resolve({ id: "slot-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Label is required");
    });

    it("returns 404 when slot is missing", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
      mockSlotFindUnique.mockResolvedValue(null);

      const response = await PATCH(createRequest({ vendorContacts: [] }), {
        params: Promise.resolve({ id: "slot-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Trip not found.");
    });

    it("returns 403 when caller is not assigned manager and not admin", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
      mockSlotFindUnique.mockResolvedValue({ managerId: "m2" } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "USER" } } as any);

      const response = await PATCH(createRequest({ vendorContacts: [] }), {
        params: Promise.resolve({ id: "slot-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden.");
    });

    it("updates vendorContacts for assigned manager", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
      mockSlotFindUnique.mockResolvedValue({ managerId: "m1" } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "TRIP_MANAGER" } } as any);
      mockSlotUpdate.mockResolvedValue({ id: "slot-1" } as any);

      const response = await PATCH(
        createRequest({ vendorContacts: [{ label: "Cab", value: "999" }] }),
        { params: Promise.resolve({ id: "slot-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slot.id).toBe("slot-1");
      expect(mockSlotUpdate).toHaveBeenCalledWith({
        where: { id: "slot-1" },
        data: { vendorContacts: [{ label: "Cab", value: "999" }] },
      });
    });

    it("normalizes null vendorContacts to empty array", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
      mockSlotFindUnique.mockResolvedValue({ managerId: "m1" } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "SUPER_ADMIN" } } as any);
      mockSlotUpdate.mockResolvedValue({ id: "slot-1" } as any);

      const response = await PATCH(createRequest({ vendorContacts: null }), {
        params: Promise.resolve({ id: "slot-1" }),
      });

      expect(response.status).toBe(200);
      expect(mockSlotUpdate).toHaveBeenCalledWith({
        where: { id: "slot-1" },
        data: { vendorContacts: [] },
      });
    });

    it("allows admin to patch when not assigned manager", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
      mockSlotFindUnique.mockResolvedValue({ managerId: "m1" } as any);
      mockUserFindUnique.mockResolvedValue({ role: { name: "ADMIN" } } as any);
      mockSlotUpdate.mockResolvedValue({ id: "slot-1" } as any);

      const response = await PATCH(
        createRequest({ vendorContacts: [{ label: "Stay", value: "Lodge" }] }),
        { params: Promise.resolve({ id: "slot-1" }) },
      );

      expect(response.status).toBe(200);
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
      mockSlotFindUnique.mockRejectedValue(new Error("db down"));

      const response = await PATCH(createRequest({ vendorContacts: [] }), {
        params: Promise.resolve({ id: "slot-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to update trip details.");
    });
  });
});
