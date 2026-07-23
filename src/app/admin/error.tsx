"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function AdminError({
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
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-black text-foreground mb-2">
        Admin Panel Error
      </h2>
      <p className="text-foreground/60 mb-8 max-w-md">
        Something went wrong in the admin panel. Your data is safe.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}
