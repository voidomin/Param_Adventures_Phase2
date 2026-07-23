"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ExperiencesError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-black text-foreground mb-2">
        Failed to load experiences
      </h2>
      <p className="text-foreground/60 mb-8 max-w-md">
        We couldn&apos;t load the experiences. Please try again.
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-bold text-foreground hover:bg-foreground/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Go Home
        </Link>
      </div>
    </div>
  );
}
