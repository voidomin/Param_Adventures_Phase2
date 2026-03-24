import { describe, it } from "vitest";
import * as Module from "@/components/admin/StoryBlockForm";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/admin/StoryBlockForm.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/admin/StoryBlockForm.tsx"));
});
