interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-dark-border/60 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-surface p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-px flex-1" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mt-5 border-t border-dark-border pt-4">
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  );
}
