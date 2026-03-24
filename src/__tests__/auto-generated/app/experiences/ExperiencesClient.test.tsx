import { describe, it } from "vitest";
import * as Module from "@/app/experiences/ExperiencesClient";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/experiences/ExperiencesClient.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/experiences/ExperiencesClient.tsx"));
});
