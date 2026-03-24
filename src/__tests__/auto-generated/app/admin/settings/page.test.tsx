import { describe, it } from "vitest";
import * as Module from "@/app/admin/settings/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/settings/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/settings/page.tsx"));
});
