import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    storyBlock: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE, PUT } from "@/app/api/admin/story/[id]/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.storyBlock.findUnique);
const mockUpdate = vi.mocked(prisma.storyBlock.update);
const mockDelete = vi.mocked(prisma.storyBlock.delete);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/admin/story/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PUT", () => {
    it("returns auth response when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      } as any);

      const response = await PUT(createRequest({}), {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 403 for disallowed role", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "CUSTOMER" } as any);

      const response = await PUT(createRequest({ title: "x" }), {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid payload", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);

      const response = await PUT(createRequest({ order: -1 }), {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(400);
    });

    it("returns 404 when story block is missing", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockFindUnique.mockResolvedValue(null);

      const response = await PUT(createRequest({ title: "Updated" }), {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(404);
    });

    it("updates story block and revalidates", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockFindUnique.mockResolvedValue({ id: "s1" } as any);
      mockUpdate.mockResolvedValue({ id: "s1", title: "Updated" } as any);

      const response = await PUT(createRequest({ title: "Updated" }), {
        params: Promise.resolve({ id: "s1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.block.title).toBe("Updated");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/our-story");
    });

    it("returns 500 on update failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockFindUnique.mockResolvedValue({ id: "s1" } as any);
      mockUpdate.mockRejectedValue(new Error("db down"));

      const response = await PUT(createRequest({ title: "Updated" }), {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(500);
    });

    it("allows MEDIA_UPLOADER to update", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "MEDIA_UPLOADER" } as any);
      mockFindUnique.mockResolvedValue({ id: "s1" } as any);
      mockUpdate.mockResolvedValue({ id: "s1", subtitle: "Sub" } as any);

      const response = await PUT(createRequest({ subtitle: "Sub" }), {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(200);
    });

    it("returns 500 when lookup fails before update", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockFindUnique.mockRejectedValue(new Error("lookup fail"));

      const response = await PUT(createRequest({ title: "Updated" }), {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("returns auth response when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({
        authorized: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      } as any);

      const response = await DELETE({} as NextRequest, {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 403 for disallowed role", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "CUSTOMER" } as any);

      const response = await DELETE({} as NextRequest, {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(403);
    });

    it("returns 404 when story block is missing", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "SUPER_ADMIN" } as any);
      mockFindUnique.mockResolvedValue(null);

      const response = await DELETE({} as NextRequest, {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(404);
    });

    it("deletes story block and revalidates", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockFindUnique.mockResolvedValue({ id: "s1" } as any);
      mockDelete.mockResolvedValue({ id: "s1" } as any);

      const response = await DELETE({} as NextRequest, {
        params: Promise.resolve({ id: "s1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Story block deleted.");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/our-story");
    });

    it("returns 500 on delete failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockFindUnique.mockResolvedValue({ id: "s1" } as any);
      mockDelete.mockRejectedValue(new Error("db down"));

      const response = await DELETE({} as NextRequest, {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(500);
    });

    it("returns 500 when lookup fails before delete", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true, roleName: "ADMIN" } as any);
      mockFindUnique.mockRejectedValue(new Error("lookup fail"));

      const response = await DELETE({} as NextRequest, {
        params: Promise.resolve({ id: "s1" }),
      });

      expect(response.status).toBe(500);
    });
  });
});
