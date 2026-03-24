import { describe, it } from "vitest";
import * as Module from "@/app/admin/media/page";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: app/admin/media/page.tsx", () => {
  it("renders", () => smokeTestReact(Module, "app/admin/media/page.tsx"));
});
