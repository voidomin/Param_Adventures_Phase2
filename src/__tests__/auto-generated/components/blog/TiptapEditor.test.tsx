import { describe, it } from "vitest";
import * as Module from "@/components/blog/TiptapEditor";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/blog/TiptapEditor.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/blog/TiptapEditor.tsx"));
});
