import { describe, it } from "vitest";
import * as Module from "@/components/emails/AdminInviteEmail";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/emails/AdminInviteEmail.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/emails/AdminInviteEmail.tsx"));
});
