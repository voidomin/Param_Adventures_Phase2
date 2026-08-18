import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    blog: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

import { POST } from "@/app/api/admin/blogs/[id]/publish/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockBlogFindUnique = vi.mocked(prisma.blog.findUnique);
const mockBlogUpdate = vi.mocked(prisma.blog.update);

const createRequest = () => new NextRequest("http://localhost/api/admin/blogs/blog-1/publish", { method: "POST" });

describe("POST /api/admin/blogs/[id]/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when request is unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest(), { params: Promise.resolve({ id: "blog-1" }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when blog does not exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1", roleName: "SUPER_ADMIN" } as any);
    mockBlogFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest(), { params: Promise.resolve({ id: "blog-1" }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Blog not found.");
  });

  it("blocks non-SUPER_ADMIN author from self-publishing draft blog", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1", roleName: "ADMIN" } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "blog-1",
      authorId: "u1",
      status: "DRAFT",
      deletedAt: null,
    } as any);

    const response = await POST(createRequest(), { params: Promise.resolve({ id: "blog-1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("You cannot self-publish your own blog");
  });

  it("allows SUPER_ADMIN author to self-publish draft blog", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1", roleName: "SUPER_ADMIN" } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "blog-1",
      authorId: "u1",
      status: "DRAFT",
      deletedAt: null,
      title: "My Adventure",
    } as any);
    mockBlogUpdate.mockResolvedValue({ id: "blog-1", status: "PUBLISHED" } as any);

    const response = await POST(createRequest(), { params: Promise.resolve({ id: "blog-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blog.status).toBe("PUBLISHED");
    expect(mockBlogUpdate).toHaveBeenCalledWith({
      where: { id: "blog-1" },
      data: expect.objectContaining({ status: "PUBLISHED" }),
    });
  });

  it("unpublishes an already published blog", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u2", roleName: "ADMIN" } as any);
    mockBlogFindUnique.mockResolvedValue({
      id: "blog-1",
      authorId: "u1",
      status: "PUBLISHED",
      deletedAt: null,
      title: "My Adventure",
    } as any);
    mockBlogUpdate.mockResolvedValue({ id: "blog-1", status: "DRAFT" } as any);

    const response = await POST(createRequest(), { params: Promise.resolve({ id: "blog-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.blog.status).toBe("DRAFT");
  });
});
