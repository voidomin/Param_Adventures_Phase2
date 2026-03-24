import { describe, it } from "vitest";
import * as Module from "@/components/emails/TripCompletedEmail";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/emails/TripCompletedEmail.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/emails/TripCompletedEmail.tsx"));
});
