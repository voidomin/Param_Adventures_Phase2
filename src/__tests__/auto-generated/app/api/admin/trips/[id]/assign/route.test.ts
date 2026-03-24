import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/admin/trips/[id]/assign/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/admin/trips/[id]/assign/route"));
});
