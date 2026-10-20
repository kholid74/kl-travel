import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder while the browser database loads (dashboard data is client-only). */
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "detail" | "overview" }) {
  return (
    <div aria-busy="true" aria-label="Memuat data">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      {variant === "overview" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : variant === "detail" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-lg lg:col-span-2" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      ) : (
        <>
          <Skeleton className="mt-8 h-9 w-full max-w-xl" />
          <Skeleton className="mt-4 h-[420px] rounded-lg" />
        </>
      )}
    </div>
  )
}

export function NotFoundPanel({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed border-line-strong/60 bg-card px-6 text-center">
      <p className="text-base font-semibold text-text-strong">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
