import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit-logger", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    homepageSection: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { PUT } from "@/app/api/admin/homepage-sections/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.homepageSection.findUnique);
const mockUpdate = vi.mocked(prisma.homepageSection.update);
const mockRevalidatePath = vi.mocked(revalidatePath);

const createJsonRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("PUT /api/admin/homepage-sections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PUT(createJsonRequest({ name: "Weekend Getaways" }), {
      params: Promise.resolve({ id: "sec-1" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await PUT(createJsonRequest({ name: "x".repeat(60) }), {
      params: Promise.resolve({ id: "sec-1" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when the section is missing", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await PUT(createJsonRequest({ name: "Weekend Getaways" }), {
      params: Promise.resolve({ id: "sec-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects an empty name after trimming", async () => {
    mockFindUnique.mockResolvedValue({ id: "sec-1", name: "Old" } as any);

    const response = await PUT(createJsonRequest({ name: "   " }), {
      params: Promise.resolve({ id: "sec-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Section name cannot be empty.");
  });

  it("rejects an empty heading after trimming", async () => {
    mockFindUnique.mockResolvedValue({ id: "sec-1", heading: "Old" } as any);

    const response = await PUT(createJsonRequest({ heading: "   " }), {
      params: Promise.resolve({ id: "sec-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Section heading cannot be empty.");
  });

  it("normalizes an empty subheading to null", async () => {
    mockFindUnique.mockResolvedValue({ id: "sec-1" } as any);
    mockUpdate.mockResolvedValue({ id: "sec-1", subheading: null } as any);

    const response = await PUT(createJsonRequest({ subheading: "" }), {
      params: Promise.resolve({ id: "sec-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "sec-1" },
      data: { subheading: null },
    });
  });

  it("updates only isActive without touching name/heading", async () => {
    mockFindUnique.mockResolvedValue({ id: "sec-1" } as any);
    mockUpdate.mockResolvedValue({ id: "sec-1", isActive: false } as any);

    const response = await PUT(createJsonRequest({ isActive: false }), {
      params: Promise.resolve({ id: "sec-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "sec-1" },
      data: { isActive: false },
    });
  });

  it("updates name/heading/subheading and revalidates the homepage", async () => {
    mockFindUnique.mockResolvedValue({ id: "sec-1" } as any);
    mockUpdate.mockResolvedValue({
      id: "sec-1",
      name: "Long Weekend Trips",
      layout: "MOSAIC_GRID",
    } as any);

    const response = await PUT(
      createJsonRequest({ name: " Long Weekend Trips ", heading: " Weekend Escapes ", subheading: " Pack light " }),
      { params: Promise.resolve({ id: "sec-1" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.section.id).toBe("sec-1");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "sec-1" },
      data: { name: "Long Weekend Trips", heading: "Weekend Escapes", subheading: "Pack light" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("returns 500 on unexpected failure", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await PUT(createJsonRequest({ name: "Weekend Getaways" }), {
      params: Promise.resolve({ id: "sec-1" }),
    });

    expect(response.status).toBe(500);
  });
});
