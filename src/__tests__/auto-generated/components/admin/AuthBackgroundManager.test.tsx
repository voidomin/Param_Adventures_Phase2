import { describe, it } from "vitest";
import * as Module from "@/components/admin/AuthBackgroundManager";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/AuthBackgroundManager.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/AuthBackgroundManager.tsx"));
});
