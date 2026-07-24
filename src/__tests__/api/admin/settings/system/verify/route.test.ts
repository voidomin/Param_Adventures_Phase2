import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));

const { mockPaymentsAll, mockOrdersCreate, razorpayCtor } = vi.hoisted(() => {
  const mockPaymentsAll = vi.fn();
  const mockOrdersCreate = vi.fn();
  const razorpayCtor = vi.fn(function (this: any) {
    this.payments = { all: mockPaymentsAll };
    this.orders = { create: mockOrdersCreate };
  });
  return { mockPaymentsAll, mockOrdersCreate, razorpayCtor };
});
vi.mock("razorpay", () => ({ default: razorpayCtor }));

const { mockCloudinaryPing } = vi.hoisted(() => ({ mockCloudinaryPing: vi.fn() }));
vi.mock("cloudinary", () => ({
  v2: { config: vi.fn(), api: { ping: (...args: unknown[]) => mockCloudinaryPing(...args) } },
}));

const { mockS3Send, s3ClientCtor } = vi.hoisted(() => {
  const mockS3Send = vi.fn();
  const s3ClientCtor = vi.fn(function (this: any) {
    this.send = mockS3Send;
  });
  return { mockS3Send, s3ClientCtor };
});
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: s3ClientCtor,
  HeadBucketCommand: vi.fn(function (this: any, input: unknown) {
    this.input = input;
  }),
}));

import { POST } from "@/app/api/admin/settings/system/verify/route";
import { authorizeRequest } from "@/lib/api-auth";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("POST /api/admin/settings/system/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
  });

  it("returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await POST(createRequest({ type: "RAZORPAY", config: {} }));
    expect(response.status).toBe(403);
  });

  it("returns 400 when type or config is missing", async () => {
    const response = await POST(createRequest({ type: "RAZORPAY" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for an unsupported verification type", async () => {
    const response = await POST(createRequest({ type: "UNKNOWN", config: {} }));
    expect(response.status).toBe(400);
  });

  it("verifies Razorpay handshake successfully", async () => {
    mockPaymentsAll.mockResolvedValue({});

    const response = await POST(createRequest({ type: "RAZORPAY", config: { keyId: "k", keySecret: "s" } }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPaymentsAll).toHaveBeenCalledWith({ count: 1 });
  });

  it("returns 400 when Razorpay credentials are missing", async () => {
    const response = await POST(createRequest({ type: "RAZORPAY", config: {} }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("creates a Razorpay test order", async () => {
    mockOrdersCreate.mockResolvedValue({ id: "order_1", amount: 100, currency: "INR" });

    const response = await POST(createRequest({ type: "RAZORPAY_ORDER", config: { keyId: "k", keySecret: "s" } }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(expect.objectContaining({ success: true, orderId: "order_1", keyId: "k" }));
  });

  it("verifies Cloudinary connectivity", async () => {
    mockCloudinaryPing.mockResolvedValue({ status: "ok" });

    const response = await POST(
      createRequest({ type: "CLOUDINARY", config: { cloudName: "demo", apiKey: "k", apiSecret: "s" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 502 when Cloudinary ping doesn't return ok", async () => {
    mockCloudinaryPing.mockResolvedValue({ status: "error" });

    const response = await POST(
      createRequest({ type: "CLOUDINARY", config: { cloudName: "demo", apiKey: "k", apiSecret: "s" } }),
    );

    expect(response.status).toBe(502);
  });

  it("verifies S3 bucket accessibility", async () => {
    mockS3Send.mockResolvedValue({});

    const response = await POST(
      createRequest({ type: "S3", config: { bucket: "b", region: "r", accessKey: "a", secretKey: "s" } }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 400 when required S3 fields are missing", async () => {
    const response = await POST(createRequest({ type: "S3", config: { bucket: "b" } }));
    expect(response.status).toBe(400);
  });

  it("returns 502 when the provider call throws a non-validation error", async () => {
    mockS3Send.mockRejectedValue(new Error("network unreachable"));

    const response = await POST(
      createRequest({ type: "S3", config: { bucket: "b", region: "r", accessKey: "a", secretKey: "s" } }),
    );

    expect(response.status).toBe(502);
  });
});
