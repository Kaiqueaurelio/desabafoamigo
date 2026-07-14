import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

/** Spinner inline com label acessível. */
export function InlineSpinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground" role="status" aria-live="polite">
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/** Skeleton para grades de métricas (cards KPI). */
export function MetricsGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton para tabelas (usada em listas de usuários). */
export function TableRowsSkeleton({ rows = 6, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-2 p-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-2">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {Array.from({ length: cols - 2 }).map((_, j) => (
            <Skeleton key={j} className="hidden h-8 w-20 rounded-md sm:block" />
          ))}
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton para listas de cards (denúncias, incidentes, plantão…). */
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-16 w-full rounded-lg" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
