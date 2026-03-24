import { describe, it } from "vitest";
import * as Module from "@/components/blog/ClientTiptapViewer";
import { smokeTestReact } from "@/__tests__/smoke-test-helper";

describe("Smoke: components/blog/ClientTiptapViewer.tsx", () => {
  it("renders", () => smokeTestReact(Module, "components/blog/ClientTiptapViewer.tsx"));
});
