import { describe, it } from "vitest";
import * as Module from "@/app/admin/blogs/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/blogs/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/blogs/page.tsx"));
});
