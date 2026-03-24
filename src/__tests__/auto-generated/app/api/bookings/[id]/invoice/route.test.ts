import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/bookings/[id]/invoice/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/bookings/[id]/invoice/route"));
});
