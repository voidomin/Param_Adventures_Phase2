import { describe, it } from "vitest";
import * as Module from "@/components/home/ImpactStats";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/home/ImpactStats.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/home/ImpactStats.tsx"));
});
