"use client";

import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("@/components/blog/TiptapEditor"), {
  ssr: false,
});

export default function ClientTiptapViewer({ content }: Readonly<{ content: any }>) {
  return (
    <TiptapEditor content={content} onChange={() => {}} editable={false} />
  );
}
