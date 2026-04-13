import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/slugify", () => ({ generateSlug: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/admin/experiences/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { generateSlug } from "@/lib/slugify";
import { prisma } from "@/lib/db";

const mockRevalidatePath = vi.mocked(revalidatePath);
const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockGenerateSlug = vi.mocked(generateSlug);
const mockFindMany = vi.mocked(prisma.experience.findMany);
const mockFindUnique = vi.mocked(prisma.experience.findUnique);
const mockCreate = vi.mocked(prisma.experience.create);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/admin/experiences route", () => {
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

    it("returns experience list", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockResolvedValue([{ id: "exp-1" }] as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.experiences).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
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

      const response = await POST(createRequest({ title: "Trip" }));

      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

      const response = await POST(createRequest({ title: "", basePrice: -1 }));

      expect(response.status).toBe(400);
    });

    it("creates experience and resolves slug collisions", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockGenerateSlug.mockReturnValue("kedarkantha");
      mockFindUnique
        .mockResolvedValueOnce({ id: "existing-1" } as any)
        .mockResolvedValueOnce(null);
      mockCreate.mockResolvedValue({ id: "exp-1", slug: "kedarkantha-1" } as any);

      const response = await POST(
        createRequest({
          title: "Kedarkantha",
          description: { type: "doc" },
          basePrice: 1000,
          capacity: 10,
          coverImage: "https://cdn.example.com/cover.jpg",
          cardImage: "https://cdn.example.com/card.jpg",
          images: ["https://cdn.example.com/1.jpg"],
          categoryIds: ["cat-1"],
          durationDays: 5,
          location: "Manali",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.experience.id).toBe("exp-1");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "kedarkantha-1",
            basePrice: 1000,
            capacity: 10,
            status: "DRAFT",
          }),
        }),
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("returns 500 on create failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockGenerateSlug.mockReturnValue("kedarkantha");
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockRejectedValue(new Error("db down"));

      const response = await POST(
        createRequest({
          title: "Kedarkantha",
          description: { type: "doc" },
          basePrice: 1000,
          capacity: 10,
          coverImage: "https://cdn.example.com/cover.jpg",
          cardImage: "https://cdn.example.com/card.jpg",
          durationDays: 5,
          location: "Manali",
        }),
      );

      expect(response.status).toBe(500);
    });
  });
});
