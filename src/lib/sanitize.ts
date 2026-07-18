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

export function sanitizeTiptapJson(node: unknown): unknown {
  if (!node || typeof node !== "object") {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(sanitizeTiptapJson);
  }

  const nodeObj = node as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(nodeObj)) {
    if (key === "attrs" && val && typeof val === "object") {
      const attrsObj = val as Record<string, unknown>;
      const sanitizedAttrs: Record<string, unknown> = {};
      for (const [attrKey, attrVal] of Object.entries(attrsObj)) {
        if ((attrKey === "src" || attrKey === "href") && typeof attrVal === "string") {
          const trimmed = attrVal.trim();
          const isJavaScript = /^\s*javascript:/i.test(trimmed);
          if (isJavaScript) {
            sanitizedAttrs[attrKey] = "";
          } else {
            sanitizedAttrs[attrKey] = trimmed;
          }
        } else {
          sanitizedAttrs[attrKey] = attrVal;
        }
      }
      sanitized[key] = sanitizedAttrs;
    } else {
      sanitized[key] = sanitizeTiptapJson(val);
    }
  }

  return sanitized;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeEditorContent(content: any): any {
  if (!content) return content;

  if (typeof content === "object") {
    return sanitizeTiptapJson(content);
  }

  if (typeof content === "string") {
    return sanitizeHtml(content, {
      allowedTags,
      allowedAttributes,
      allowedStyles,
      allowedIframeHostnames: ["www.youtube.com", "player.vimeo.com"],
      allowedSchemes: ["http", "https", "mailto", "tel"],
      allowedSchemesByTag: { iframe: ["https"] },
    });
  }

  return content;
}

