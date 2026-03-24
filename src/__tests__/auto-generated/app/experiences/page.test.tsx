import { describe, it } from "vitest";
import * as Module from "@/app/experiences/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/experiences/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/experiences/page.tsx"));
});
