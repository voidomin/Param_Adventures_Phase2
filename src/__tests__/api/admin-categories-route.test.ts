import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/admin/categories/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.category.findMany);
const mockFindUnique = vi.mocked(prisma.category.findUnique);
const mockCreate = vi.mocked(prisma.category.create);

const createRequest = (body: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as NextRequest;

describe("/api/admin/categories route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns auth response when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      } as any);

      const response = await GET({} as NextRequest);

      expect(response.status).toBe(401);
    });

    it("returns mapped categories list", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockResolvedValue([
        {
          id: "c1",
          name: "Trekking",
          slug: "trekking",
          icon: "mountain",
          isActive: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          _count: { experiences: 3 },
        },
      ] as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories[0]).toEqual(
        expect.objectContaining({
          id: "c1",
          experienceCount: 3,
        }),
      );
    });

    it("returns 500 on query failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockRejectedValue(new Error("db down"));

      const response = await GET({} as NextRequest);

      expect(response.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("returns auth response when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      } as any);

      const response = await POST(createRequest({ name: "Trekking" }));

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

      const response = await POST(createRequest({ name: "" }));

      expect(response.status).toBe(400);
    });

    it("returns 409 for duplicate slug", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindUnique.mockResolvedValue({ id: "c1" } as any);

      const response = await POST(createRequest({ name: "Trekking" }));

      expect(response.status).toBe(409);
    });

    it("creates category with normalized slug and revalidates", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: "c1", slug: "trekking-camping" } as any);

      const response = await POST(
        createRequest({ name: " Trekking & Camping ", icon: "mountain" }),
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.category.id).toBe("c1");
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: "Trekking & Camping",
          slug: "trekking-camping",
          icon: "mountain",
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("stores null icon when icon is missing", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: "c2", slug: "snow" } as any);

      const response = await POST(createRequest({ name: "Snow" }));

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: "Snow",
          slug: "snow",
          icon: null,
        },
      });
    });

    it("returns 500 on unexpected failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindUnique.mockRejectedValue(new Error("db down"));

      const response = await POST(createRequest({ name: "Trekking" }));

      expect(response.status).toBe(500);
    });
  });
});
