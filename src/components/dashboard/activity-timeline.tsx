import { Bot, User as UserIcon, UserRound } from "lucide-react"
import type { ActivityEvent, User } from "@/domain/entities"
import type { Table } from "@/domain/database"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export function actorName(event: Pick<ActivityEvent, "actor">, users: Table<User>): string {
  switch (event.actor.kind) {
    case "user":
      return users[event.actor.userId]?.name ?? "Tim"
    case "customer":
      return "Pelanggan"
    case "system":
      return "Sistem"
  }
}

/** Activity log for one entity (or the whole business), newest first. */
export function ActivityTimeline({ events, users, empty = "Belum ada aktivitas.", className }: { events: ActivityEvent[]; users: Table<User>; empty?: string; className?: string }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ol className={cn("relative space-y-4", className)}>
      {events.map((event, index) => {
        const Icon = event.actor.kind === "system" ? Bot : event.actor.kind === "customer" ? UserRound : UserIcon
        return (
          <li key={event.id} className="relative flex gap-3">
            {index < events.length - 1 && <span aria-hidden="true" className="absolute top-7 bottom-[-1rem] left-3 w-px bg-line" />}
            <span
              className={cn(
                "relative flex size-6 shrink-0 items-center justify-center rounded-full",
                event.actor.kind === "system" ? "bg-tone-neutral-bg text-tone-neutral" : event.actor.kind === "customer" ? "bg-tone-accent-bg text-tone-accent" : "bg-tone-info-bg text-tone-info",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm text-text-strong">{event.message}</p>
              <p className="mt-0.5 text-xs text-text-subtle">
                {actorName(event, users)} · <time dateTime={event.at}>{formatDateTime(event.at)}</time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
