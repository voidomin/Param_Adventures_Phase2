import { describe, it } from "vitest";
import * as Module from "@/components/auth/PasswordStrength";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/auth/PasswordStrength.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/auth/PasswordStrength.tsx"));
});
