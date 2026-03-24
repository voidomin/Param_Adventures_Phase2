import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/experiences/[slug]/reviews/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/experiences/[slug]/reviews/route"));
});
