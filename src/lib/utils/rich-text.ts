export interface RichTextNode {
  type?: string;
  text?: string;
  content?: RichTextNode[];
  html?: string;
}

export function getPlainTextFromJSON(json: RichTextNode | string | null | undefined): string {
  if (!json) return "";
  
  // Handle string content
  if (typeof json === "string") return json.trim();

  // Handle { html: "..." } format from seed data
  if (typeof json === "object" && json.html && typeof json.html === "string") {
    // ReDoS-safe linear-time HTML stripping (O(n))
    let result = "";
    let insideTag = false;
    const html = json.html;
    
    for (const char of html) {
      if (char === "<") {
        insideTag = true;
      } else if (char === ">") {
        insideTag = false;
        result += " "; // Replace tag with space to prevent word merging
      } else if (!insideTag) {
        result += char;
      }
    }
    
    // Normalize whitespace safely
    return result.replaceAll(/\s+/g, " ").trim();
  }

  // Handle Tiptap JSON format
  if (typeof json !== "object" || !json.content || !Array.isArray(json.content)) return "";
  
  let text = "";
  
  const extractText = (node: RichTextNode) => {
    if (node.text) {
      text += node.text;
    }
    if (node.content) {
      node.content.forEach(extractText);
    }
    // Add space for block elements to avoid merging words
    if (node.type === "paragraph" || node.type === "heading") {
      text += " ";
    }
  };

  json.content.forEach(extractText);
  return text.trim();
}
