"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { demoJourney, journeyVisitFor, JOURNEY_STEPS } from "@/services/demo-service"
import { useDatabase } from "@/stores/db-store"
import { useUiStore } from "@/stores/ui-store"

/** Records visits to journey pages. Waits for the persisted UI state so it never overwrites it. */
export function JourneyTracker() {
  const pathname = usePathname()
  const key = journeyVisitFor(pathname)
  useEffect(() => {
    if (!key) return
    const record = () => useUiStore.getState().recordVisit(key, new Date().toISOString())
    if (useUiStore.persist.hasHydrated()) record()
    else return useUiStore.persist.onFinishHydration(record)
  }, [key, pathname])
  return null
}

/** Journey steps with their live completion; null until the demo data is loaded. */
export function useDemoJourney() {
  const { db } = useDatabase()
  const visits = useUiStore((state) => state.journeyVisits)
  return useMemo(() => (db ? demoJourney(db, visits) : null), [db, visits])
}

/** Compact checklist for the demo panel popover. */
export function DemoJourneyList({ onNavigate }: { onNavigate?: () => void }) {
  const steps = useDemoJourney()
  const done = steps?.filter((s) => s.done).length ?? 0
  const next = steps?.find((s) => !s.done)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold text-foreground">Panduan demo</p>
        <p className="text-xs text-muted-foreground tabular-nums">{steps ? `${done}/${steps.length} selesai` : ""}</p>
      </div>
      <ol className="mt-2 space-y-1">
        {(steps ?? JOURNEY_STEPS.map((s) => ({ ...s, done: false }))).map((step, index) => (
          <li key={step.key}>
            <Link
              href={step.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-md px-1.5 py-1 text-[0.8125rem] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                step.key === next?.key ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              <StepMark done={step.done} index={index} />
              <span className={cn(step.done && "line-through decoration-muted-foreground/50")}>{step.title}</span>
              <span className="sr-only">{step.done ? "(selesai)" : ""}</span>
            </Link>
          </li>
        ))}
      </ol>
      {steps && !next && <p className="mt-2 text-xs text-tone-success">Semua langkah selesai. Reset data untuk mengulang dari awal.</p>}
    </div>
  )
}

function StepMark({ done, index, large = false }: { done: boolean; index: number; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums",
        large ? "size-7 text-xs" : "size-5 text-[0.625rem]",
        done ? "border-tone-success bg-tone-success text-white" : "border-line-strong/50 text-muted-foreground",
      )}
    >
      {done ? <Check className={large ? "size-4" : "size-3"} strokeWidth={3} /> : index + 1}
    </span>
  )
}

/** The journey on the /demo page, ticked live. Renders unticked on the server. */
export function DemoJourneyGrid() {
  const steps = useDemoJourney()
  const list = steps ?? JOURNEY_STEPS.map((s) => ({ ...s, done: false }))
  const done = list.filter((s) => s.done).length
  return (
    <>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Sekitar sepuluh menit untuk melihat satu booking bergerak dari website hingga laporan. Langkah dicentang otomatis dari data demo Anda
        {steps && <span className="font-medium text-foreground"> · {done} dari {list.length} selesai</span>}.
      </p>
      <ol className="mt-10 grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
        {list.map((step, index) => (
          <li key={step.key} className={cn("border-t pt-5", step.done ? "border-tone-success" : "border-ocean-900/80")}>
            <div className="flex items-center justify-between">
              <span aria-hidden="true" className="font-display text-3xl text-sand-600 tabular-nums">
                0{index + 1}
              </span>
              {step.done && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-tone-success">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> Selesai
                </span>
              )}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-ocean-900">{step.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            <Link href={step.href} className="mt-3 inline-block text-sm font-semibold text-lagoon-700 underline-offset-4 hover:underline">
              {step.cta}
            </Link>
          </li>
        ))}
      </ol>
    </>
  )
}
