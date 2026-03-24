import { describe, it } from "vitest";
import * as Module from "@/components/experiences/ExperienceCard";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/experiences/ExperienceCard.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/experiences/ExperienceCard.tsx"));
});
