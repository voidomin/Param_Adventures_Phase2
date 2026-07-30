export default function ExperienceDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="relative aspect-[16/9] md:aspect-auto md:h-[75vh] lg:h-[80vh] w-full bg-muted animate-pulse" />

      <div className="max-w-7xl mx-auto px-4 mt-6 md:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main content column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Title + meta */}
          <div className="space-y-3">
            <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
            <div className="flex gap-4">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            </div>
          </div>

          {/* Sticky nav tabs */}
          <div className="flex gap-3 border-b border-border pb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>

          {/* Overview paragraph */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          </div>

          {/* Itinerary rows */}
          <div className="space-y-4">
            <div className="h-6 w-40 rounded bg-muted animate-pulse" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border p-5 space-y-2">
                <div className="h-5 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-4 w-full rounded bg-muted animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar booking card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-border p-6 space-y-4">
            <div className="h-7 w-1/2 rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-12 w-full rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
