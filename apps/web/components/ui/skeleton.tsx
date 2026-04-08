interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
}

export function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-muted rounded';
  const variantClass = variant === 'circle' ? 'rounded-full' : variant === 'rect' ? 'rounded-xl' : 'rounded';

  return <div className={`${baseClass} ${variantClass} ${className}`} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-10 flex-1" variant="rect" />
        <Skeleton className="h-10 flex-1" variant="rect" />
      </div>
    </div>
  );
}
