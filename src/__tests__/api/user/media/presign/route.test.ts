import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/media/factory", () => ({
  mediaFactory: {
    getProvider: vi.fn(),
  },
}));

import { POST } from "@/app/api/user/media/presign/route";
import { verifyAccessToken } from "@/lib/auth";
import { mediaFactory } from "@/lib/media/factory";

const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockMediaFactory = vi.mocked(mediaFactory);

afterEach(() => {
  vi.unstubAllEnvs();
});

type ReqOpts = {
  token?: string;
  body?: unknown;
};

const createRequest = (opts: ReqOpts = {}) =>
  ({
    cookies: {
      get: vi.fn((name: string) =>
        name === "accessToken" && opts.token
          ? { value: opts.token }
          : undefined,
      ),
    },
    json: vi.fn().mockResolvedValue(opts.body ?? {}),
  }) as unknown as NextRequest;

describe("POST /api/user/media/presign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing", async () => {
    const response = await POST(
      createRequest({ body: { fileName: "a.jpg", contentType: "image/jpeg" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required.");
  });

  it("returns 401 for invalid token", async () => {
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        token: "bad",
        body: { fileName: "a.jpg", contentType: "image/jpeg" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid or expired token.");
  });

  it("returns 400 for invalid payload", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await POST(
      createRequest({ token: "ok", body: { fileName: "", contentType: "" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(typeof data.error).toBe("string");
  });

  it("returns presign payload from active provider", async () => {
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockMediaFactory.getProvider.mockResolvedValue({
      getPresignData: vi.fn().mockResolvedValue({
        provider: "mock-p",
        uploadUrl: "https://mock/upload",
        finalUrl: "https://mock/final",
      }),
    } as any);

    const response = await POST(
      createRequest({
        token: "ok",
        body: { fileName: "a.jpg", contentType: "image/jpeg" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.provider).toBe("mock-p");
    expect(data.uploadUrl).toBe("https://mock/upload");
  });

  it("returns 500 on unexpected error", async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error("boom"));

    const response = await POST(
      createRequest({
        token: "ok",
        body: { fileName: "a.jpg", contentType: "image/jpeg" },
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate upload authorization");
  });
});
