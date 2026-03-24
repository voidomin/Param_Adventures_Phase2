import { describe, it } from "vitest";
import * as Module from "@/components/layout/Navbar";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/layout/Navbar.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/layout/Navbar.tsx"));
});
