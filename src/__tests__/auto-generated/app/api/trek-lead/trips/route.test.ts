import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/trek-lead/trips/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/trek-lead/trips/route"));
});
