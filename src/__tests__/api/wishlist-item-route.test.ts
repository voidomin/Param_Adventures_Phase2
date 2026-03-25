import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    savedExperience: {
      deleteMany: vi.fn(),
    },
  },
}));

import { DELETE } from "@/app/api/wishlist/[experienceId]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockDeleteMany = vi.mocked(prisma.savedExperience.deleteMany);

describe("DELETE /api/wishlist/[experienceId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    });

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ experienceId: "exp-1" }),
    });

    expect(response.status).toBe(401);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("returns 404 when wishlist entry does not exist", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });
    mockDeleteMany.mockResolvedValue({ count: 0 } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ experienceId: "exp-missing" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Experience not found in wishlist.");
  });

  it("returns success when entry is removed", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });
    mockDeleteMany.mockResolvedValue({ count: 1 } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ experienceId: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        experienceId: "exp-1",
      },
    });
  });

  it("returns 500 on delete failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      userId: "user-1",
      roleName: "REGISTERED_USER",
    });
    mockDeleteMany.mockRejectedValue(new Error("db down"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ experienceId: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to remove experience.");
  });
});
