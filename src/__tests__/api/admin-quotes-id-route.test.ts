import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-auth", () => ({ authorizeRequest: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    adventureQuote: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { DELETE, GET, PUT } from "@/app/api/admin/quotes/[id]/route";
import { authorizeRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const mockAuthorizeRequest = vi.mocked(authorizeRequest);
const mockFindUnique = vi.mocked(prisma.adventureQuote.findUnique);
const mockUpdate = vi.mocked(prisma.adventureQuote.update);
const mockDelete = vi.mocked(prisma.adventureQuote.delete);

const createRequest = (body?: unknown) =>
  ({
    json: vi.fn().mockResolvedValue(body ?? {}),
  }) as unknown as NextRequest;

describe("/api/admin/quotes/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 403 when unauthorized", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: false } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "q1" }),
    });

    expect(response.status).toBe(403);
  });

  it("GET returns 404 when quote missing", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue(null);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "q1" }),
    });

    expect(response.status).toBe(404);
  });

  it("GET returns quote", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockFindUnique.mockResolvedValue({ id: "q1", text: "Go." } as any);

    const response = await GET({} as NextRequest, {
      params: Promise.resolve({ id: "q1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quote.id).toBe("q1");
  });

  it("PUT validates body", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);

    const response = await PUT(createRequest({ text: "" }), {
      params: Promise.resolve({ id: "q1" }),
    });

    expect(response.status).toBe(400);
  });

  it("PUT updates quote", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockUpdate.mockResolvedValue({ id: "q1", text: "Updated." } as any);

    const response = await PUT(createRequest({ text: "Updated." }), {
      params: Promise.resolve({ id: "q1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("q1");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { text: "Updated." },
    });
  });

  it("DELETE removes quote", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockDelete.mockResolvedValue({ id: "q1" } as any);

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "q1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "q1" } });
  });

  it("returns 500 when delete fails", async () => {
    mockAuthorizeRequest.mockResolvedValue({ authorized: true } as any);
    mockDelete.mockRejectedValue(new Error("db down"));

    const response = await DELETE({} as NextRequest, {
      params: Promise.resolve({ id: "q1" }),
    });

    expect(response.status).toBe(500);
  });
});
