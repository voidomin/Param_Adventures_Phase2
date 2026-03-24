import { describe, it } from "vitest";
import * as Module from "@/components/experiences/SaveButton";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/experiences/SaveButton.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/experiences/SaveButton.tsx"));
});
