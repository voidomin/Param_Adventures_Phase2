import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/proxy-image/route";

const createRequest = (url: string) =>
  ({ nextUrl: new URL(url) }) as NextRequest;

describe("GET /api/proxy-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when url is missing", async () => {
    const response = await GET(
      createRequest("http://localhost/api/proxy-image"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing url param");
  });

  it("returns 502 when upstream fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, headers: new Headers() } as unknown),
    );

    const response = await GET(
      createRequest("http://localhost/api/proxy-image?url=http://img"),
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Failed to fetch image");
  });

  it("returns base64 data URL on success", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn().mockReturnValue("image/png") },
        arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer),
      } as unknown),
    );

    const response = await GET(
      createRequest("http://localhost/api/proxy-image?url=http://img"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dataUrl).toContain("data:image/png;base64,");
  });

  it("returns 500 on unexpected error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const response = await GET(
      createRequest("http://localhost/api/proxy-image?url=http://img"),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to proxy image.");
  });
});
