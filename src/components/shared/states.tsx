import type { LucideIcon } from "lucide-react"
import { CloudOff, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <Icon aria-hidden="true" className="size-9 text-ink-400" strokeWidth={1.25} />
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = "Terjadi kesalahan",
  description = "Data tidak dapat dimuat. Silakan coba lagi.",
  action,
  className,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <CloudOff aria-hidden="true" className="size-9 text-tone-danger" strokeWidth={1.25} />
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
