import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({ generateCloudinarySignature: vi.fn() }));

import { POST } from "@/app/api/admin/media/cloudinary-sign/route";
import { authorizeRequest } from "@/lib/api-auth";
import { generateCloudinarySignature } from "@/lib/cloudinary";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockGenerateCloudinarySignature = vi.mocked(generateCloudinarySignature);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("POST /api/admin/media/cloudinary-sign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth.response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await POST(createRequest());

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin role", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "USER",
    } as any);

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("generates signature using provided folder", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "ADMIN",
    } as any);
    mockGenerateCloudinarySignature.mockResolvedValue({
      signature: "sig",
      timestamp: 123,
    } as any);

    const response = await POST(createRequest({ folder: "custom-folder" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.signature).toBe("sig");
    expect(mockGenerateCloudinarySignature).toHaveBeenCalledWith(
      "custom-folder",
    );
  });

  it("uses default folder when folder is omitted", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);
    mockGenerateCloudinarySignature.mockResolvedValue({
      signature: "sig",
    } as any);

    const response = await POST(createRequest({}));

    expect(response.status).toBe(200);
    expect(mockGenerateCloudinarySignature).toHaveBeenCalledWith(
      "payment-proofs",
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockRejectedValue(new Error("boom"));

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate signature");
  });
});
