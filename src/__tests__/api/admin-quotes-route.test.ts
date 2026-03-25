import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    adventureQuote: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/admin/quotes/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindMany = vi.mocked(prisma.adventureQuote.findMany);
const mockCreate = vi.mocked(prisma.adventureQuote.create);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/admin/quotes route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 403 when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns quotes", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockResolvedValue([{ id: "q1" }] as any);

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.quotes).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns 500 on failure", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockFindMany.mockRejectedValue(new Error("db down"));

      const response = await GET({} as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch quotes");
      expect(data.details).toBe("db down");
    });
  });

  describe("POST", () => {
    it("returns 403 when unauthorized", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

      const response = await POST(createRequest({ text: "A" }));

      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid body", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

      const response = await POST(createRequest({ text: "" }));

      expect(response.status).toBe(400);
    });

    it("creates quote", async () => {
      mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
      mockCreate.mockResolvedValue({ id: "q1", text: "Keep moving." } as any);

      const response = await POST(createRequest({ text: "Keep moving." }));
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("q1");
      expect(mockCreate).toHaveBeenCalledWith({
        data: { text: "Keep moving." },
      });
    });
  });
});
