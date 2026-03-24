import { describe, it } from "vitest";
import * as Module from "@/components/admin/HeroForm";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/HeroForm.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/HeroForm.tsx"));
});
