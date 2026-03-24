import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/rate-limit.ts", () => {
  it("imports", () => smokeTestModule("@/lib/rate-limit"));
});
