"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { ArrowRight, Compass, Search, SlidersHorizontal, X } from "lucide-react"
import { formatDate } from "@/lib/format"
import { TRIP_TYPE_LABEL } from "@/domain/labels"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { PackageCard } from "@/components/public/package-card"
import { EmptyState } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import type { PublicCatalog } from "@/services/queries/catalog"
import { availabilityLine } from "../availability"
import {
  activeFilterCount,
  applyFilters,
  DURATION_BUCKETS,
  EMPTY_FILTERS,
  parseFilters,
  PRICE_BUCKETS,
  serializeFilters,
  SORT_OPTIONS,
  type PackageFilters,
  type SortKey,
} from "../filters"
import { useAvailabilityMap, usePublicCatalog } from "../hooks/use-public-catalog"
import { PackageFilterPanel } from "./package-filter-panel"

/** Reads filters from the URL; must sit inside <Suspense> (useSearchParams). */
export function PackageExplorerRoute({ initialCatalog }: { initialCatalog: PublicCatalog }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const onChange = useCallback(
    (next: PackageFilters) => {
      const query = serializeFilters(next)
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname],
  )
  return <PackageExplorer initialCatalog={initialCatalog} filters={filters} onChange={onChange} />
}

/** Prerendered shell: the unfiltered catalog, replaced on hydration by the URL-aware view. */
export function PackageExplorerFallback({ initialCatalog }: { initialCatalog: PublicCatalog }) {
  return <PackageExplorer initialCatalog={initialCatalog} filters={EMPTY_FILTERS} onChange={() => {}} />
}

