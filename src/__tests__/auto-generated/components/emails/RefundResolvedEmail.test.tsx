import { describe, it } from "vitest";
import * as Module from "@/components/emails/RefundResolvedEmail";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/emails/RefundResolvedEmail.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/emails/RefundResolvedEmail.tsx"));
});
