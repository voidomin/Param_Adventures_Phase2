import { describe, it } from "vitest";
import * as Module from "@/components/admin/ExperienceForm";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/ExperienceForm.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/ExperienceForm.tsx"));
});
