import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    experienceReview: {
      update: vi.fn(),
    },
  },
}));

import { PATCH } from "@/app/api/admin/reviews/[id]/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockUpdate = vi.mocked(prisma.experienceReview.update);
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
