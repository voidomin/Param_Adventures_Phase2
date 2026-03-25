import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    slot: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    experience: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/admin/experiences/[id]/slots/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockSlotFindMany = vi.mocked(prisma.slot.findMany);
const mockSlotCreate = vi.mocked(prisma.slot.create);
const mockExperienceFindUnique = vi.mocked(prisma.experience.findUnique);

const createRequest = (body: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as NextRequest;

describe("/api/admin/experiences/[id]/slots route", () => {
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
        params: Promise.resolve({ id: "exp-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns slots list", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockSlotFindMany.mockResolvedValue([{ id: "s1" }] as any);

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "exp-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slots).toHaveLength(1);
      expect(mockSlotFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { experienceId: "exp-1" },
          orderBy: { date: "asc" },
        }),
      );
    });

    it("returns 500 on query failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockSlotFindMany.mockRejectedValue(new Error("db down"));

      const response = await GET({} as NextRequest, {
        params: Promise.resolve({ id: "exp-1" }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("returns auth response when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      } as any);

      const response = await POST(createRequest({}), {
        params: Promise.resolve({ id: "exp-1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

      const response = await POST(createRequest({ date: "bad", capacity: 0 }), {
        params: Promise.resolve({ id: "exp-1" }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 404 when experience is not found", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockExperienceFindUnique.mockResolvedValue(null);

      const response = await POST(
        createRequest({ date: "2026-09-01T00:00:00.000Z", capacity: 10 }),
        { params: Promise.resolve({ id: "exp-1" }) },
      );

      expect(response.status).toBe(404);
    });

    it("creates slot with remainingCapacity equal to capacity", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
      mockSlotCreate.mockResolvedValue({ id: "s1", capacity: 12, remainingCapacity: 12 } as any);

      const response = await POST(
        createRequest({ date: "2026-09-01T00:00:00.000Z", capacity: 12 }),
        { params: Promise.resolve({ id: "exp-1" }) },
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.slot.id).toBe("s1");
      expect(mockSlotCreate).toHaveBeenCalledWith({
        data: {
          experienceId: "exp-1",
          date: new Date("2026-09-01T00:00:00.000Z"),
          capacity: 12,
          remainingCapacity: 12,
        },
      });
    });

    it("accepts parseable non-ISO date strings", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockExperienceFindUnique.mockResolvedValue({ id: "exp-1" } as any);
      mockSlotCreate.mockResolvedValue({ id: "s1" } as any);

      const response = await POST(
        createRequest({ date: "September 1, 2026", capacity: 5 }),
        { params: Promise.resolve({ id: "exp-1" }) },
      );

      expect(response.status).toBe(201);
    });

    it("returns 500 on unexpected failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockExperienceFindUnique.mockRejectedValue(new Error("db down"));

      const response = await POST(
        createRequest({ date: "2026-09-01T00:00:00.000Z", capacity: 10 }),
        { params: Promise.resolve({ id: "exp-1" }) },
      );

      expect(response.status).toBe(500);
    });
  });
});
