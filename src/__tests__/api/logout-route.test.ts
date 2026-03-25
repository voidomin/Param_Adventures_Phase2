import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("returns success and clears auth cookies", async () => {
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Logged out successfully.");
    expect(response.cookies.get("accessToken")?.value).toBe("");
    expect(response.cookies.get("refreshToken")?.value).toBe("");
  });
});
