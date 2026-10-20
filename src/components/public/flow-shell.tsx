"use client"

import Link from "next/link"
import { useEffect, useRef, type ReactNode } from "react"
import { AnimatePresence, m } from "motion/react"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { StepProgress } from "@/components/shared/step-progress"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EASE_OUT_SOFT } from "./motion"

/**
 * Shared frame for the booking and request wizards: back link, title, step progress,
 * the active step (animated), and a sticky summary column on desktop.
 */
export function FlowShell({
  backHref,
  backLabel,
  eyebrow,
  title,
  steps,
  current,
  summary,
  children,
}: {
  backHref: string
  backLabel: string
  eyebrow: string
  title: string
  steps: string[]
  current: number
  summary: ReactNode
  children: ReactNode
}) {
  const headingRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  // Move focus to the new step so keyboard and screen reader users start at its heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.scrollIntoView({ block: "start" })
    headingRef.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true })
  }, [current])

  return (
    <div className="container-page pt-8 pb-28 md:pt-10 lg:pb-24">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> {backLabel}
      </Link>
      <p className="mt-6 eyebrow text-lagoon-700">{eyebrow}</p>
      <h1 className="mt-2 font-display text-display-md text-balance text-ocean-900">{title}</h1>
      <StepProgress steps={steps} current={current} className="mt-8" />

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div ref={headingRef} className="scroll-mt-28 lg:col-span-7">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={current}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: EASE_OUT_SOFT }}
            >
              {children}
            </m.div>
          </AnimatePresence>
        </div>
        <aside aria-label="Ringkasan" className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">{summary}</div>
        </aside>
      </div>
    </div>
  )
}

/** Step heading that receives focus when the step changes. */
export function StepHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 data-step-heading tabIndex={-1} className="text-heading font-semibold text-ocean-900 outline-none">
        {title}
      </h2>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  )
}

/** Back / next buttons; a sticky bar on phones and tablets. */
export function StepActions({
  onBack,
  nextLabel = "Lanjut",
  nextType = "button",
  onNext,
  pending = false,
  disabled = false,
}: {
  onBack?: () => void
  nextLabel?: string
  nextType?: "button" | "submit"
  onNext?: () => void
  pending?: boolean
  disabled?: boolean
}) {
  return (
    <div
      data-mobile-cta=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-3 lg:h-auto lg:max-w-none lg:px-0">
        {onBack ? (
          <Button type="button" variant="ghost" size="lg" onClick={onBack} disabled={pending}>
            <ArrowLeft aria-hidden="true" /> Kembali
          </Button>
        ) : (
          <span />
        )}
        <Button type={nextType} size="lg" onClick={onNext} disabled={pending || disabled} className="min-w-40">
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" /> Mengirim…
            </>
          ) : (
            <>
              {nextLabel} <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/** White summary card used in the aside of every flow. */
export function SummaryCard({ children }: { children: ReactNode }) {
  return <div className="rounded-[4px] border border-border bg-card p-5 md:p-6">{children}</div>
}

export function FlowSkeleton() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Memuat formulir">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-6 h-10 w-2/3 max-w-xl" />
      <Skeleton className="mt-8 h-8 w-full max-w-2xl" />
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <Skeleton className="h-80 lg:col-span-7" />
        <Skeleton className="h-64 lg:col-span-5" />
      </div>
    </div>
  )
}

export function ConfirmationSkeleton() {
  return (
    <div className="container-page max-w-4xl py-12" aria-busy="true" aria-label="Memuat">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-4 h-12 w-2/3" />
      <Skeleton className="mt-8 h-48" />
      <Skeleton className="mt-6 h-64" />
    </div>
  )
}
