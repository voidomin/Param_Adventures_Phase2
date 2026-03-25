import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/audit-logger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendRoleAssignedEmail: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
  },
}));

import { PATCH } from "@/app/api/admin/users/[id]/role/route";
import { authorizeRequest } from "@/lib/api-auth";
import { logActivity } from "@/lib/audit-logger";
import { sendRoleAssignedEmail } from "@/lib/email";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockLogActivity = vi.mocked(logActivity);
const mockSendRoleAssignedEmail = vi.mocked(sendRoleAssignedEmail);
const mockUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockUserUpdate = vi.mocked(prisma.user.update);
const mockRoleFindUnique = vi.mocked(prisma.role.findUnique);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("PATCH /api/admin/users/[id]/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendRoleAssignedEmail.mockResolvedValue(undefined as any);
  });

  it("returns auth response when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await PATCH(createRequest(), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);

    const response = await PATCH(createRequest({ roleId: "" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 403 when acting user lacks elevated role", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "u1" } as any);
    mockUserFindUnique.mockResolvedValueOnce({ role: { name: "USER" } } as any);

    const response = await PATCH(createRequest({ roleId: "r1" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when target user is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "a1", role: { name: "ADMIN" } } as any);
    mockUserFindUnique.mockResolvedValueOnce(null);

    const response = await PATCH(createRequest({ roleId: "r1" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 when role is missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "a1", role: { name: "ADMIN" } } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "u2", role: { name: "USER" } } as any);
    mockRoleFindUnique.mockResolvedValue(null);

    const response = await PATCH(createRequest({ roleId: "r1" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(404);
  });

  it("blocks assigning SUPER_ADMIN by non-super-admin actor", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "a1", role: { name: "ADMIN" } } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "u2", role: { name: "USER" } } as any);
    mockRoleFindUnique.mockResolvedValue({ id: "r1", name: "SUPER_ADMIN" } as any);

    const response = await PATCH(createRequest({ roleId: "r1" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(403);
  });

  it("blocks TRIP_MANAGER assigning non-TREK_LEAD role", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "m1" } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "m1", role: { name: "TRIP_MANAGER" } } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "u2", role: { name: "USER" } } as any);
    mockRoleFindUnique.mockResolvedValue({ id: "r1", name: "ADMIN" } as any);

    const response = await PATCH(createRequest({ roleId: "r1" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(403);
  });

  it("blocks non-super-admin from modifying SUPER_ADMIN target", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "a1", role: { name: "ADMIN" } } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "u2", role: { name: "SUPER_ADMIN" } } as any);
    mockRoleFindUnique.mockResolvedValue({ id: "r2", name: "ADMIN" } as any);

    const response = await PATCH(createRequest({ roleId: "r2" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(403);
  });

  it("updates role, logs activity, and sends email", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "sa1" } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "sa1", role: { name: "SUPER_ADMIN" } } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "u2", role: { name: "USER" } } as any);
    mockRoleFindUnique.mockResolvedValue({ id: "r3", name: "ADMIN" } as any);
    mockUserUpdate.mockResolvedValue({
      id: "u2",
      name: "User Two",
      email: "u2@example.com",
      role: { name: "ADMIN" },
    } as any);

    const response = await PATCH(createRequest({ roleId: "r3" }), {
      params: Promise.resolve({ id: "u2" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe("u2");
    expect(mockLogActivity).toHaveBeenCalledWith(
      "ROLE_ASSIGNED",
      "sa1",
      "User",
      "u2",
      { newRole: "ADMIN", targetEmail: "u2@example.com" },
    );
    expect(mockSendRoleAssignedEmail).toHaveBeenCalledWith({
      userName: "User Two",
      userEmail: "u2@example.com",
      roleName: "ADMIN",
    });
  });

  it("uses fallback userName when updated user name is null", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "sa1" } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "sa1", role: { name: "SUPER_ADMIN" } } as any);
    mockUserFindUnique.mockResolvedValueOnce({ id: "u2", role: { name: "USER" } } as any);
    mockRoleFindUnique.mockResolvedValue({ id: "r3", name: "ADMIN" } as any);
    mockUserUpdate.mockResolvedValue({
      id: "u2",
      name: null,
      email: "u2@example.com",
      role: { name: "ADMIN" },
    } as any);

    const response = await PATCH(createRequest({ roleId: "r3" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(200);
    expect(mockSendRoleAssignedEmail).toHaveBeenCalledWith({
      userName: "User",
      userEmail: "u2@example.com",
      roleName: "ADMIN",
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true, userId: "a1" } as any);
    mockUserFindUnique.mockRejectedValue(new Error("db down"));

    const response = await PATCH(createRequest({ roleId: "r1" }), {
      params: Promise.resolve({ id: "u2" }),
    });

    expect(response.status).toBe(500);
  });
});
