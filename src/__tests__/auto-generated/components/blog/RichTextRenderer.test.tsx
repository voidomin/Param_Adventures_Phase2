import { describe, it } from "vitest";
import * as Module from "@/components/blog/RichTextRenderer";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/blog/RichTextRenderer.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/blog/RichTextRenderer.tsx"));
});
