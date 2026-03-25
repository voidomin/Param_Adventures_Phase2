import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../app/api/auth/register/route";
import { prisma } from "../../../lib/db";
import { NextRequest } from "next/server";

vi.mock("../../../lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../../lib/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("mock_hash"),
  generateAccessToken: vi.fn().mockReturnValue("mock_access_token"),
  generateRefreshToken: vi.fn().mockReturnValue("mock_refresh_token"),
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  it("returns 400 for missing fields", async () => {
    const req = createRequest({ email: "test@example.com" });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 409 if user already exists", async () => {
    const TEST_SECRET = "TestValue@123";
    const req = createRequest({ email: "test@example.com", password: TEST_SECRET, name: "Test" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "1" } as unknown);

    const response = await POST(req);
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toContain("already exists");
  });

  it("successfully registers a user", async () => {
    const TEST_SECRET = "TestValue@123";
    const req = createRequest({ email: "new@example.com", password: TEST_SECRET, name: "New User" });
    
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.role.findUnique).mockResolvedValue({ id: "r1", name: "REGISTERED_USER" } as unknown);
    vi.mocked(prisma.user.create).mockResolvedValue({ 
      id: "u2", 
      email: "new@example.com", 
      name: "New User",
      role: { name: "REGISTERED_USER" }
    } as unknown);

    const response = await POST(req);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.user.email).toBe("new@example.com");
  });
});
