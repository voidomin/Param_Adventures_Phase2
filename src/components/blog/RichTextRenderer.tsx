"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";

interface RichTextRendererProps {
  content: object;
}

export default function RichTextRenderer({
  content,
}: Readonly<RichTextRendererProps>) {
  // Normalize content for Tiptap
  // Tiptap expects either a string (HTML) or a JSON object (Prosemirror document)
  const normalizedContent =
    typeof content === "object" &&
    content !== null &&
    "html" in content &&
    (content as { html?: unknown }).html !== undefined
      ? (content as { html: object }).html
      : content;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Youtube.configure({
        inline: false,
        HTMLAttributes: {
          class: "w-full aspect-video rounded-xl my-8",
        },
      }),
    ],
    content: normalizedContent,
    editable: false,
    immediatelyRender: false,
  });

  // Keep editor content in sync with props
  useEffect(() => {
    if (editor && normalizedContent) {
      editor.commands.setContent(normalizedContent);
    }
  }, [editor, normalizedContent]);

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className="prose prose-lg md:prose-xl dark:prose-invert max-w-none focus-within:outline-none"
    />
  );
}
