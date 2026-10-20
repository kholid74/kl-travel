"use client"

import type { ReactNode } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ALL = "__semua"

/** Row of filters above a list; wraps on small screens. */
export function FilterBar({ children, onReset, active }: { children: ReactNode; onReset?: () => void; active?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {children}
      {onReset && active && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X aria-hidden="true" /> Reset filter
        </Button>
      )}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder, className }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-subtle" aria-hidden="true" />
      <Input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 bg-card pl-9" />
    </div>
  )
}

/** Select with an "all" option; the empty string means no filter. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  allLabel: string
  className?: string
}) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? "" : next)}>
      <SelectTrigger aria-label={label} size="sm" className={cn("h-9 min-w-36 bg-card", value && "border-ocean-800 text-text-strong", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Segmented control for alternate views (board/list, calendar/list). */
export function ViewToggle<V extends string>({ value, onChange, options, label }: { value: V; onChange: (value: V) => void; options: { value: V; label: string; icon: React.ComponentType<{ className?: string }> }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-card p-0.5">
      {options.map(({ value: option, label: optionLabel, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-[5px] px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === option ? "bg-ocean-800 text-white" : "text-text-muted hover:text-text-strong",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {optionLabel}
        </button>
      ))}
    </div>
  )
}
