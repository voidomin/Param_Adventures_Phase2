import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/health/route";
import { prisma } from "@/lib/db";

const mockQueryRaw = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (prisma as any).$queryRaw = mockQueryRaw;
});

function createRequest() {
  return new NextRequest("http://localhost/api/health", {
    method: "GET",
  });
}

describe("GET /api/health", () => {
  it("returns 200 and db connected status on successful DB ping", async () => {
    mockQueryRaw.mockResolvedValueOnce([1]);
    
    const req = createRequest();
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.database).toBe("connected");
    expect(data.timestamp).toBeDefined();
    expect(mockQueryRaw).toHaveBeenCalled();
  });

  it("returns 500 and disconnected status on DB connection failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockQueryRaw.mockRejectedValueOnce(new Error("Connection refused"));
    
    const req = createRequest();
    const res = await GET(req);
    
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.status).toBe("error");
    expect(data.database).toBe("disconnected");
    expect(data.error).toBe("Connection refused");
    expect(data.timestamp).toBeDefined();
    
    errorSpy.mockRestore();
  });
});
