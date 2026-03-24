import { describe, it } from "vitest";
import * as Module from "@/app/admin/categories/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/categories/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/categories/page.tsx"));
});
