import { describe, it } from "vitest";
import * as Module from "@/components/experiences/ExperienceStickyNav";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/experiences/ExperienceStickyNav.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/experiences/ExperienceStickyNav.tsx"));
});
