import { cn } from "@/lib/utils"

/** Checklist progress. Labelled for assistive tech; the visible text sits next to it. */
export function ProgressBar({ value, label, className, tone = "default" }: { value: number; label: string; className?: string; tone?: "default" | "danger" | "success" }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-[width]", tone === "danger" ? "bg-tone-danger" : tone === "success" ? "bg-tone-success" : "bg-lagoon-600")}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
