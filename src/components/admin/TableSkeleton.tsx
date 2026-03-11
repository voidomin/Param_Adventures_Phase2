"use client";

import { Skeleton } from "@/components/ui/Skeleton";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: Readonly<TableSkeletonProps>) {
  // Use stable dummy arrays to avoid lint issues with index keys
  const colArray = Array.from({ length: columns }, (_, i) => `col-${i}`);
  const rowArray = Array.from({ length: rows }, (_, i) => `row-${i}`);

  return (
    <div className="w-full">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-foreground/[0.02]">
                {colArray.map((colId) => (
                  <th key={colId} className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rowArray.map((rowId) => (
                <tr key={rowId} className="border-b border-border last:border-0">
                  {colArray.map((colId) => (
                    <td key={`${rowId}-${colId}`} className="px-6 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
