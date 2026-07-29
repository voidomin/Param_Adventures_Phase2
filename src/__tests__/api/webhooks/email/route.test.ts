import crypto from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/monitoring", () => ({ logError: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    platformSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/webhooks/email/route";
import { logActivity } from "@/lib/audit-logger";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/db";

const mockLogActivity = vi.mocked(logActivity);
const mockLogError = vi.mocked(logError);
const mockFindUnique = vi.mocked(prisma.platformSetting.findUnique);
const mockUpsert = vi.mocked(prisma.platformSetting.upsert);

const SECRET = "whsec_dGVzdC1zZWNyZXQta2V5LWZvci1zaWduaW5n"; // NOSONAR test fixture

function signPayload(payload: string, id: string, timestamp: string) {
  const secretBytes = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  return `v1,${signature}`;
}

function createSignedRequest(body: unknown) {
  const payload = JSON.stringify(body);
  const svixId = "msg_test123";
  const svixTimestamp = String(Math.floor(Date.now() / 1000));
  const svixSignature = signPayload(payload, svixId, svixTimestamp);

  return new NextRequest("http://localhost/api/webhooks/email", {
    method: "POST",
    body: payload,
    headers: {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    },
  });
}

describe("POST /api/webhooks/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_WEBHOOK_SECRET", SECRET);
    mockFindUnique.mockResolvedValue(null);
  });

  it("returns 404 when no webhook secret is configured anywhere", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    const response = await POST(createSignedRequest({ type: "email.bounced" }));
    expect(response.status).toBe(404);
  });

  it("uses the admin-configured secret when present, overriding the env fallback", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "wrong-secret-that-would-fail");
    mockFindUnique.mockResolvedValue({ key: "resend_webhook_secret", value: SECRET } as any);

    const response = await POST(createSignedRequest({ type: "email.bounced" }));
    expect(response.status).toBe(200);
  });

  it("returns 400 when signature headers are missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/email", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 for an invalid signature", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/email", {
      method: "POST",
      body: JSON.stringify({ type: "email.bounced" }),
      headers: {
        "svix-id": "msg_test123",
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": "v1,not-the-real-signature",
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("logs a notable event (bounce) to the audit trail and error monitoring", async () => {
    const response = await POST(
      createSignedRequest({ type: "email.bounced", data: { to: ["user@example.com"], subject: "Booking Confirmed" } }),
    );

    expect(response.status).toBe(200);
    expect(mockLogActivity).toHaveBeenCalledWith(
      "EMAIL_DELIVERY_ISSUE",
      null,
      "Email",
      null,
      expect.objectContaining({ eventType: "email.bounced" }),
    );
    expect(mockLogError).toHaveBeenCalled();
  });

  it("ignores non-notable events (e.g. delivered) without logging", async () => {
    const response = await POST(
      createSignedRequest({ type: "email.delivered", data: { to: ["user@example.com"] } }),
    );

    expect(response.status).toBe(200);
    expect(mockLogActivity).not.toHaveBeenCalled();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("records the last-received-event timestamp on any validly-signed event, notable or not", async () => {
    const response = await POST(
      createSignedRequest({ type: "email.delivered", data: { to: ["user@example.com"] } }),
    );

    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "resend_webhook_last_event_at" },
        create: expect.objectContaining({ key: "resend_webhook_last_event_at" }),
        update: expect.any(Object),
      }),
    );
  });

  it("returns 500 if the body can't be parsed as JSON", async () => {
    const payload = "not-json";
    const svixId = "msg_test123";
    const svixTimestamp = String(Math.floor(Date.now() / 1000));
    const svixSignature = signPayload(payload, svixId, svixTimestamp);

    const req = new NextRequest("http://localhost/api/webhooks/email", {
      method: "POST",
      body: payload,
      headers: {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
