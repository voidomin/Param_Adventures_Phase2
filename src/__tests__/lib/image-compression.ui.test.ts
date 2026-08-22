import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImageFile } from "@/lib/image-compression";

function makeFile(bytes: number, type: string): File {
  return new File([new Uint8Array(bytes)], "photo", { type });
}

describe("compressImageFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the original file unchanged for animated GIFs", async () => {
    const file = makeFile(1000, "image/gif");
    const result = await compressImageFile(file);
    expect(result).toBe(file);
  });

  it("returns the original file unchanged for non-image input", async () => {
    const file = makeFile(1000, "application/pdf");
    const result = await compressImageFile(file);
    expect(result).toBe(file);
  });

  it("falls back to the original file if createImageBitmap throws (e.g. corrupt file)", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode failed")));
    const file = makeFile(1000, "image/jpeg");
    const result = await compressImageFile(file);
    expect(result).toBe(file);
  });

  it("returns a smaller webp blob when canvas compression succeeds and shrinks the file", async () => {
    const closeSpy = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: closeSpy }),
    );

    const smallerBlob = new Blob([new Uint8Array(100)], { type: "image/webp" });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as any);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb: any) => cb(smallerBlob));

    const file = makeFile(10_000, "image/jpeg");
    const result = await compressImageFile(file, { maxDimension: 2000 });

    expect(result).toBe(smallerBlob);
    expect(drawImage).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it("keeps the original file when the 'compressed' result is not actually smaller", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
    );

    const biggerBlob = new Blob([new Uint8Array(50_000)], { type: "image/webp" });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as any);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb: any) => cb(biggerBlob));

    const file = makeFile(1000, "image/png");
    const result = await compressImageFile(file);

    expect(result).toBe(file);
  });

  it("falls back to jpeg when the browser can't actually encode webp", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 3000, height: 2000, close: vi.fn() }),
    );

    const pngFallback = new Blob([new Uint8Array(9000)], { type: "image/png" }); // silently ignored webp request
    const jpegBlob = new Blob([new Uint8Array(500)], { type: "image/jpeg" });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as any);
    let call = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb: any) => {
      call += 1;
      if (call === 1) return cb(pngFallback);
      return cb(jpegBlob);
    });

    const file = makeFile(10_000, "image/jpeg");
    const result = await compressImageFile(file);

    expect(result).toBe(jpegBlob);
  });
});
