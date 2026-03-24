import { describe, it } from "vitest";
import * as Module from "@/components/layout/ThemeProvider";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/layout/ThemeProvider.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/layout/ThemeProvider.tsx"));
});
