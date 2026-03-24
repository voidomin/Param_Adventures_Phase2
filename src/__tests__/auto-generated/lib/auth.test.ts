import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/auth.ts", () => {
  it("imports", () => smokeTestModule("@/lib/auth"));
});
