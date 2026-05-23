import { describe, it, expect } from "vitest";
import { getPlainTextFromJSON } from "@/lib/utils/rich-text";

describe("getPlainTextFromJSON", () => {
  it("returns an empty string for null/undefined", () => {
    expect(getPlainTextFromJSON(null)).toBe("");
    expect(getPlainTextFromJSON(undefined)).toBe("");
  });

  it("handles plain string input", () => {
    expect(getPlainTextFromJSON("  Hello World  ")).toBe("Hello World");
  });

  it("extracts text from HTML format", () => {
    const htmlObj = { html: "<p>Hello <b>World</b>!</p>" };
    // getPlainTextFromJSON adds a space for each tag:
    // "<p>" -> " "
    // "Hello " -> "Hello "
    // "<b>" -> " "
    // "World" -> "World"
    // "</b>" -> " "
    // "!" -> "!"
    // "</p>" -> " "
    // Result before trim: " Hello  World   ! "
    // result.replaceAll(/\s+/g, " ").trim() -> "Hello World !"
    expect(getPlainTextFromJSON(htmlObj)).toBe("Hello World !");
  });

  it("handles complex HTML with multiple tags", () => {
    const complexHtml = { html: "<div><h1>Title</h1><p>Paragraph 1</p><br/>Text</div>" };
    const result = getPlainTextFromJSON(complexHtml);
    expect(result).toBe("Title Paragraph 1 Text");
  });

  it("extracts text from Tiptap JSON format", () => {
    const tiptapJson = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Welcome" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This is a " },
            { type: "text", marks: [{ type: "bold" }], text: "test" },
            { type: "text", text: "." },
          ],
        },
      ],
    };
    // extractText adds a space for paragraph/heading types.
    // heading: text "Welcome", then space.
    // paragraph: text "This is a ", then "test", then ".", then space.
    // Result: "Welcome This is a test. " -> trimmed "Welcome This is a test."
    expect(getPlainTextFromJSON(tiptapJson)).toBe("Welcome This is a test.");
  });

  it("handles nested Tiptap JSON", () => {
    const nestedJson = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Nested ",
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Content" }],
            },
          ],
        },
      ],
    };
    expect(getPlainTextFromJSON(nestedJson)).toBe("Nested Content");
  });

  it("handles empty Tiptap JSON", () => {
    expect(getPlainTextFromJSON({ type: "doc", content: [] })).toBe("");
  });

  it("returns an empty string for invalid Tiptap JSON", () => {
    expect(getPlainTextFromJSON({ type: "doc" })).toBe("");
    expect(getPlainTextFromJSON({ type: "doc", content: "not an array" } as any)).toBe("");
  });
});
