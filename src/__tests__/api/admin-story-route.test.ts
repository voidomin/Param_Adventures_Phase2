import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    storyBlock: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/admin/story/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.storyBlock.findMany);
const mockCreate = vi.mocked(prisma.storyBlock.create);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/admin/story route", () => {
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

    it("returns 403 for disallowed role", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "CUSTOMER" } as any);

      const response = await GET({} as NextRequest);
      expect(response.status).toBe(403);
    });

    it("returns blocks", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockFindMany.mockResolvedValue([{ id: "s1" }] as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.blocks).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { order: "asc" } });
    });

    it("returns 500 on query failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
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

      const response = await POST(createRequest({}));
      expect(response.status).toBe(401);
    });

    it("returns 403 for disallowed role", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "CUSTOMER" } as any);

      const response = await POST(createRequest({}));
      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);

      const response = await POST(createRequest({ type: "hero", title: "", order: -1 }));
      expect(response.status).toBe(400);
    });

    it("creates story block and revalidates", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "SUPER_ADMIN" } as any);
      mockCreate.mockResolvedValue({ id: "s1", title: "Our Story" } as any);

      const response = await POST(
        createRequest({
          type: "hero",
          title: "Our Story",
          imageUrl: "https://cdn.example.com/s.jpg",
          order: 0,
        }),
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.block.id).toBe("s1");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/our-story");
    });

    it("returns 500 on create failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockCreate.mockRejectedValue(new Error("db down"));

      const response = await POST(
        createRequest({
          type: "hero",
          title: "Our Story",
          imageUrl: "https://cdn.example.com/s.jpg",
          order: 0,
        }),
      );

      expect(response.status).toBe(500);
    });
  });
});
