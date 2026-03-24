import { describe, it } from "vitest";
import * as Module from "@/components/admin/AuthContentManager";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/AuthContentManager.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/AuthContentManager.tsx"));
});
