import { describe, it } from "vitest";
import * as Module from "@/components/booking/BookingModal";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/booking/BookingModal.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/booking/BookingModal.tsx"));
});
