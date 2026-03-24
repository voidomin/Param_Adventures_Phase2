import { describe, it } from "vitest";
import * as Module from "@/components/experiences/DifficultyMeter";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/experiences/DifficultyMeter.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/experiences/DifficultyMeter.tsx"));
});
