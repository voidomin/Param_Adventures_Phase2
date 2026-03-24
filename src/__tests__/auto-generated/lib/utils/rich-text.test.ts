import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/utils/rich-text.ts", () => {
  it("imports", () => smokeTestModule("@/lib/utils/rich-text"));
});
