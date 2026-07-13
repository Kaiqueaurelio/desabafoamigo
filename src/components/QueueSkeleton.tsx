/** Skeleton para a lista de fila enquanto carrega — mesmo layout dos cards reais. */
export function QueueSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-56 animate-pulse rounded bg-muted/70" />
              <div className="h-3 w-40 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="h-9 w-24 shrink-0 animate-pulse rounded-lg bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
