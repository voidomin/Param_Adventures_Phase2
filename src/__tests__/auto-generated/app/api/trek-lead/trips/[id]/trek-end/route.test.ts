import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/trek-lead/trips/[id]/trek-end/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/trek-lead/trips/[id]/trek-end/route"));
});
