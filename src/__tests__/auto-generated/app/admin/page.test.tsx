import { describe, it } from "vitest";
import * as Module from "@/app/admin/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/page.tsx"));
});
