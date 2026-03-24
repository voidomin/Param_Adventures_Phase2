import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../app/api/user/profile/route";
import { prisma } from "../lib/db";
import { verifyAccessToken } from "../lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock("../lib/auth");
vi.mock("next/headers");
vi.mock("next/cache");

describe("PATCH /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as Request;
  };

  it("returns 401 if no token is provided", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);

    const req = createRequest({});
    const response = await PATCH(req);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid validation", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });

    const req = createRequest({ name: "" }); // Invalid
    const response = await PATCH(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 if emergency contact is same as phone", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });

    const req = createRequest({
      name: "Test",
      phoneNumber: "1234567890",
      gender: "Male",
      emergencyContactNumber: "1234567890", // Same
    });
    const response = await PATCH(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Emergency contact number cannot be your own");
  });

  it("successfully updates profile", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    const updatedUser = { id: "u1", name: "New Name" };
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

    const req = createRequest({
      name: "New Name",
      phoneNumber: "1234567890",
      gender: "Other",
      age: 25,
      avatarUrl: "https://example.com/avatar.jpg"
    });
    const response = await PATCH(req);
    expect(response.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalled();
    const data = await response.json();
    expect(data.user.name).toBe("New Name");
  });

  it("returns 500 on internal error", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    } as any);
    vi.mocked(verifyAccessToken).mockRejectedValue(new Error("DB error"));

    const req = createRequest({ 
      name: "Test",
      phoneNumber: "1234567890",
      gender: "Male"
    });
    const response = await PATCH(req);
    expect(response.status).toBe(500);
  });
});
