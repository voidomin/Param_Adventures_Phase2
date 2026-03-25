import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:crypto", () => {
  const randomIntMock = vi.fn();
  return {
    randomInt: randomIntMock,
    default: {
      randomInt: randomIntMock,
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    adventureQuote: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/quotes/route";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";

const mockRandomInt = vi.mocked(randomInt);
const mockCount = vi.mocked(prisma.adventureQuote.count);
const mockFindFirst = vi.mocked(prisma.adventureQuote.findFirst);

describe("GET /api/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null quote when no active records exist", async () => {
    mockCount.mockResolvedValue(0);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ quote: null });
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("uses skip 0 when count is 1", async () => {
    const quote = { id: "q1", text: "Adventure begins where plans end." };
    mockCount.mockResolvedValue(1);
    mockFindFirst.mockResolvedValue(quote as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quote).toEqual(quote);
    expect(mockRandomInt).not.toHaveBeenCalled();
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      skip: 0,
    });
  });

  it("uses random skip when multiple quotes exist", async () => {
    const quote = { id: "q3", text: "Keep climbing." };
    mockCount.mockResolvedValue(5);
    mockRandomInt.mockReturnValue(3 as any);
    mockFindFirst.mockResolvedValue(quote as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quote).toEqual(quote);
    expect(mockRandomInt).toHaveBeenCalledWith(0, 5);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns 500 on failure", async () => {
    mockCount.mockRejectedValue(new Error("boom"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch quote");
    expect(data.details).toBe("boom");
  });
});
