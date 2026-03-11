"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export function ExperienceSkeleton() {
  const dummyItems = ["skele-1", "skele-2", "skele-3"];
  return (
    <div className="grid gap-4">
      {dummyItems.map((id) => (
        <div
          key={id}
          className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center"
        >
          <div className="flex-1 space-y-4 w-full">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto pt-4 md:pt-0 border-t border-border md:border-none">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
