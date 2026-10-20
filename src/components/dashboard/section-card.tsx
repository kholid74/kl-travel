import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** White panel with an optional header row (title, description, action). */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section id={id} aria-labelledby={title && id ? `${id}-title` : undefined} className={cn("min-w-0 rounded-lg border border-line bg-card shadow-xs", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 id={id ? `${id}-title` : undefined} className="text-[0.9375rem] font-semibold text-text-strong">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  )
}

/** Label/value grid used in detail pages; `stacked` puts labels above values for narrow sidebars. */
export function DescriptionList({
  items,
  className,
  stacked = false,
}: {
  items: { label: string; value: ReactNode; hidden?: boolean }[]
  className?: string
  stacked?: boolean
}) {
  const visible = items.filter((item) => !item.hidden)
  if (stacked) {
    return (
      <dl className={cn("grid gap-3 text-sm", className)}>
        {visible.map((item) => (
          <div key={item.label}>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 min-w-0 font-medium [overflow-wrap:anywhere] text-text-strong">{item.value}</dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <dl className={cn("grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-2.5 text-sm", className)}>
      {visible.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 font-medium [overflow-wrap:anywhere] text-text-strong">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
