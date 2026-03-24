import { describe, it, expect } from "vitest";
import { sanitizeEditorContent } from "../lib/sanitize";

describe("sanitizeEditorContent", () => {
  it("returns null or empty for falsey input", () => {
    expect(sanitizeEditorContent("")).toBe("");
    expect(sanitizeEditorContent(null as any)).toBe(null);
  });

  it("keeps allowed tags", () => {
    const dirty = "<h1>Title</h1><p>Paragraph with <b>bold</b> and <i>italics</i>.</p>";
    // sanitize-html might add a newline or normalize, but for simple stuff it should be exact
    expect(sanitizeEditorContent(dirty)).toBe(dirty);
  });

  it("removes disallowed tags", () => {
    const dirty = "<div>Safe</div><script>alert('xss')</script>";
    expect(sanitizeEditorContent(dirty)).toBe("<div>Safe</div>");
  });

  it("removes disallowed attributes like onclick", () => {
    const pWithOnclick = '<p onclick="alert(1)">Text</p>';
    expect(sanitizeEditorContent(pWithOnclick)).toBe("<p>Text</p>");
  });

  it("allows specific styles", () => {
    const styled = '<p style="text-align: center; color: #ff0000; background-color: rgb(255, 255, 255)">Styled</p>';
    const result = sanitizeEditorContent(styled);
    // sanitize-html normalizes style strings (removes spaces after colons)
    expect(result).toContain("text-align:center");
    expect(result).toContain("color:#ff0000");
    expect(result).toContain("background-color:rgb(255, 255, 255)");
  });

  it("removes disallowed styles", () => {
    const dirtyStyle = '<p style="position: absolute; top: 0; text-align: center">Dirty</p>';
    const sanitized = sanitizeEditorContent(dirtyStyle);
    expect(sanitized).toContain("text-align:center");
    expect(sanitized).not.toContain("position:absolute");
    expect(sanitized).not.toContain("top:0");
  });

  it("allows YouTube and Vimeo iframes", () => {
    const youtube = '<iframe src="https://www.youtube.com/embed/123" width="560" height="315"></iframe>';
    const vimeo = '<iframe src="https://player.vimeo.com/video/123"></iframe>';
    expect(sanitizeEditorContent(youtube)).toContain("www.youtube.com");
    expect(sanitizeEditorContent(vimeo)).toContain("player.vimeo.com");
  });

  it("removes unknown iframes (src becomes empty)", () => {
    const evil = '<iframe src="https://evil.com/xss"></iframe>';
    // sanitize-html removes the src but keeps the tag if allowed
    expect(sanitizeEditorContent(evil)).toBe("<iframe></iframe>");
  });

  it("allows img tags with src and alt", () => {
    const img = '<img src="https://example.com/image.jpg" alt="Description" class="my-img" />';
    const result = sanitizeEditorContent(img);
    expect(result).toContain('src="https://example.com/image.jpg"');
    expect(result).toContain('alt="Description"');
    expect(result).toContain('class="my-img"');
  });

  it("handles complex combinations of allowed features", () => {
    const dirty = `
      <h2 style="text-align: right">Heading</h2>
      <p>Click <a href="https://example.com" target="_blank">here</a></p>
      <u class="underline">Underline</u>
      <s class="strike">Strike</s>
      <del>Deleted</del>
      <img src="data:image/png;base64,123" />
    `;
    const result = sanitizeEditorContent(dirty);
    expect(result).toContain('style="text-align:right"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('<u class="underline">');
    expect(result).toContain('<s class="strike">');
    expect(result).toContain('<del>');
    // data URIs are not allowed by default allowedSchemes
    expect(result).toContain('<img />');
  });
});
