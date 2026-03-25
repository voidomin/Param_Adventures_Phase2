import { describe, it, expect } from "vitest";
import { sanitizeEditorContent } from "@/lib/sanitize";

describe("sanitizeEditorContent", () => {
  it("returns an empty string if input is falsy", () => {
    expect(sanitizeEditorContent("")).toBe("");
  });

  it("allows safe tags and attributes", () => {
    const safeHtml = `<p class="text-lg">Hello <strong>world</strong>!</p><a href="https://example.com" target="_blank">Link</a>`;
    const result = sanitizeEditorContent(safeHtml);
    expect(result).toBe(safeHtml);
  });

  it("removes dangerous tags like <script>", () => {
    const maliciousHtml = `<p>Safe</p><script>alert('xss')</script>`;
    const result = sanitizeEditorContent(maliciousHtml);
    expect(result).toBe("<p>Safe</p>");
  });

  it("removes dangerous event handler attributes", () => {
    const maliciousHtml = `<button onerror="alert('xss')" onclick="hack()">Click me</button>`;
    const result = sanitizeEditorContent(maliciousHtml);
    // button is allowed by default in sanitize-html, but onclick/onerror are stripped
    // Actually, button might not be allowed by default. Let's strictly check if the bad attributes are removed.
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onerror");
  });

  it("removes javascript: protocols in links", () => {
    const maliciousHtml = `<a href="javascript:alert('xss')">Bad Link</a>`;
    const result = sanitizeEditorContent(maliciousHtml);
    // sanitize-html defaults will strip javascript: hrefs
    expect(result).not.toContain("javascript:");
    expect(result).toBe(`<a>Bad Link</a>`);
  });

  it("allows specific iframe sources (youtube/vimeo)", () => {
    const validIframe = `<iframe src="https://www.youtube.com/embed/123" width="500" height="300" class="video" allowfullscreen="true"></iframe>`;
    const result = sanitizeEditorContent(validIframe);
    expect(result).toContain('src="https://www.youtube.com/embed/123"');
    
    const invalidIframe = `<iframe src="https://evil.com/video" width="500"></iframe>`;
    const resultInvalid = sanitizeEditorContent(invalidIframe);
    expect(resultInvalid).not.toContain('src="https://evil.com/video"');
  });

  it("allows inline styles that are explicitly approved", () => {
    const styledHtml = `<span style="color:#ff0000;text-align:center;">Styled</span>`;
    const result = sanitizeEditorContent(styledHtml);
    expect(result).toContain('style="color:#ff0000;text-align:center"');
    
    // Disallowed styles are stripped
    const unapprovedStyleHtml = `<span style="position:absolute;top:0;color:#ff0000;">Bad Style</span>`;
    const resultUnapproved = sanitizeEditorContent(unapprovedStyleHtml);
    expect(resultUnapproved).not.toContain('position:absolute');
    expect(resultUnapproved).toContain('color:#ff0000');
  });
});
