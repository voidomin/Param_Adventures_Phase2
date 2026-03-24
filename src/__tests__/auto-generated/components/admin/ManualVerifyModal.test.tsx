import { describe, it } from "vitest";
import * as Module from "@/components/admin/ManualVerifyModal";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/ManualVerifyModal.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/ManualVerifyModal.tsx"));
});
