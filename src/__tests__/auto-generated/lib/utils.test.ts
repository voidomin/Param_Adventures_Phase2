import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/utils.ts", () => {
  it("imports", () => smokeTestModule("@/lib/utils"));
});
