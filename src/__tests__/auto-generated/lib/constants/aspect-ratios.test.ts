import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/constants/aspect-ratios.ts", () => {
  it("imports", () => smokeTestModule("@/lib/constants/aspect-ratios"));
});
