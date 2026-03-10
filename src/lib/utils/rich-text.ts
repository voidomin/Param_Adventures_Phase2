export function getPlainTextFromJSON(json: any): string {
  if (!json?.content) return "";
  
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
