import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mountain } from "lucide-react";

export const STATUS_COLORS: Record<string, string> = {
  UPCOMING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ACTIVE: "bg-green-500/10 text-green-400 border-green-500/20",
  TREK_STARTED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  TREK_ENDED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  COMPLETED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DashboardNav() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/60 hover:text-primary transition-colors hover:gap-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}

export function DashboardLoader() {
  return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
    </div>
  );
}

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
}

export function DashboardEmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-16 text-center">
      <Mountain className="w-12 h-12 mx-auto mb-4 text-foreground/20" />
      <h3 className="text-lg font-bold text-foreground mb-1">
        {title}
      </h3>
      <p className="text-foreground/50">
        {description}
      </p>
    </div>
  );
}
