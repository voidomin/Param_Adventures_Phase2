"use client";

import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: Readonly<SkeletonProps>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-foreground/10",
        className
      )}
      {...props}
    />
  );
}
