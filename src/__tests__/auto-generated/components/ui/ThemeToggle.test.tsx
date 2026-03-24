import { describe, it } from "vitest";
import * as Module from "@/components/ui/ThemeToggle";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/ui/ThemeToggle.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/ui/ThemeToggle.tsx"));
});
