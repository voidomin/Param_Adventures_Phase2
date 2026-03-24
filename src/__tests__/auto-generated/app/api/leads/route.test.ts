import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/leads/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/leads/route"));
});
