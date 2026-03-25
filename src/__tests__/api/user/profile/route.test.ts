import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { PATCH } from "@/app/api/user/profile/route";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const mockCookies = vi.mocked(cookies);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockUserUpdate = vi.mocked(prisma.user.update);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as Request;

const validBody = {
  name: "  Jane Doe  ",
  phoneNumber: " 9999999999 ",
  avatarUrl: "https://cdn.example/avatar.jpg",
  gender: "F",
  age: 28,
  bloodGroup: "O+",
  emergencyContactName: "John",
  emergencyContactNumber: "8888888888",
  emergencyRelationship: "Brother",
};

const setCookieToken = (token?: string) => {
  mockCookies.mockResolvedValue({
    get: vi.fn((name: string) => (name === "accessToken" && token ? { value: token } : undefined)),
  } as any);
};

describe("PATCH /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing", async () => {
    setCookieToken();

    const response = await PATCH(createRequest(validBody));

    expect(response.status).toBe(401);
  });

  it("returns 401 for invalid token", async () => {
    setCookieToken("bad");
    mockVerifyAccessToken.mockResolvedValue(null);

    const response = await PATCH(createRequest(validBody));

    expect(response.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await PATCH(createRequest({ ...validBody, avatarUrl: "bad-url" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 when emergency number equals phone", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);

    const response = await PATCH(
      createRequest({ ...validBody, emergencyContactNumber: "9999999999" }),
    );

    expect(response.status).toBe(400);
  });

  it("updates profile and normalizes values", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUserUpdate.mockResolvedValue({ id: "u1", name: "Jane Doe" } as any);

    const response = await PATCH(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Profile updated successfully");
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: expect.objectContaining({
          name: "Jane Doe",
          phoneNumber: "9999999999",
          age: 28,
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("uses nulls for optional empty values", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUserUpdate.mockResolvedValue({ id: "u1" } as any);

    const response = await PATCH(
      createRequest({
        ...validBody,
        avatarUrl: "",
        age: null,
        bloodGroup: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
        emergencyRelationship: "",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          avatarUrl: null,
          age: null,
          bloodGroup: null,
          emergencyContactName: null,
          emergencyContactNumber: null,
          emergencyRelationship: null,
        }),
      }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    setCookieToken("ok");
    mockVerifyAccessToken.mockResolvedValue({ userId: "u1" } as any);
    mockUserUpdate.mockRejectedValue(new Error("db down"));

    const response = await PATCH(createRequest(validBody));

    expect(response.status).toBe(500);
  });
});
