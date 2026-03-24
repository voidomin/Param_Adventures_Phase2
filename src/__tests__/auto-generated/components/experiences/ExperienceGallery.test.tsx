import { describe, it } from "vitest";
import * as Module from "@/components/experiences/ExperienceGallery";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/experiences/ExperienceGallery.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/experiences/ExperienceGallery.tsx"));
});
