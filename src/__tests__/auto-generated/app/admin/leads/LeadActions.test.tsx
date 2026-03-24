import { describe, it } from "vitest";
import * as Module from "@/app/admin/leads/LeadActions";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/leads/LeadActions.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/leads/LeadActions.tsx"));
});
