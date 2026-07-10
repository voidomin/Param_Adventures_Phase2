import { describe, it, expect, vi } from "vitest";
import { withBuildSafety } from "@/lib/db-utils";

describe("db-utils: withBuildSafety", () => {
  it("returns fetcher result on success", async () => {
    const fetcher = vi.fn().mockResolvedValue("success-data");
    const result = await withBuildSafety(fetcher, "fallback-data");
    expect(result).toBe("success-data");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns fallback value on database connection error P1001", async () => {
    const error = { code: "P1001", message: "Can't reach database server" };
    const fetcher = vi.fn().mockRejectedValue(error);
    const result = await withBuildSafety(fetcher, "fallback-data");
    expect(result).toBe("fallback-data");
  });

  it("returns fallback value on database timeout cause error", async () => {
    const error = new Error("Connection failed");
    (error as any).cause = { code: "P1008", message: "Operations timed out" };
    const fetcher = vi.fn().mockRejectedValue(error);
    const result = await withBuildSafety(fetcher, "fallback-data");
    expect(result).toBe("fallback-data");
  });

  it("returns fallback value on connection refused network errors", async () => {
    const error = { code: "ECONNREFUSED", message: "Connection refused" };
    const fetcher = vi.fn().mockRejectedValue(error);
    const result = await withBuildSafety(fetcher, "fallback-data");
    expect(result).toBe("fallback-data");
  });

  it("returns fallback value on keyword match in error string", async () => {
    const error = new Error("Database unreachable at port 5432");
    const fetcher = vi.fn().mockRejectedValue(error);
    const result = await withBuildSafety(fetcher, "fallback-data");
    expect(result).toBe("fallback-data");
  });

  it("re-throws standard non-connection errors", async () => {
    const error = new Error("Syntax error in query");
    const fetcher = vi.fn().mockRejectedValue(error);
    await expect(withBuildSafety(fetcher, "fallback-data")).rejects.toThrow("Syntax error in query");
  });
});
