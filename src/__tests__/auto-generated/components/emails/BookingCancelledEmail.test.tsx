import { describe, it } from "vitest";
import * as Module from "@/components/emails/BookingCancelledEmail";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/emails/BookingCancelledEmail.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/emails/BookingCancelledEmail.tsx"));
});
