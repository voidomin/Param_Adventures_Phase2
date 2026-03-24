import { describe, it } from "vitest";
import * as Module from "@/components/auth/AuthLayout";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/auth/AuthLayout.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/auth/AuthLayout.tsx"));
});
