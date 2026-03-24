import { describe, it } from "vitest";
import * as Module from "@/components/admin/MediaUploader";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/MediaUploader.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/MediaUploader.tsx"));
});
