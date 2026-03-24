import { describe, it } from "vitest";
import * as Module from "@/components/layout/Footer";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/layout/Footer.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/layout/Footer.tsx"));
});
