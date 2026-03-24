import { describe, it } from "vitest";
import * as Module from "@/components/emails/BookingConfirmedEmail";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/emails/BookingConfirmedEmail.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/emails/BookingConfirmedEmail.tsx"));
});
