import { describe, it } from "vitest";
import * as Module from "@/components/emails/PasswordResetEmail";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/emails/PasswordResetEmail.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/emails/PasswordResetEmail.tsx"));
});
