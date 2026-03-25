import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    customLead: {
      create: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/leads/route";
import { prisma } from "@/lib/db";

const mockCreate = vi.mocked(prisma.customLead.create);

const createRequest = (body: unknown) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as Request;

describe("POST /api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on validation failure", async () => {
    const response = await POST(createRequest({ name: "", email: "bad" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(typeof data.error).toBe("string");
  });

  it("creates lead and returns 201 on success", async () => {
    const payload = {
      name: "Akash",
      email: "akash@example.com",
      phone: "9999999999",
      requirements: "Need a custom corporate trip plan",
    };
    mockCreate.mockResolvedValue({ id: "lead-1", ...payload } as any);

    const response = await POST(createRequest(payload));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith({ data: payload });
  });

  it("returns 500 on unexpected error", async () => {
    const payload = {
      name: "Akash",
      email: "akash@example.com",
      phone: "9999999999",
      requirements: "Need a custom corporate trip plan",
    };
    mockCreate.mockRejectedValue(new Error("db down"));

    const response = await POST(createRequest(payload));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to submit request. Please try again.");
  });
});
