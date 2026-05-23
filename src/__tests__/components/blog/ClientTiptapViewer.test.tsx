import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ClientTiptapViewer from "@/components/blog/ClientTiptapViewer";

vi.mock("next/dynamic", () => ({
  default: () =>
    ({ content, editable }: { content: any; editable: boolean }) => (
      <div data-testid="dynamic-editor">
        <span data-testid="editable-flag">{String(editable)}</span>
        <span data-testid="content-value">{typeof content === "string" ? content : JSON.stringify(content)}</span>
      </div>
    ),
}));

describe("ClientTiptapViewer", () => {
  it("renders dynamic tiptap editor with read-only mode and content", () => {
    render(<ClientTiptapViewer content={{ html: "<p>Hello</p>" }} />);

    expect(screen.getByTestId("dynamic-editor")).toBeInTheDocument();
    expect(screen.getByTestId("editable-flag")).toHaveTextContent("false");
    expect(screen.getByTestId("content-value")).toHaveTextContent("<p>Hello</p>");
  });
});
