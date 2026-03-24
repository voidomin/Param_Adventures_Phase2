import { describe, it } from "vitest";
import * as Module from "@/components/layout/Hero";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/layout/Hero.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/layout/Hero.tsx"));
});
