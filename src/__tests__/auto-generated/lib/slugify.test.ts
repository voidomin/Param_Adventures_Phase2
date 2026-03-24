import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/slugify.ts", () => {
  it("imports", () => smokeTestModule("@/lib/slugify"));
});
