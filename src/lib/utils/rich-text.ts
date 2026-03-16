export function getPlainTextFromJSON(json: any): string {
  if (!json) return "";
  
  // Handle string content
  if (typeof json === "string") return json.trim();

  // Handle { html: "..." } format from seed data
  if (json.html && typeof json.html === "string") {
    // Basic HTML stripping for preview
    return json.html.replaceAll(/<[^>]*>/g, " ").replaceAll(/\s+/g, " ").trim();
  }

  // Handle Tiptap JSON format
  if (!json.content || !Array.isArray(json.content)) return "";
  
  let text = "";
  
  const extractText = (node: any) => {
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
