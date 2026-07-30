import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Content-shaped loading placeholder for dashboard/manager/trek-lead list
 * views (a header, a row of stat cards, then a handful of list rows) --
 * same idea as the admin panel's ExperienceSkeleton/TableSkeleton, just
 * sized for the customer/staff dashboard's card-based layout instead of
 * admin's tables.
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-6 flex items-center gap-6">
            <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Content-shaped placeholder for a plain list view (no stat cards) -- the
 * dashboard blog list, manager/trek-lead trip lists.
 */
export function DashboardListSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300 py-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-6 flex items-center gap-6">
          <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Content-shaped placeholder for form-heavy dashboard pages (settings,
 * blog write/edit, trip detail) -- label/input bar pairs instead of a
 * bare spinner, so the page's general shape is visible while it loads.
 */
export function DashboardFormSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-11 w-32 rounded-xl" />
      </div>
    </div>
  );
}
