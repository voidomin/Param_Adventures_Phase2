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

  it("GET returns 500 when find fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockRejectedValue(new Error("db fail"));

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(500);
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

  it("PUT returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as any);

    const response = await PUT(createJsonRequest({ title: "X" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("PUT returns 400 for invalid cover image URL", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(
      createJsonRequest({
        title: "New title",
        basePrice: 999,
        capacity: 8,
        durationDays: 2,
        location: "Manali",
        coverImage: "not-a-url",
      }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid cover image URL");
  });

  it("PUT returns 400 for invalid card image URL", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(
      createJsonRequest({
        title: "New title",
        basePrice: 999,
        capacity: 8,
        durationDays: 2,
        location: "Manali",
        coverImage: "https://valid.example/cover.jpg",
        cardImage: "also-invalid",
      }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid card image URL");
  });

  it("PUT returns 400 for invalid image URL inside images array", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(
      createJsonRequest({
        title: "New title",
        basePrice: 999,
        capacity: 8,
        durationDays: 2,
        location: "Manali",
        coverImage: "https://valid.example/cover.jpg",
        cardImage: "https://valid.example/card.jpg",
        images: ["https://valid.example/1.jpg", "bad-url"],
      }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid image URL");
  });

  it("PUT returns 404 when experience is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await PUT(
      createJsonRequest({ title: "New title", basePrice: 999, capacity: 8, durationDays: 2, location: "Manali" }),
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
        location: "Manali",
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

  it("PUT keeps slug and skips category reset when title unchanged", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({
      id: "exp-1",
      title: "Same title",
      slug: "same-title",
    } as any);

    const tx = {
      experienceCategory: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      experience: {
        update: vi.fn().mockResolvedValue({ id: "exp-1", slug: "same-title" }),
      },
    };
    mockTransaction.mockImplementation(async (cb: any) => cb(tx));

    const response = await PUT(
      createJsonRequest({
        title: "Same title",
        basePrice: 1200,
        capacity: 10,
        durationDays: 3,
        location: "Manali",
      }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockGenerateSlug).not.toHaveBeenCalled();
    expect(tx.experienceCategory.deleteMany).not.toHaveBeenCalled();
    expect(tx.experience.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "same-title",
          categories: undefined,
          highlights: [],
          vibeTags: [],
        }),
      }),
    );
  });

  it("PUT accepts nullable image fields", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({
      id: "exp-1",
      title: "Old title",
      slug: "old-title",
    } as any);

    const tx = {
      experienceCategory: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      experience: {
        update: vi.fn().mockResolvedValue({ id: "exp-1", slug: "old-title" }),
      },
    };
    mockTransaction.mockImplementation(async (cb: any) => cb(tx));

    const response = await PUT(
      createJsonRequest({
        title: "Old title",
        basePrice: 1200,
        capacity: 10,
        durationDays: 3,
        location: "Manali",
        coverImage: null,
        cardImage: null,
      }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );

    expect(response.status).toBe(200);
    expect(tx.experience.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coverImage: null,
          cardImage: null,
        }),
      }),
    );
  });

  it("PUT accepts empty string image fields", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({
      id: "exp-1",
      title: "Old title",
      slug: "old-title",
    } as any);

    const tx = {
      experienceCategory: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
      experience: {
        update: vi.fn().mockResolvedValue({ id: "exp-1", slug: "old-title" }),
      },
    };
    mockTransaction.mockImplementation(async (cb: any) => cb(tx));

    const response = await PUT(
      createJsonRequest({
        title: "Old title",
        basePrice: 1200,
        capacity: 10,
        durationDays: 3,
        location: "Manali",
        coverImage: "",
        cardImage: "",
      }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );

    expect(response.status).toBe(200);
    expect(tx.experience.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coverImage: "",
          cardImage: "",
        }),
      }),
    );
  });

  it("PUT returns 500 when transaction fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({
      id: "exp-1",
      title: "Old title",
      slug: "old-title",
    } as any);
    mockTransaction.mockRejectedValue(new Error("tx fail"));

    const response = await PUT(
      createJsonRequest({
        title: "Old title",
        basePrice: 1200,
        capacity: 10,
        durationDays: 3,
        location: "Manali",
      }),
      { params: Promise.resolve({ id: "exp-1" }) },
    );

    expect(response.status).toBe(500);
  });

  it("PUT returns 500 when request parsing fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    const request = {
      json: vi.fn().mockRejectedValue(new Error("invalid body")),
    } as unknown as NextRequest;

    const response = await PUT(request, {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(500);
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

  it("DELETE returns 404 when experience is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(404);
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

  it("DELETE returns 500 when delete operation fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "exp-1", _count: { bookings: 0 } } as any);
    mockDelete.mockRejectedValue(new Error("db down"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(500);
  });

  it("DELETE returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(response.status).toBe(401);
  });
});
