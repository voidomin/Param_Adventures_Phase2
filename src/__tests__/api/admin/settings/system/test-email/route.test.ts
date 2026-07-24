import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeSystemRequest: vi.fn() }));
vi.mock("@/lib/email/factory", () => ({ emailFactory: { getProvider: vi.fn() } }));
vi.mock("@react-email/render", () => ({ render: vi.fn().mockResolvedValue("<html>rendered</html>") }));
vi.mock("@/components/emails/WelcomeEmail", () => ({ default: () => null }));

import { POST } from "@/app/api/admin/settings/system/test-email/route";
import { authorizeSystemRequest } from "@/lib/api-auth";
import { emailFactory } from "@/lib/email/factory";

const mockAuthorizeSystemRequest = vi.mocked(authorizeSystemRequest);
const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

describe("POST /api/admin/settings/system/test-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: true, userId: "admin-1", roleName: "SUPER_ADMIN" } as any);
  });

  it("returns the auth response when unauthorized", async () => {
    mockAuthorizeSystemRequest.mockResolvedValue({ authorized: false, response: { status: 401 } } as any);

    const response = await POST(createRequest({ to: "a@b.com" }));
    expect((response as any).status).toBe(401);
  });

  it("returns 400 when no recipient is provided", async () => {
    const response = await POST(createRequest({}));
    expect(response.status).toBe(400);
  });

  it("sends a test email using the saved provider configuration", async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);
    vi.mocked(emailFactory.getProvider).mockResolvedValue({ provider: { send: mockSend }, from: "no-reply@param.com" } as any);

    const response = await POST(createRequest({ to: "a@b.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain("sent successfully");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@b.com", from: "no-reply@param.com", html: "<html>rendered</html>" }),
    );
    expect(emailFactory.getProvider).toHaveBeenCalledWith(undefined);
  });

  it("sends using temporary dashboard overrides when provided", async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);
    vi.mocked(emailFactory.getProvider).mockResolvedValue({ provider: { send: mockSend }, from: "override@param.com" } as any);
    const overrideConfig = { smtp_host: "smtp.override.com" };

    await POST(createRequest({ to: "a@b.com", config: overrideConfig }));

    expect(emailFactory.getProvider).toHaveBeenCalledWith(overrideConfig);
  });

  it("returns 500 with the underlying error message when sending fails", async () => {
    vi.mocked(emailFactory.getProvider).mockRejectedValue(new Error("SMTP connection refused"));

    const response = await POST(createRequest({ to: "a@b.com" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("SMTP connection refused");
  });
});
