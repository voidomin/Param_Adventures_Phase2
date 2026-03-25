import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RichTextRenderer from "@/components/blog/RichTextRenderer";
import { useEditor } from "@tiptap/react";

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(),
  EditorContent: ({ className }: { className?: string }) => (
    <div data-testid="editor-content" className={className} />
  ),
}));

vi.mock("@tiptap/starter-kit", () => ({ default: { name: "starter-kit" } }));
vi.mock("@tiptap/extension-image", () => ({ default: { name: "image" } }));
vi.mock("@tiptap/extension-youtube", () => ({
  default: {
    configure: vi.fn(() => ({ name: "youtube" })),
  },
}));

describe("RichTextRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when editor is not ready", () => {
    (useEditor as any).mockReturnValue(null);
    const { container } = render(
      <RichTextRenderer content={{ html: "<p>Hello</p>" }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders editor content and syncs html content", async () => {
    const setContent = vi.fn();
    (useEditor as any).mockReturnValue({
      commands: { setContent },
    });

    render(<RichTextRenderer content={{ html: "<p>Hello</p>" }} />);

    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    await waitFor(() => {
      expect(setContent).toHaveBeenCalledWith("<p>Hello</p>");
    });
  });

  it("syncs plain object content when html wrapper is absent", async () => {
    const setContent = vi.fn();
    const doc = { type: "doc", content: [{ type: "paragraph" }] };

    (useEditor as any).mockReturnValue({
      commands: { setContent },
    });

    render(<RichTextRenderer content={doc} />);

    await waitFor(() => {
      expect(setContent).toHaveBeenCalledWith(doc);
    });
  });
});
