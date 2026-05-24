import Link from "next/link";
import { Mountain, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        <Mountain className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-4xl font-black text-foreground mb-2">404</h1>
      <h2 className="text-xl font-bold text-foreground/80 mb-2">
        Trail Not Found
      </h2>
      <p className="text-foreground/60 mb-8 max-w-md">
        Looks like this path leads nowhere. The page you&apos;re looking for
        doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Base Camp
      </Link>
    </div>
  );
}
