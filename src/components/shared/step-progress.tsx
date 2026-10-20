import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/** Numbered progress for multi-step booking and inquiry flows. */
export function StepProgress({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <nav aria-label="Langkah" className={className}>
      <p className="mb-3 text-sm text-muted-foreground md:hidden">
        Langkah {current + 1} dari {steps.length}: <span className="font-semibold text-foreground">{steps[current]}</span>
      </p>
      <ol className="hidden items-center gap-3 md:flex">
        {steps.map((step, index) => {
          const done = index < current
          const active = index === current
          return (
            <li key={step} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn("text-sm", active ? "font-semibold text-foreground" : "text-muted-foreground")}>{step}</span>
              {index < steps.length - 1 && <span aria-hidden="true" className="h-px w-8 bg-border" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
