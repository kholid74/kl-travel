import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

/** Eyebrow + display title + short description, with an optional "see all" link. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  link,
  tone = "light",
  align = "start",
  as: Heading = "h2",
  id,
  className,
}: {
  id?: string
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  link?: { href: string; label: string }
  tone?: "light" | "dark"
  align?: "start" | "center"
  as?: "h1" | "h2"
  className?: string
}) {
  const dark = tone === "dark"
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className={cn("eyebrow", dark ? "text-sand-300" : "text-lagoon-700")}>{eyebrow}</p>}
        <Heading id={id} className={cn("mt-3 font-display text-display-md text-balance", dark ? "text-ivory-50" : "text-ocean-900")}>{title}</Heading>
        {description && (
          <p className={cn("mt-4 text-body-lg text-pretty", dark ? "text-ivory-50/80" : "text-muted-foreground")}>{description}</p>
        )}
      </div>
      {link && (
        <Link
          href={link.href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline",
            dark ? "text-sand-300" : "text-lagoon-700",
          )}
        >
          {link.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
