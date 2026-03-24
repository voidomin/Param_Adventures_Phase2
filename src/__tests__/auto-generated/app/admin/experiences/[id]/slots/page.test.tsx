import { describe, it } from "vitest";
import * as Module from "@/app/admin/experiences/[id]/slots/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/experiences/[id]/slots/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/experiences/[id]/slots/page.tsx"));
});
