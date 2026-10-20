"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"
import { ArrowUpRight, Compass, Search } from "lucide-react"
import type { DestinationCategory, RegionKey } from "@/domain/types/common"
import { DESTINATION_CATEGORY_LABEL, REGION_LABEL } from "@/domain/labels"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { ChipToggle } from "@/components/shared/choice"
import { SmartImage } from "@/components/shared/smart-image"
import { EmptyState } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePublicCatalog } from "@/features/packages/hooks/use-public-catalog"
import type { PublicCatalog } from "@/services/queries/catalog"

interface DestinationFilters {
  q: string
  wilayah: RegionKey | null
  kategori: DestinationCategory | null
}

const EMPTY: DestinationFilters = { q: "", wilayah: null, kategori: null }

function parse(params: Pick<URLSearchParams, "get">): DestinationFilters {
  const wilayah = params.get("wilayah")
  const kategori = params.get("kategori")
  return {
    q: params.get("q") ?? "",
    wilayah: wilayah && wilayah in REGION_LABEL ? (wilayah as RegionKey) : null,
    kategori: kategori && kategori in DESTINATION_CATEGORY_LABEL ? (kategori as DestinationCategory) : null,
  }
}

/** Reads ?q=&wilayah=&kategori=; must sit inside <Suspense>. */
export function DestinationExplorerRoute({ initialCatalog }: { initialCatalog: PublicCatalog }) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const filters = useMemo(() => parse(params), [params])
  const onChange = useCallback(
    (next: DestinationFilters) => {
      const query = new URLSearchParams()
      if (next.q) query.set("q", next.q)
      if (next.wilayah) query.set("wilayah", next.wilayah)
      if (next.kategori) query.set("kategori", next.kategori)
      const qs = query.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname],
  )
  return <DestinationExplorer initialCatalog={initialCatalog} filters={filters} onChange={onChange} />
}

export function DestinationExplorerFallback({ initialCatalog }: { initialCatalog: PublicCatalog }) {
  return <DestinationExplorer initialCatalog={initialCatalog} filters={EMPTY} onChange={() => {}} />
}

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

function DestinationExplorer({
  initialCatalog,
  filters,
  onChange,
}: {
  initialCatalog: PublicCatalog
  filters: DestinationFilters
  onChange: (next: DestinationFilters) => void
}) {
  const { destinations, packages } = usePublicCatalog(initialCatalog)
  const pushQuery = useCallback((q: string) => onChange({ ...filters, q }), [onChange, filters])
  const search = useUrlSearchInput(filters.q, pushQuery)
  const results = useMemo(() => {
    const term = normalize(search.value.trim())
    return destinations.filter((d) => {
      if (filters.wilayah && d.region !== filters.wilayah) return false
      if (filters.kategori && !d.categories.includes(filters.kategori)) return false
      if (term && !normalize([d.name, d.province, d.tagline, d.summary, ...d.highlights].join(" ")).includes(term)) return false
      return true
    })
  }, [destinations, filters, search.value])
  const regions = (Object.keys(REGION_LABEL) as RegionKey[]).filter((r) => destinations.some((d) => d.region === r))
  const categories = Object.keys(DESTINATION_CATEGORY_LABEL) as DestinationCategory[]

  return (
    <div className="container-page pb-24">
      <div className="grid gap-5 border-y border-border py-5">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search.value}
            onChange={(event) => search.setValue(event.target.value)}
            placeholder="Cari destinasi atau provinsi…"
            aria-label="Cari destinasi"
            className="h-11 pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Wilayah">
          <span className="mr-1 text-sm font-semibold text-ocean-900">Wilayah</span>
          <ChipToggle pressed={!filters.wilayah} onPressedChange={() => onChange({ ...filters, wilayah: null })}>
            Semua
          </ChipToggle>
          {regions.map((region) => (
            <ChipToggle key={region} pressed={filters.wilayah === region} onPressedChange={(on) => onChange({ ...filters, wilayah: on ? region : null })}>
              {REGION_LABEL[region]}
            </ChipToggle>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Kategori">
          <span className="mr-1 text-sm font-semibold text-ocean-900">Kategori</span>
          <ChipToggle pressed={!filters.kategori} onPressedChange={() => onChange({ ...filters, kategori: null })}>
            Semua
          </ChipToggle>
          {categories.map((category) => (
            <ChipToggle
              key={category}
              pressed={filters.kategori === category}
              onPressedChange={(on) => onChange({ ...filters, kategori: on ? category : null })}
            >
              {DESTINATION_CATEGORY_LABEL[category]}
            </ChipToggle>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="mt-6 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{results.length}</span> destinasi
      </p>

      {results.length === 0 ? (
        <EmptyState
          icon={Compass}
          className="mt-6 rounded-[4px] border border-dashed border-input"
          title="Tidak ada destinasi yang cocok"
          description="Coba kata kunci lain atau hapus filter."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                search.reset()
                onChange(EMPTY)
              }}
            >
              Hapus filter
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((destination) => {
            const count = packages.filter((p) => p.destinationId === destination.id).length
            return (
              <li key={destination.id}>
                <article className="group relative">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[2px] bg-muted">
                    <SmartImage
                      mediaId={destination.coverMediaId}
                      fill
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      className="transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow text-muted-foreground">
                        {destination.province} · {count} paket
                      </p>
                      <h2 className="mt-1 font-display text-4xl leading-none text-ocean-900">
                        <Link href={`/destinasi/${destination.slug}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
                          {destination.name}
                        </Link>
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">{destination.tagline}</p>
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Kategori">
                        {destination.categories.map((category) => (
                          <li key={category} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                            {DESTINATION_CATEGORY_LABEL[category]}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ArrowUpRight
                      className="mt-6 size-5 shrink-0 text-ocean-900 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
