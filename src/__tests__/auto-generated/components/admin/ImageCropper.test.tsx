import { describe, it } from "vitest";
import * as Module from "@/components/admin/ImageCropper";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/ImageCropper.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/ImageCropper.tsx"));
});
