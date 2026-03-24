import { describe, it } from "vitest";
import * as Module from "@/app/admin/hero/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/hero/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/hero/page.tsx"));
});
