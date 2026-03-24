import { describe, it } from "vitest";
import * as Module from "@/components/home/InfiniMarquee";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/home/InfiniMarquee.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/home/InfiniMarquee.tsx"));
});
