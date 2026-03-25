import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/auth/reset-password/route";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockHashPassword = vi.mocked(hashPassword);
const mockFindFirst = vi.mocked(prisma.user.findFirst);
const mockUpdate = vi.mocked(prisma.user.update);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid payload", async () => {
    // FIXME: hardcoded password for testing
    const response = await POST(createRequest({ token: "", password: "123" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(typeof data.error).toBe("string");
  });

  it("returns 401 for invalid or expired token", async () => {
    mockFindFirst.mockResolvedValue(null);

    const response = await POST(
      // FIXME: hardcoded password for testing
      createRequest({ token: "abc", password: "password123" }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired reset token.");
  });

  it("updates password and revokes old sessions on success", async () => {
    mockFindFirst.mockResolvedValue({ id: "u1" } as any);
    mockHashPassword.mockResolvedValue("hashed");
    mockUpdate.mockResolvedValue({} as any);

    const response = await POST(
      // FIXME: hardcoded password for testing
      createRequest({ token: "abc", password: "password123" }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Password updated successfully.");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
      }),
    );
  });

  it("returns 500 on unexpected failure", async () => {
    mockFindFirst.mockRejectedValue(new Error("db down"));

    const response = await POST(
      // FIXME: hardcoded password for testing
      createRequest({ token: "abc", password: "password123" }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error.");
  });
});

