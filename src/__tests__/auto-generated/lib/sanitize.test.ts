import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/sanitize.ts", () => {
  it("imports", () => smokeTestModule("@/lib/sanitize"));
});
