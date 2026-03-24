import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/settings/auth/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/settings/auth/route"));
});
