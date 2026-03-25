import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE, PUT } from "@/app/api/admin/categories/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.category.findUnique);
const mockFindFirst = vi.mocked(prisma.category.findFirst);
const mockUpdate = vi.mocked(prisma.category.update);
const mockDelete = vi.mocked(prisma.category.delete);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createJsonRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("/api/admin/categories/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PUT returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PUT(createJsonRequest({ name: "Trekking" }), {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("PUT returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(createJsonRequest({ name: "x".repeat(60) }), {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("PUT returns 404 when category is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await PUT(createJsonRequest({ name: "Trekking" }), {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("PUT returns 409 on slug conflict", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "cat-1", name: "Old", slug: "old" } as any);
    mockFindFirst.mockResolvedValue({ id: "cat-2", slug: "trekking" } as any);

    const response = await PUT(createJsonRequest({ name: " Trekking " }), {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("PUT returns 400 when name becomes empty after trimming", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "cat-1", name: "Old", slug: "old" } as any);

    const response = await PUT(createJsonRequest({ name: "    " }), {
      params: Promise.resolve({ id: "cat-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Category name cannot be empty.");
  });

  it("PUT updates only isActive without touching slug lookup", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "cat-1", name: "Old", slug: "old" } as any);
    mockUpdate.mockResolvedValue({ id: "cat-1", isActive: false } as any);

    const response = await PUT(createJsonRequest({ isActive: false }), {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: { isActive: false },
    });
  });

  it("PUT normalizes empty icon to null", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "cat-1", name: "Old", slug: "old" } as any);
    mockUpdate.mockResolvedValue({ id: "cat-1", icon: null } as any);

    const response = await PUT(createJsonRequest({ icon: "" }), {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: { icon: null },
    });
  });

  it("PUT updates category with normalized name/slug", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "cat-1", name: "Old", slug: "old" } as any);
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({
      id: "cat-1",
      name: "Trekking & Camping",
      slug: "trekking-camping",
      isActive: true,
      icon: "mountain",
    } as any);

    const response = await PUT(
      createJsonRequest({ name: " Trekking & Camping ", isActive: true, icon: "mountain" }),
      { params: Promise.resolve({ id: "cat-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.category.id).toBe("cat-1");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      data: {
        name: "Trekking & Camping",
        slug: "trekking-camping",
        isActive: true,
        icon: "mountain",
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("DELETE returns 404 when category does not exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("DELETE returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("DELETE returns 409 when category is in use", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({
      id: "cat-1",
      _count: { experiences: 3 },
    } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("DELETE removes category when unused", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "cat-1", _count: { experiences: 0 } } as any);
    mockDelete.mockResolvedValue({ id: "cat-1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "cat-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Category deleted.");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("DELETE returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(500);
  });

  it("PUT returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await PUT(createJsonRequest({ name: "Trekking" }), {
      params: Promise.resolve({ id: "cat-1" }),
    });

    expect(response.status).toBe(500);
  });
});
