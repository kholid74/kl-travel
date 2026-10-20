import { FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"

/** Inline reminder that an action or form is simulated. */
export function DemoNotice({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-md bg-sand-100 px-3 py-2 text-xs text-sand-800", className)}>
      <FlaskConical aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <span>{children ?? "Mode demo: gunakan data fiktif. Data hanya tersimpan di browser ini."}</span>
    </p>
  )
}

export function SimulatedTag({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-sm bg-sand-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-sand-800 uppercase", className)}>
      Simulasi
    </span>
  )
}
