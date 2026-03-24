import { describe, it } from "vitest";
import * as Module from "@/components/booking/MobileBookingBar";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/booking/MobileBookingBar.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/booking/MobileBookingBar.tsx"));
});
