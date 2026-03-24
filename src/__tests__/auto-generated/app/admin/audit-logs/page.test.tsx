import { describe, it } from "vitest";
import * as Module from "@/app/admin/audit-logs/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/audit-logs/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/audit-logs/page.tsx"));
});
