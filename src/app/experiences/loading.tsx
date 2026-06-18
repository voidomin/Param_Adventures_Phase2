export default function ExperiencesLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="h-48 bg-muted animate-pulse" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter bar skeleton */}
        <div className="flex gap-4 mb-8">
          <div className="h-10 w-32 rounded-xl bg-muted animate-pulse" />
          <div className="h-10 w-40 rounded-xl bg-muted animate-pulse" />
          <div className="h-10 flex-1 rounded-xl bg-muted animate-pulse" />
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="h-48 bg-muted animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
                </div>
                <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
