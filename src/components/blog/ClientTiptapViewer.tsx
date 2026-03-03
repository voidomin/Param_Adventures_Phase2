"use client";

import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("@/components/blog/TiptapEditor"), {
  ssr: false,
});

export default function ClientTiptapViewer({ content }: { content: object }) {
  return (
    <TiptapEditor content={content} onChange={() => {}} editable={false} />
  );
}
