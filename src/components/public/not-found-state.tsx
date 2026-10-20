import Link from "next/link"
import { Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

/** In-page "not found" for slugs resolved in the browser (ADR-0003). */
export function NotFoundState({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string
  description: string
  backHref: string
  backLabel: string
}) {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <Compass className="size-10 text-ink-400" strokeWidth={1.25} aria-hidden="true" />
      <h1 className="mt-6 font-display text-display-md text-ocean-900">{title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{description}</p>
      <Button asChild size="lg" className="mt-8">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  )
}
