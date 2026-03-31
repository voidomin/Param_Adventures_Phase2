import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("node:crypto", () => {
  const randomBytes = vi.fn();
  return {
    randomBytes,
    default: {
      randomBytes,
    },
  };
});

vi.mock("@/lib/email", () => ({
  sendResetPasswordEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    siteSetting: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { POST } from "@/app/api/auth/forgot-password/route";
import crypto from "node:crypto";
import { sendResetPasswordEmail } from "@/lib/email";
import { prisma } from "@/lib/db";

const mockRandomBytes = vi.mocked(crypto.randomBytes);
const mockSendResetPasswordEmail = vi.mocked(sendResetPasswordEmail);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);

const createRequest = (body: unknown, origin = "https://localhost:3000") =>
  ({
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: vi.fn((name: string) =>
        name.toLowerCase() === "origin" ? origin : null,
      ),
    },
  }) as unknown as NextRequest;

describe("POST /api/auth/forgot-password", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("returns 400 for invalid email", async () => {
    const response = await POST(createRequest({ email: "bad" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid email address");
  });

  it("returns generic success for unknown user", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ email: "nouser@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("If an account exists");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 for inactive user", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1", status: "BANNED" } as any);

    const response = await POST(
      createRequest({ email: "blocked@example.com" }),
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Account is suspended or inactive.");
  });

  it("updates reset token and sends email for active user", async () => {
    mockRandomBytes.mockReturnValue({
      toString: vi.fn().mockReturnValue("token123"),
    } as any);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      status: "ACTIVE",
    } as any);
    mockUpdate.mockResolvedValue({} as any);

    const response = await POST(
      createRequest({ email: "USER@example.com" }, "https://app.local"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("If an account exists");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
      }),
    );
    expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: "user@example.com",
        resetLink: "https://app.local/reset-password?token=token123",
      }),
    );
  });

  it("prefers NEXT_PUBLIC_APP_URL over request origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://prod.example.com");
    mockRandomBytes.mockReturnValue({
      toString: vi.fn().mockReturnValue("token123"),
    } as any);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      status: "ACTIVE",
    } as any);
    mockUpdate.mockResolvedValue({} as any);

    const response = await POST(
      createRequest({ email: "USER@example.com" }, "https://ignored.local"),
    );

    expect(response.status).toBe(200);
    expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        resetLink: "https://prod.example.com/reset-password?token=token123",
      }),
    );
  });

  it("falls back to localhost when env and origin are absent", async () => {
    mockRandomBytes.mockReturnValue({
      toString: vi.fn().mockReturnValue("token123"),
    } as any);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      status: "ACTIVE",
    } as any);
    mockUpdate.mockResolvedValue({} as any);

    const response = await POST(
      createRequest({ email: "USER@example.com" }, null as any),
    );

    expect(response.status).toBe(200);
    expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        resetLink: "https://localhost:3000/reset-password?token=token123",
      }),
    );
  });

  it("uses Adventurer fallback when user name is missing", async () => {
    mockRandomBytes.mockReturnValue({
      toString: vi.fn().mockReturnValue("token123"),
    } as any);
    mockFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "",
      status: "ACTIVE",
    } as any);
    mockUpdate.mockResolvedValue({} as any);

    const response = await POST(createRequest({ email: "user@example.com" }));

    expect(response.status).toBe(200);
    expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: "Adventurer",
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ email: "x@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error.");
  });

  it("returns 500 when thrown error has no stack", async () => {
    mockFindUnique.mockRejectedValue({ message: "boom" } as any);

    const response = await POST(createRequest({ email: "x@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.details).toBe("boom");
    expect(errorSpy).toHaveBeenCalledWith(
      "[AUTH] Forgot Password error:",
      expect.objectContaining({ message: "boom" }),
    );
  });
});
