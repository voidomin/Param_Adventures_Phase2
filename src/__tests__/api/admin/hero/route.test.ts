import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    heroSlide: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/admin/hero/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.heroSlide.findMany);
const mockFindFirst = vi.mocked(prisma.heroSlide.findFirst);
const mockCreate = vi.mocked(prisma.heroSlide.create);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/admin/hero route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 403 when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns slides", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockResolvedValue([{ id: "h1" }] as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slides).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { order: "asc" } });
    });

    it("returns 500 on db failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockRejectedValue(new Error("db down"));

      const response = await GET({} as NextRequest);
      expect(response.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("returns 403 when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

      const response = await POST(createRequest({ title: "Hero" }));
      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

      const response = await POST(
        createRequest({ title: "", videoUrl: "bad" }),
      );
      expect(response.status).toBe(400);
    });

    it("creates with incremented order when last slide exists", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindFirst.mockResolvedValue({ id: "h0", order: 4 } as any);
      mockCreate.mockResolvedValue({ id: "h1", order: 5 } as any);

      const response = await POST(
        createRequest({
          title: "Hero",
          subtitle: "Subtitle",
          videoUrl: "https://cdn.example.com/v.mp4",
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("h1");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 5,
            isActive: true,
          }),
        }),
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("creates with order 0 when no prior slides", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: "h1", order: 0 } as any);

      const response = await POST(
        createRequest({
          title: "Hero",
          videoUrl: "https://cdn.example.com/v.mp4",
          isActive: false,
        }),
      );

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 0,
            isActive: false,
          }),
        }),
      );
    });

    it("returns 500 on create failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindFirst.mockResolvedValue({ id: "h0", order: 1 } as any);
      mockCreate.mockRejectedValue(new Error("db down"));

      const response = await POST(
        createRequest({
          title: "Hero",
          videoUrl: "https://cdn.example.com/v.mp4",
        }),
      );

      expect(response.status).toBe(500);
    });
  });
});
