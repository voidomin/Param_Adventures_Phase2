import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    blog: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/admin/blogs/[id]/review/route";
import { revalidatePath } from "next/cache";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockBlogFindUnique = vi.mocked(prisma.blog.findUnique);
const mockBlogUpdate = vi.mocked(prisma.blog.update);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createRequest = (body: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body),
  }) as unknown as NextRequest;

describe("POST /api/admin/blogs/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when blog does not exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockBlogFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 400 when blog is not pending review", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockBlogFindUnique.mockResolvedValue({ id: "b1", status: "DRAFT", deletedAt: null } as any);

    const response = await POST(createRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid review payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      status: "PENDING_REVIEW",
      deletedAt: null,
    } as any);

    const response = await POST(createRequest({ action: "reject" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(400);
  });

  it("approves blog and clears rejection reason", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      status: "PENDING_REVIEW",
      deletedAt: null,
    } as any);
    mockBlogUpdate.mockResolvedValue({ id: "b1", status: "PUBLISHED" } as any);

    const response = await POST(createRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "b1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blog.status).toBe("PUBLISHED");
    expect(mockBlogUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "PUBLISHED", rejectionReason: null },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects blog and trims rejection reason", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      status: "PENDING_REVIEW",
      deletedAt: null,
    } as any);
    mockBlogUpdate.mockResolvedValue({ id: "b1", status: "DRAFT" } as any);

    const response = await POST(
      createRequest({ action: "reject", rejectionReason: "  Needs more details  " }),
      { params: Promise.resolve({ id: "b1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockBlogUpdate).toHaveBeenCalledWith({
      where: { id: "b1" },
      data: { status: "DRAFT", rejectionReason: "Needs more details" },
    });
  });

  it("returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "b1",
      status: "PENDING_REVIEW",
      deletedAt: null,
    } as any);
    mockBlogUpdate.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "b1" }),
    });

    expect(response.status).toBe(500);
  });
});
