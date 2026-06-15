import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    experienceReview: {
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

import { PATCH, DELETE } from "@/app/api/admin/reviews/[id]/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockUpdate = vi.mocked(prisma.experienceReview.update);
const mockFindUnique = vi.mocked(prisma.experienceReview.findUnique);
const mockDelete = vi.mocked(prisma.experienceReview.delete);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createRequest = (body: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as NextRequest;

describe("PATCH /api/admin/reviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PATCH(createRequest({}), {
      params: Promise.resolve({ id: "rev-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "CUSTOMER",
    } as any);

    const response = await PATCH(createRequest({ isFeaturedHome: true }), {
      params: Promise.resolve({ id: "rev-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 400 when body is invalid", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);

    const response = await PATCH(createRequest({}), {
      params: Promise.resolve({ id: "rev-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("updates review feature flags and revalidates", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);
    mockUpdate.mockResolvedValue({ id: "rev-1", isFeaturedHome: true } as any);

    const response = await PATCH(createRequest({ isFeaturedHome: true }), {
      params: Promise.resolve({ id: "rev-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.review.id).toBe("rev-1");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rev-1" },
        data: { isFeaturedHome: true },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns 500 on db error", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);
    mockUpdate.mockRejectedValue(new Error("db down"));

    const response = await PATCH(
      createRequest({ isFeaturedExperience: true }),
      {
        params: Promise.resolve({ id: "rev-1" }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to update review.");
  });
});

describe("DELETE /api/admin/reviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await DELETE(createRequest({}), {
      params: Promise.resolve({ id: "rev-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "CUSTOMER",
    } as any);

    const response = await DELETE(createRequest({}), {
      params: Promise.resolve({ id: "rev-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 if review does not exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await DELETE(createRequest({}), {
      params: Promise.resolve({ id: "rev-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Review not found.");
  });

  it("deletes review, logs activity, and revalidates path", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
      userId: "user-admin",
    } as any);
    mockFindUnique.mockResolvedValue({
      id: "rev-1",
      user: { name: "Reviewer A" },
      experience: { title: "Adventure Express" },
    } as any);
    mockDelete.mockResolvedValue({ id: "rev-1" } as any);

    const response = await DELETE(createRequest({}), {
      params: Promise.resolve({ id: "rev-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rev-1" },
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns 500 on db error", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await DELETE(createRequest({}), {
      params: Promise.resolve({ id: "rev-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to delete review.");
  });
});

