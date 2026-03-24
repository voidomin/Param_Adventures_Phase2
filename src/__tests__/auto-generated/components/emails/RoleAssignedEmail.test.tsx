import { describe, it } from "vitest";
import * as Module from "@/components/emails/RoleAssignedEmail";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/emails/RoleAssignedEmail.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/emails/RoleAssignedEmail.tsx"));
});
