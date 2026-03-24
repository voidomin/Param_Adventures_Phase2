import { describe, it } from "vitest";
import { smokeTestModule } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/api/bookings/route.ts", () => {
  it("imports", () => smokeTestModule("@/app/api/bookings/route"));
});
