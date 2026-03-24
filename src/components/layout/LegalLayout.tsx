import * as React from "react";

interface LegalLayoutProps {
  readonly title: string;
  readonly updateDate?: string;
  readonly children: React.ReactNode;
}

export default function LegalLayout({ 
  title, 
  updateDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }), 
  children 
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-4 prose prose-neutral dark:prose-invert text-foreground">
        <h1 className="text-4xl font-black font-heading mb-8 text-foreground">
          {title}
        </h1>

        <p className="text-lg text-foreground/70 mb-8">
          Last updated: {updateDate}
        </p>

        {children}
      </div>
    </div>
  );
}
