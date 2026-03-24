import { describe, it } from "vitest";
import * as Module from "@/app/admin/leads/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/leads/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/leads/page.tsx"));
});
