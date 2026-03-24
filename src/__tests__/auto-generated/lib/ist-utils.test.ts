import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/ist-utils.ts", () => {
  it("imports", () => smokeTestModule("@/lib/ist-utils"));
});
