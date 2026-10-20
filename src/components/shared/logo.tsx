import { cn } from "@/lib/utils"

/** Horizon-and-wave mark used for the favicon and compact placements. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7", className)} fill="none">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 17.5h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 17.5a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M7.5 21.5c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Wordmark: display serif "NusaVista" + spaced caps "JOURNEY". */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.45rem] leading-none tracking-[-0.01em]">NusaVista</span>
          <span className="mt-0.5 text-[0.56rem] font-semibold tracking-[0.42em]">JOURNEY</span>
        </span>
      )}
      <span className="sr-only">NusaVista Journey</span>
    </span>
  )
}
