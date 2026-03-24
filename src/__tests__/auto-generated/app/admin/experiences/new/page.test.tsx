import { describe, it } from "vitest";
import * as Module from "@/app/admin/experiences/new/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/experiences/new/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/experiences/new/page.tsx"));
});
