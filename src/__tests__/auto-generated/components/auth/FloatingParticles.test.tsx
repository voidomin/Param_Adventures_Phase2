import { describe, it } from "vitest";
import * as Module from "@/components/auth/FloatingParticles";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/auth/FloatingParticles.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/auth/FloatingParticles.tsx"));
});
