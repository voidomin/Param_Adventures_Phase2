export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="h-[45vh] min-h-[300px] bg-muted animate-pulse" />

      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        {/* Meta skeleton */}
        <div className="flex items-center gap-4 pb-6 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
          <div className="ml-auto h-3 w-20 rounded bg-muted animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          {["line-1", "line-2", "line-3", "line-4", "line-5", "line-6", "line-7", "line-8"].map((lineKey, i) => (
            <div
              key={lineKey}
              className="h-4 rounded bg-muted animate-pulse"
              style={{ width: `${75 + (i % 4) * 8}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
