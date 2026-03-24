import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/manager/trips/[id]/start/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/manager/trips/[id]/start/route"));
});
