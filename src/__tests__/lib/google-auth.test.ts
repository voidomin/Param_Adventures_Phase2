import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyIdToken = vi.fn();

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = mockVerifyIdToken;
  },
}));

import { verifyGoogleIdToken } from "@/lib/google-auth";

describe("verifyGoogleIdToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
  });

  it("returns the verified profile for a valid token", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-123",
        email: "user@example.com",
        email_verified: true,
        name: "Test User",
      }),
    });

    const profile = await verifyGoogleIdToken("some-id-token");

    expect(profile).toEqual({
      googleId: "google-123",
      email: "user@example.com",
      emailVerified: true,
      name: "Test User",
    });
  });

  it("falls back to the email's local part when no name is present", async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-123",
        email: "someone@example.com",
        email_verified: false,
      }),
    });

    const profile = await verifyGoogleIdToken("some-id-token");
    expect(profile?.name).toBe("someone");
    expect(profile?.emailVerified).toBe(false);
  });

  it("returns null when verification throws (invalid/expired token)", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("invalid token"));
    const profile = await verifyGoogleIdToken("bad-token");
    expect(profile).toBeNull();
  });

  it("returns null when the payload is missing required fields", async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: "google-123" }) });
    const profile = await verifyGoogleIdToken("some-id-token");
    expect(profile).toBeNull();
  });

  it("returns null when no client ID is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    const profile = await verifyGoogleIdToken("some-id-token");
    expect(profile).toBeNull();
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });
});
