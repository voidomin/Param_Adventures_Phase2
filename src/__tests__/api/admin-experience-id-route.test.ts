import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/slugify", () => ({
  generateSlug: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    experience: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    experienceCategory: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { DELETE, GET, PUT } from "@/app/api/admin/experiences/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/slugify";
import { revalidatePath } from "next/cache";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockGenerateSlug = vi.mocked(generateSlug);
const mockFindUnique = vi.mocked(prisma.experience.findUnique);
const mockFindFirst = vi.mocked(prisma.experience.findFirst);
const mockUpdate = vi.mocked(prisma.experience.update);
const mockDelete = vi.mocked(prisma.experience.delete);
const mockTransaction = vi.mocked(prisma.$transaction);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createJsonRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("/api/admin/experiences/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("GET returns 404 when experience is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Experience not found");
  });

  it("GET returns experience payload on success", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "exp-1", title: "Trip" } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.experience.id).toBe("exp-1");
  });

  it("PUT returns 400 on validation failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(createJsonRequest({ title: "" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(typeof data.error).toBe("string");
  });

  it("PUT returns 404 when experience is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await PUT(
      createJsonRequest({ title: "New title", basePrice: 999, capacity: 8, durationDays: 2 }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("PUT updates experience with unique slug and categories", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({
      id: "exp-1",
      title: "Old title",
      slug: "old-title",
    } as any);

    mockGenerateSlug.mockReturnValue("new-title");
    mockFindFirst.mockResolvedValueOnce({ id: "exp-x" } as any).mockResolvedValueOnce(null);

    const tx = {
      experienceCategory: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      experience: {
        update: vi.fn().mockResolvedValue({ id: "exp-1", slug: "new-title-1" }),
      },
    };

    mockTransaction.mockImplementation(async (cb: any) => cb(tx));

    const response = await PUT(
      createJsonRequest({
        title: "New title",
        basePrice: 1200,
        capacity: 10,
        durationDays: 3,
        categoryIds: ["cat-1", "cat-2"],
      }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("updated successfully");
    expect(tx.experienceCategory.deleteMany).toHaveBeenCalledWith({
      where: { experienceId: "exp-1" },
    });
    expect(tx.experience.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "new-title-1",
          categories: {
            create: [{ categoryId: "cat-1" }, { categoryId: "cat-2" }],
          },
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("DELETE soft-deletes when bookings exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "exp-1", _count: { bookings: 5 } } as any);
    mockUpdate.mockResolvedValue({ id: "exp-1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("soft-deleted");
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("DELETE hard-deletes when no bookings exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "exp-1", _count: { bookings: 0 } } as any);
    mockDelete.mockResolvedValue({ id: "exp-1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("permanently deleted");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "exp-1" } });
  });
});
