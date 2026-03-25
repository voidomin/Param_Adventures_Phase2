import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("lib/utils cn", () => {
  it("merges conditional and conflicting class names", () => {
    const result = cn("px-2", false && "hidden", "px-4", "text-sm");
    expect(result).toBe("px-4 text-sm");
  });
});
