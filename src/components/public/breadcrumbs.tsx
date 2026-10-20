import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function Breadcrumbs({ items, className }: { items: { label: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn(last && "font-medium text-foreground")}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
