import { describe, it } from "vitest";
import * as Module from "@/components/admin/TableSkeleton";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/TableSkeleton.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/TableSkeleton.tsx"));
});
