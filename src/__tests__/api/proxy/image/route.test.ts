import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/proxy-image/route";

const createRequest = (url: string) =>
  ({ nextUrl: new URL(url) }) as NextRequest;

const ALLOWED_URL = "http://localhost/api/proxy-image?url=" + encodeURIComponent("https://res.cloudinary.com/demo/image.jpg");

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
      createRequest(ALLOWED_URL),
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
      createRequest(ALLOWED_URL),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dataUrl).toContain("data:image/png;base64,");
  });

  it("defaults to image/jpeg when content-type header is missing", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn().mockReturnValue(null) },
        arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer),
      } as unknown),
    );

    const response = await GET(
      createRequest(ALLOWED_URL),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dataUrl).toContain("data:image/jpeg;base64,");
  });

  it("returns 500 on unexpected error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const response = await GET(
      createRequest(ALLOWED_URL),
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to proxy image.");
  });

  it("returns 400 for an invalid url", async () => {
    const response = await GET(
      createRequest("http://localhost/api/proxy-image?url=not-a-url"),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid url param");
  });

  it("rejects a cloud-metadata SSRF attempt", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(
      createRequest(
        "http://localhost/api/proxy-image?url=" +
          encodeURIComponent("http://169.254.169.254/latest/meta-data/"),
      ),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("URL host is not allowed");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects an arbitrary external host", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(
      createRequest(
        "http://localhost/api/proxy-image?url=" + encodeURIComponent("https://evil.example.com/x"),
      ),
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) protocol", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const response = await GET(
      createRequest(
        "http://localhost/api/proxy-image?url=" + encodeURIComponent("file:///etc/passwd"),
      ),
    );

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("allows a same-origin url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn().mockReturnValue("image/png") },
        arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1]).buffer),
      } as unknown),
    );

    const response = await GET(
      createRequest(
        "http://localhost/api/proxy-image?url=" + encodeURIComponent("http://localhost/param-logo.png"),
      ),
    );

    expect(response.status).toBe(200);
  });

  it("allows an S3 host", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: vi.fn().mockReturnValue("image/png") },
        arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1]).buffer),
      } as unknown),
    );

    const response = await GET(
      createRequest(
        "http://localhost/api/proxy-image?url=" +
          encodeURIComponent("https://my-bucket.s3.ap-south-1.amazonaws.com/uploads/x.jpg"),
      ),
    );

    expect(response.status).toBe(200);
  });
});
