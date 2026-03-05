"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface RichTextRendererProps {
  content: object;
}

export default function RichTextRenderer({
  content,
}: Readonly<RichTextRendererProps>) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className="prose prose-lg md:prose-xl dark:prose-invert max-w-none focus-within:outline-none"
    />
  );
}
