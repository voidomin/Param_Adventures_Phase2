import { describe, it } from "vitest";
import * as Module from "@/app/admin/users/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/users/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/users/page.tsx"));
});
