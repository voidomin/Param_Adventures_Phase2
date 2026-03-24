import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/cloudinary.ts", () => {
  it("imports", () => smokeTestModule("@/lib/cloudinary"));
});
