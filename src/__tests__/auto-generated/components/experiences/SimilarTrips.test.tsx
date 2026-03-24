import { describe, it } from "vitest";
import * as Module from "@/components/experiences/SimilarTrips";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/experiences/SimilarTrips.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/experiences/SimilarTrips.tsx"));
});
