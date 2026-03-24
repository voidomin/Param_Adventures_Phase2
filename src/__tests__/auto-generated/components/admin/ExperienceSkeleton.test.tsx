import { describe, it } from "vitest";
import * as Module from "@/components/admin/ExperienceSkeleton";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/ExperienceSkeleton.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/ExperienceSkeleton.tsx"));
});
