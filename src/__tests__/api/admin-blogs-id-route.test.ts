import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      update: vi.fn(),
    },
  },
}));

import { DELETE } from "@/app/api/admin/blogs/[id]/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockBlogUpdate = vi.mocked(prisma.blog.update);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("DELETE /api/admin/blogs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(401);
  });

  it("soft deletes blog and revalidates", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockBlogUpdate.mockResolvedValue({ id: "b1", status: "DRAFT" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "b1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockBlogUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "b1" },
        data: expect.objectContaining({
          status: "DRAFT",
          deletedAt: expect.any(Date),
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns 500 on db failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockBlogUpdate.mockRejectedValue(new Error("db down"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });
});
