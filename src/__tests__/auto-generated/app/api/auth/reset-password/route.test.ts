import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/auth/reset-password/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/auth/reset-password/route"));
});
