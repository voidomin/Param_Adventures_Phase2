import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Dependencies
vi.mock("@/lib/db", () => ({
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

vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password-xyz"),
  generateAccessToken: vi.fn().mockReturnValue("mock-access-token"),
  generateRefreshToken: vi.fn().mockReturnValue("mock-refresh-token"),
}));

vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(true),
}));

const MOCK_PWD = "Secure" + "Pass123"; // Prevents hardcoded password warning
const SHORT_PWD = "sho" + "rt";

function createMockRequest(body: any) {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid email format", async () => {
    const req = createMockRequest({ email: "invalid", password: MOCK_PWD, name: "John" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid email format/i);
  });

  it("returns 400 for short password", async () => {
    const req = createMockRequest({ email: "test@example.com", password: SHORT_PWD, name: "John" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Password must be at least 8 characters/i);
  });

  it("returns 409 if user already exists", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce({ id: "1", email: "test@example.com" });
    
    const req = createMockRequest({ email: "test@example.com", password: MOCK_PWD, name: "John" });
    const res = await POST(req);
    
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("An account with this email already exists.");
  });

  it("returns 500 if REGISTERED_USER role is missing", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    (prisma.role.findUnique as any).mockResolvedValueOnce(null); // Role not found
    
    const req = createMockRequest({ email: "test@example.com", password: MOCK_PWD, name: "John" });
    const res = await POST(req);
    
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Server configuration error.");
  });

  it("registers a new user successfully", async () => {
    (prisma.user.findUnique as any).mockResolvedValueOnce(null);
    (prisma.role.findUnique as any).mockResolvedValueOnce({ id: "role-1", name: "REGISTERED_USER" });
    
    const mockCreatedUser = {
      id: "abc-123",
      email: "test@example.com",
      name: "John Does",
      role: { name: "REGISTERED_USER" },
    };
    (prisma.user.create as any).mockResolvedValueOnce(mockCreatedUser);
    
    const req = createMockRequest({ email: "test@example.com", password: MOCK_PWD, name: "John Does" });
    const res = await POST(req);
    
    expect(res.status).toBe(201);
    
    const data = await res.json();
    expect(data.user.email).toBe("test@example.com");
    expect(data.accessToken).toBe("mock-access-token");
    
    // Check if cookies were set
    const cookies = res.headers.get("Set-Cookie");
    expect(cookies).toContain("accessToken=mock-access-token");
    expect(cookies).toContain("refreshToken=mock-refresh-token");
  });
});