function PackageExplorer({
  initialCatalog,
  filters,
  onChange,
}: {
  initialCatalog: PublicCatalog
  filters: PackageFilters
  onChange: (next: PackageFilters) => void
}) {
  const { packages, destinations } = usePublicCatalog(initialCatalog)
  const availability = useAvailabilityMap(packages.map((p) => p.id))
  const [sheetOpen, setSheetOpen] = useState(false)
  const pushQuery = useCallback((q: string) => onChange({ ...filters, q }), [onChange, filters])
  const search = useUrlSearchInput(filters.q, pushQuery)

  // Results follow the search box immediately; the URL catches up after typing pauses.
  const result = useMemo(
    () => applyFilters(packages, destinations, availability, { ...filters, q: search.value.trim() }),
    [packages, destinations, availability, filters, search.value],
  )
  const destinationById = useMemo(() => new Map(destinations.map((d) => [d.id, d])), [destinations])
  const packageCountByDestination = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of packages) counts.set(p.destinationId, (counts.get(p.destinationId) ?? 0) + 1)
    return counts
  }, [packages])
  const months = useMemo(() => {
    if (!availability) return null
    const set = new Set<string>()
    for (const a of availability.values()) for (const o of a.options) if (o.bookable) set.add(o.departure.startDate.slice(0, 7))
    return [...set].sort()
  }, [availability])

  const activeCount = activeFilterCount(filters)
  const clearAll = () => {
    search.reset()
    onChange({ ...EMPTY_FILTERS, urut: filters.urut })
  }

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(filters.jenis ? [{ key: "jenis", label: TRIP_TYPE_LABEL[filters.jenis], remove: () => onChange({ ...filters, jenis: null }) }] : []),
    ...filters.destinasi.map((slug) => ({
      key: `dst-${slug}`,
      label: destinations.find((d) => d.slug === slug)?.name ?? slug,
      remove: () => onChange({ ...filters, destinasi: filters.destinasi.filter((s) => s !== slug) }),
    })),
    ...(filters.durasi ? [{ key: "durasi", label: DURATION_BUCKETS[filters.durasi].label, remove: () => onChange({ ...filters, durasi: null }) }] : []),
    ...(filters.harga ? [{ key: "harga", label: PRICE_BUCKETS[filters.harga].label, remove: () => onChange({ ...filters, harga: null }) }] : []),
    ...(filters.bulan
      ? [{ key: "bulan", label: formatDate(`${filters.bulan}-01`, "month-year"), remove: () => onChange({ ...filters, bulan: null }) }]
      : []),
  ]

  const panel = (
    <PackageFilterPanel
      filters={filters}
      onChange={onChange}
      destinations={destinations}
      packageCountByDestination={packageCountByDestination}
      months={months}
    />
  )

  return (
    <div className="container-page pb-24">
      <div className="flex flex-col gap-3 border-y border-border py-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search.value}
            onChange={(event) => search.setValue(event.target.value)}
            placeholder="Cari paket, destinasi, atau aktivitas…"
            aria-label="Cari paket"
            className="h-11 pl-10"
          />
        </div>
        <div className="flex items-center gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="lg" className="flex-1 lg:hidden">
                <SlidersHorizontal aria-hidden="true" /> Filter
                {activeCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">{activeCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[88dvh] rounded-t-lg">
              <SheetHeader className="border-b border-border px-5 pt-5 pb-4">
                <SheetTitle className="text-lg font-semibold">Filter paket</SheetTitle>
                <SheetDescription>Hasil diperbarui langsung saat filter dipilih.</SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto px-5 pb-4">{panel}</div>
              <SheetFooter className="flex-row gap-3 border-t border-border p-4">
                <Button variant="ghost" size="lg" onClick={clearAll} disabled={activeCount === 0} className="flex-1">
                  Hapus filter
                </Button>
                <Button size="lg" onClick={() => setSheetOpen(false)} className="flex-[2]">
                  Tampilkan {result.packages.length} paket
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Select value={filters.urut} onValueChange={(value) => onChange({ ...filters, urut: value as SortKey })}>
            <SelectTrigger aria-label="Urutkan" className="h-11 flex-1 md:w-56 md:flex-none">
              <span className="text-muted-foreground">Urutkan:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(SORT_OPTIONS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_OPTIONS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <aside aria-label="Filter paket" className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2 pb-6">{panel}</div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p aria-live="polite" className="mr-2 text-sm text-muted-foreground">
              {result.pendingLiveData ? (
                "Memeriksa jadwal…"
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular-nums">{result.packages.length}</span> paket
                  {activeCount > 0 || search.value.trim() ? " sesuai pencarian" : ""}
                </>
              )}
            </p>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.remove}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-primary pr-2.5 pl-3 text-xs font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Hapus filter ${chip.label}`}
              >
                {chip.label}
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ))}
            {chips.length > 1 && (
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-lagoon-700 underline underline-offset-4">
                Hapus semua
              </button>
            )}
          </div>

          {filters.jenis === "custom" && (
            <div className="mt-6 flex flex-col gap-5 rounded-[4px] bg-ocean-900 p-6 text-ivory-50 sm:flex-row sm:items-center sm:justify-between md:p-8">
              <div className="max-w-lg">
                <p className="eyebrow text-sand-300">Custom Trip</p>
                <p className="mt-2 font-display text-3xl leading-tight">Rancang perjalanan dari awal</p>
                <p className="mt-2 text-sm text-ivory-50/80">
                  Paket di bawah bisa menjadi titik awal. Pilih salah satu, atau ceritakan rencana Anda dan kami susun itinerary-nya.
                </p>
              </div>
              <Button asChild variant="sand" size="lg" className="shrink-0">
                <Link href="/custom-trip">
                  Mulai rancang <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}

          {result.pendingLiveData ? (
            <ul className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <Skeleton className="aspect-[4/3] rounded-[2px]" />
                  <Skeleton className="mt-4 h-4 w-32" />
                  <Skeleton className="mt-2 h-6 w-4/5" />
                </li>
              ))}
            </ul>
          ) : result.packages.length === 0 ? (
            <EmptyState
              icon={Compass}
              className="mt-6 rounded-[4px] border border-dashed border-input"
              title="Belum ada paket yang cocok"
              description="Coba kurangi filter atau ubah kata kunci. Kami juga bisa merancang perjalanan khusus untuk Anda."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button variant="secondary" onClick={clearAll}>
                    Hapus semua filter
                  </Button>
                  <Button asChild>
                    <Link href="/custom-trip">Rancang custom trip</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <ul className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
              {result.packages.map((pkg) => (
                <li key={pkg.id}>
                  <PackageCard
                    pkg={pkg}
                    destinationName={destinationById.get(pkg.destinationId)?.name ?? ""}
                    availability={availabilityLine(pkg, availability ? availability.get(pkg.id) : null)}
                    sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 100vw"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
