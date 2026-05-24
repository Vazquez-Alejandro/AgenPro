export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/5 light:bg-black/5 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}
