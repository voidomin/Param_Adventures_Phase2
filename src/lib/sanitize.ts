import sanitizeHtml from "sanitize-html";

const allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
  "img",
  "iframe",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "u",
  "s",
  "del",
];

const allowedAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  "*": ["style", "class"],
  img: ["src", "alt", "title", "width", "height", "class", "style"],
  iframe: [
    "src",
    "width",
    "height",
    "allowfullscreen",
    "allow",
    "frameborder",
    "class",
    "style",
  ],
  a: ["href", "name", "target", "rel"],
};

const allowedStyles = {
  "*": {
    "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    color: [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
    "background-color": [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
  },
};

/**
 * Sanitizes raw HTML output from the rich text editor before storing it in the database.
 * This prevents Stored XSS attacks.
 */
export function sanitizeEditorContent(dirtyHTML: string): string {
  if (!dirtyHTML) return dirtyHTML;

  return sanitizeHtml(dirtyHTML, {
    allowedTags,
    allowedAttributes,
    allowedStyles,
    allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}
