import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => {
  const mockPrisma = {
    booking: {
      findMany: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

import { GET } from "@/app/api/admin/enquiries/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockBookingFindMany = vi.mocked(prisma.booking.findMany);

const createRequest = () => new NextRequest("http://localhost/api/admin/enquiries");

describe("GET /api/admin/enquiries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when request is unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as any);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 for unauthorized roles", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "REGISTERED_USER",
    } as any);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized access.");
  });

  it("returns active pending enquiries (< 24h old)", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);

    mockBookingFindMany.mockResolvedValue([
      {
        id: "b1",
        createdAt: new Date().toISOString(),
        totalPrice: "5000",
        participantCount: 2,
        user: { name: "John", email: "john@example.com", phoneNumber: "9876543210" },
        experience: { title: "Kudremukh Trek", slug: "kudremukh" },
        slot: { date: new Date().toISOString() },
      },
    ] as any);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pendingEnquiries).toHaveLength(1);
    expect(data.pendingEnquiries[0].user.name).toBe("John");
  });

  it("returns 500 on database failure", async () => {
    mockAuthorizeRequest.mockResolvedValue({
      authorized: true,
      roleName: "SUPER_ADMIN",
    } as any);

    mockBookingFindMany.mockRejectedValue(new Error("Database error"));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch sales enquiries.");
  });
});
