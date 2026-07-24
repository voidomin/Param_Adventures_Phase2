import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/monitoring", () => ({ isSentryEnabled: vi.fn() }));

import { POST } from "@/app/api/admin/settings/monitoring/verify/route";
import { authorizeRequest } from "@/lib/api-auth";
import { isSentryEnabled } from "@/lib/monitoring";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockIsSentryEnabled = vi.mocked(isSentryEnabled);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("POST /api/admin/settings/monitoring/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "admin-1" } as any);
    mockIsSentryEnabled.mockResolvedValue(true);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await POST(createRequest({ dsn: "https://key@o1.ingest.sentry.io/123" }));
    expect(response.status).toBe(403);
  });

  it("returns 400 when Sentry is disabled", async () => {
    mockIsSentryEnabled.mockResolvedValue(false);

    const response = await POST(createRequest({ dsn: "https://key@o1.ingest.sentry.io/123" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when no dsn is provided", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-https dsn", async () => {
    const response = await POST(createRequest({ dsn: "http://key@o1.ingest.sentry.io/123" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a disallowed dsn host", async () => {
    const response = await POST(createRequest({ dsn: "https://key@evil.com/123" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a malformed dsn (non-numeric project id)", async () => {
    const response = await POST(createRequest({ dsn: "https://key@o1.ingest.sentry.io/not-a-number" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for an unparseable dsn", async () => {
    const response = await POST(createRequest({ dsn: "not-a-url" }));
    expect(response.status).toBe(400);
  });

  it("returns 502 when Sentry rejects the heartbeat", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403, text: () => Promise.resolve("forbidden") } as any);

    const response = await POST(createRequest({ dsn: "https://key@o1.ingest.sentry.io/123" }));
    expect(response.status).toBe(502);
  });

  it("sends a successful verification heartbeat", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as any);

    const response = await POST(createRequest({ dsn: "https://key@o1.ingest.sentry.io/123" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://o1.ingest.sentry.io/api/123/store/",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("accepts a subdomain of sentry.io", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as any);

    const response = await POST(createRequest({ dsn: "https://key@custom.sentry.io/456" }));
    expect(response.status).toBe(200);
  });

  it("returns 500 on an unexpected error", async () => {
    mockIsSentryEnabled.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest({ dsn: "https://key@o1.ingest.sentry.io/123" }));
    expect(response.status).toBe(500);
  });
});
