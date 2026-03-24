import { describe, it } from "vitest";
import * as Module from "@/components/story/StoryPageClient";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/story/StoryPageClient.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/story/StoryPageClient.tsx"));
});
