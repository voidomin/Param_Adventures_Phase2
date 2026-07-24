import { describe, expect, it } from "vitest";
import { cn, maskEmail } from "@/lib/utils";

describe("lib/utils cn", () => {
  it("merges conditional and conflicting class names", () => {
    const result = cn("px-2", false && "hidden", "px-4", "text-sm");
    expect(result).toBe("px-4 text-sm");
  });
});

describe("lib/utils maskEmail", () => {
  it("keeps up to the first two local-part characters and the full domain", () => {
    expect(maskEmail("jane.doe@example.com")).toBe("ja***@example.com");
  });

  it("handles a single-character local part", () => {
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
  });

  it("returns a fully masked placeholder for a malformed value", () => {
    expect(maskEmail("not-an-email")).toBe("***");
  });
});
