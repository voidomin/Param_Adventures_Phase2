import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    savedExperience: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    experience: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/wishlist/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.savedExperience.findMany);
const mockFindUnique = vi.mocked(prisma.experience.findUnique);
const mockUpsert = vi.mocked(prisma.savedExperience.upsert);

const createJsonRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("/api/wishlist route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    });

    const response = await GET({} as NextRequest);

    expect(response.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("GET returns saved experiences for authorized user", async () => {
    const saved = [{ id: "s1" }];
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });
    mockFindMany.mockResolvedValue(saved as any);

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ saved });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      }),
    );
  });

  it("GET returns 500 on DB failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });
    mockFindMany.mockRejectedValue(new Error("db down"));

    const response = await GET({} as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch wishlist.");
  });

  it("POST returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    });

    const response = await POST(createJsonRequest({ experienceId: "exp-1" }));

    expect(response.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("POST returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });

    const response = await POST(createJsonRequest({ experienceId: "" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("experienceId is required.");
  });

  it("POST returns 404 when experience is missing or unpublished", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });
    mockFindUnique.mockResolvedValue({ status: "DRAFT" } as any);

    const response = await POST(createJsonRequest({ experienceId: "exp-1" }));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Experience not found.");
  });

  it("POST upserts and returns saved record for published experience", async () => {
    const saved = { id: "saved-1", experienceId: "exp-1", userId: "user-1" };
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });
    mockFindUnique.mockResolvedValue({
      id: "exp-1",
      status: "PUBLISHED",
    } as any);
    mockUpsert.mockResolvedValue(saved as any);

    const response = await POST(createJsonRequest({ experienceId: "exp-1" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.saved).toEqual(saved);
    expect(mockUpsert).toHaveBeenCalledWith({
      where: {
        userId_experienceId: {
          userId: "user-1",
          experienceId: "exp-1",
        },
      },
      update: {},
      create: {
        userId: "user-1",
        experienceId: "exp-1",
      },
    });
  });

  it("POST returns 500 on unexpected failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });
    mockFindUnique.mockRejectedValue(new Error("boom"));

    const response = await POST(createJsonRequest({ experienceId: "exp-1" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to save experience.");
  });
});
