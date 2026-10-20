import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/** Title row of every dashboard page: optional back link, title, meta badges, actions. */
export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { href: string; label: string }
  meta?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-page-title font-semibold text-balance text-text-strong">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
