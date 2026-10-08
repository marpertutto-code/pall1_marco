import { Skeleton } from "@/components/ui/empty-state";

/**
 * Scheletro per le pagine interne: intestazione + o una lista di righe o una
 * pila di riquadri. Il `loading.tsx` generico di `(app)` è quello della home,
 * quindi ogni sezione ne ha uno suo per evitare salti di layout.
 */
export function PageSkeleton({ blocks = 2, rows = 0 }: { blocks?: number; rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      {rows > 0 ? (
        <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: blocks }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-card" />
          ))}
        </div>
      )}
    </div>
  );
}
