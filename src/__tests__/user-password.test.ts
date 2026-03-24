import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../app/api/user/password/route";
import { prisma } from "../lib/db";
import { verifyAccessToken, generateAccessToken, generateRefreshToken } from "../lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

vi.mock("../lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../lib/auth");
vi.mock("next/headers");
vi.mock("bcryptjs");

const SEC_OLD = "old_secret_123";
const SEC_NEW = "new_secret_456_secure";
const SEC_WRONG = "wrong_secret_999";

describe("PATCH /api/user/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as Request;
  };

  it("returns 401 if unauthorized", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as any);
    const req = createRequest({});
    const response = await PATCH(req);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid current password", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", password: "field_mock_a" } as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

    const req = createRequest({ currentPassword: SEC_WRONG, newPassword: SEC_NEW });
    const response = await PATCH(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Incorrect current password");
  });

  it("successfully updates password and sets new cookies", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyAccessToken).mockResolvedValue({ userId: "u1", roleName: "USER", tokenVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", password: "field_mock_a" } as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
    vi.mocked(bcrypt.hash).mockResolvedValue("field_mock_b" as any);
    
    const updatedUser = { id: "u1", tokenVersion: 2, role: { name: "USER" } };
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);
    vi.mocked(generateAccessToken).mockReturnValue("new-access");
    vi.mocked(generateRefreshToken).mockReturnValue("new-refresh");

    const req = createRequest({ currentPassword: SEC_OLD, newPassword: SEC_NEW });
    const response = await PATCH(req);

    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(vi.mocked(prisma.user.update).mock.calls[0][0].data.tokenVersion).toEqual({ increment: 1 });
  });

  it("returns 500 on internal error", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "token" }),
    } as any);
    vi.mocked(verifyAccessToken).mockRejectedValue(new Error("Failure"));
    const req = createRequest({ currentPassword: SEC_OLD, newPassword: SEC_NEW });
    const response = await PATCH(req);
    expect(response.status).toBe(500);
  });
});
