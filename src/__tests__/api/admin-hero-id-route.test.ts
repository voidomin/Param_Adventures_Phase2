import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    heroSlide: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE, GET, PUT } from "@/app/api/admin/hero/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.heroSlide.findUnique);
const mockUpdate = vi.mocked(prisma.heroSlide.update);
const mockDelete = vi.mocked(prisma.heroSlide.delete);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createJsonRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("/api/admin/hero/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(response.status).toBe(403);
  });

  it("GET returns 404 when slide not found", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(response.status).toBe(404);
  });

  it("GET returns slide on success", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "h1", title: "Hero" } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "h1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("h1");
  });

  it("PUT returns 400 on validation error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(createJsonRequest({ videoUrl: "not-url" }), {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(response.status).toBe(400);
  });

  it("PUT updates selected fields", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockUpdate.mockResolvedValue({ id: "h1", title: "Updated" } as any);

    const response = await PUT(
      createJsonRequest({ title: "Updated", isActive: true, order: 3 }),
      { params: Promise.resolve({ id: "h1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("h1");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: { title: "Updated", isActive: true, order: 3 },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("DELETE removes slide and returns success", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockDelete.mockResolvedValue({ id: "h1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "h1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("DELETE returns 500 on failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockDelete.mockRejectedValue(new Error("db fail"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "h1" }),
    });

    expect(response.status).toBe(500);
  });
});
