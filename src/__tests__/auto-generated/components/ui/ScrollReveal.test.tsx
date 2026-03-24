import { describe, it } from "vitest";
import * as Module from "@/components/ui/ScrollReveal";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/ui/ScrollReveal.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/ui/ScrollReveal.tsx"));
});
