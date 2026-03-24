import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: lib/api-auth.ts", () => {
  it("imports", () => smokeTestModule("@/lib/api-auth"));
});
