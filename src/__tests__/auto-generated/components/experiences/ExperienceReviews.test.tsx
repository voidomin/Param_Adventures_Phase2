import { describe, it } from "vitest";
import * as Module from "@/components/experiences/ExperienceReviews";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/experiences/ExperienceReviews.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/experiences/ExperienceReviews.tsx"));
});
