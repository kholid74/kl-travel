"use client"

import type { Destination } from "@/domain/entities"
import { formatDate } from "@/lib/format"
import { ChipToggle } from "@/components/shared/choice"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { DURATION_BUCKETS, PRICE_BUCKETS, type DurationBucket, type PackageFilters, type PriceBucket, type TypeFilter } from "../filters"

const TYPE_OPTIONS: { value: TypeFilter | null; label: string }[] = [
  { value: null, label: "Semua" },
  { value: "open", label: "Open Trip" },
  { value: "private", label: "Private Trip" },
  { value: "custom", label: "Custom Trip" },
]

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-border pt-5">
      <legend className="float-left mb-3 w-full text-sm font-semibold text-ocean-900">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

/** Shared by the desktop sidebar and the mobile filter sheet. */
export function PackageFilterPanel({
  filters,
  onChange,
  destinations,
  packageCountByDestination,
  months,
}: {
  filters: PackageFilters
  onChange: (next: PackageFilters) => void
  destinations: Destination[]
  packageCountByDestination: Map<string, number>
  /** Months with bookable open-trip departures; null while live data loads. */
  months: string[] | null
}) {
  const toggleDestination = (slug: string, on: boolean) =>
    onChange({ ...filters, destinasi: on ? [...filters.destinasi, slug] : filters.destinasi.filter((s) => s !== slug) })

  return (
    <div className="space-y-6">
      <Group title="Jenis trip">
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((option) => (
            <ChipToggle
              key={option.label}
              pressed={filters.jenis === option.value}
              onPressedChange={() => onChange({ ...filters, jenis: option.value })}
            >
              {option.label}
            </ChipToggle>
          ))}
        </div>
      </Group>

      <Group title="Destinasi">
        <ul className="space-y-1">
          {destinations.map((d) => {
            const id = `filter-dst-${d.slug}`
            const count = packageCountByDestination.get(d.id) ?? 0
            return (
              <li key={d.id} className="flex items-center gap-3 py-1">
                <Checkbox
                  id={id}
                  checked={filters.destinasi.includes(d.slug)}
                  onCheckedChange={(checked) => toggleDestination(d.slug, checked === true)}
                />
                <label htmlFor={id} className="flex flex-1 cursor-pointer items-center justify-between text-sm">
                  {d.name}
                  <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </Group>

      <Group title="Durasi">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DURATION_BUCKETS) as DurationBucket[]).map((key) => (
            <ChipToggle
              key={key}
              pressed={filters.durasi === key}
              onPressedChange={(on) => onChange({ ...filters, durasi: on ? key : null })}
            >
              {DURATION_BUCKETS[key].label}
            </ChipToggle>
          ))}
        </div>
      </Group>

      <Group title="Harga per orang">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRICE_BUCKETS) as PriceBucket[]).map((key) => (
            <ChipToggle key={key} pressed={filters.harga === key} onPressedChange={(on) => onChange({ ...filters, harga: on ? key : null })}>
              {PRICE_BUCKETS[key].label}
            </ChipToggle>
          ))}
        </div>
      </Group>

      <Group title="Bulan keberangkatan">
        <p className="-mt-1 mb-3 text-xs text-muted-foreground">Untuk open trip. Private trip mengikuti tanggal pilihan Anda.</p>
        {months === null ? (
          <div className="flex gap-2" aria-busy="true">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        ) : months.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada jadwal yang dibuka.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {months.map((month) => (
              <ChipToggle
                key={month}
                pressed={filters.bulan === month}
                onPressedChange={(on) => onChange({ ...filters, bulan: on ? month : null })}
              >
                {formatDate(`${month}-01`, "month-year")}
              </ChipToggle>
            ))}
          </div>
        )}
      </Group>
    </div>
  )
}
