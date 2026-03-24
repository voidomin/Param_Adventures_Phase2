import { describe, it } from "vitest";
import * as Module from "@/components/emails/WelcomeEmail";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/emails/WelcomeEmail.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/emails/WelcomeEmail.tsx"));
});
