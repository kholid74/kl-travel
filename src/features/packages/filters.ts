import type { Destination, TourPackage } from "@/domain/entities"
import { startingPrice } from "@/domain/rules/pricing"
import type { ID, TripType } from "@/domain/types/common"
import type { PackageAvailability } from "@/services/queries/catalog"

export const DURATION_BUCKETS = {
  "1": { label: "1 hari", min: 1, max: 1 },
  "2-3": { label: "2–3 hari", min: 2, max: 3 },
  "4-5": { label: "4–5 hari", min: 4, max: 5 },
  "6+": { label: "6 hari atau lebih", min: 6, max: Infinity },
} as const

export const PRICE_BUCKETS = {
  lt2: { label: "< Rp2 jt", min: 0, max: 1_999_999 },
  "2-5": { label: "Rp2–5 jt", min: 2_000_000, max: 4_999_999 },
  "5-10": { label: "Rp5–10 jt", min: 5_000_000, max: 9_999_999 },
  gt10: { label: "≥ Rp10 jt", min: 10_000_000, max: Infinity },
} as const

export const SORT_OPTIONS = {
  rekomendasi: "Rekomendasi",
  terdekat: "Keberangkatan terdekat",
  "harga-terendah": "Harga terendah",
  "harga-tertinggi": "Harga tertinggi",
  durasi: "Durasi terpendek",
} as const

export type DurationBucket = keyof typeof DURATION_BUCKETS
export type PriceBucket = keyof typeof PRICE_BUCKETS
export type SortKey = keyof typeof SORT_OPTIONS
/** "custom" lists packages that can be the base of a Custom Trip. */
export type TypeFilter = TripType

export interface PackageFilters {
  q: string
  jenis: TypeFilter | null
  destinasi: string[]
  durasi: DurationBucket | null
  harga: PriceBucket | null
  /** "YYYY-MM": open trips with a bookable departure that month; private trips always match. */
  bulan: string | null
  urut: SortKey
}

export const EMPTY_FILTERS: PackageFilters = { q: "", jenis: null, destinasi: [], durasi: null, harga: null, bulan: null, urut: "rekomendasi" }

const isKey = <T extends object>(obj: T, key: string | null): key is Extract<keyof T, string> => key !== null && key in obj

export function parseFilters(params: Pick<URLSearchParams, "get">): PackageFilters {
  const jenis = params.get("jenis")
  const durasi = params.get("durasi")
  const harga = params.get("harga")
  const urut = params.get("urut")
  const bulan = params.get("bulan")
  return {
    q: params.get("q")?.trim() ?? "",
    jenis: jenis === "open" || jenis === "private" || jenis === "custom" ? jenis : null,
    destinasi: (params.get("destinasi") ?? "").split(",").filter(Boolean),
    durasi: isKey(DURATION_BUCKETS, durasi) ? durasi : null,
    harga: isKey(PRICE_BUCKETS, harga) ? harga : null,
    bulan: bulan && /^\d{4}-\d{2}$/.test(bulan) ? bulan : null,
    urut: isKey(SORT_OPTIONS, urut) ? urut : "rekomendasi",
  }
}

export function serializeFilters(filters: PackageFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.jenis) params.set("jenis", filters.jenis)
  if (filters.destinasi.length) params.set("destinasi", filters.destinasi.join(","))
  if (filters.durasi) params.set("durasi", filters.durasi)
  if (filters.harga) params.set("harga", filters.harga)
  if (filters.bulan) params.set("bulan", filters.bulan)
  if (filters.urut !== "rekomendasi") params.set("urut", filters.urut)
  return params.toString()
}

export function activeFilterCount(filters: PackageFilters): number {
  return (filters.jenis ? 1 : 0) + filters.destinasi.length + (filters.durasi ? 1 : 0) + (filters.harga ? 1 : 0) + (filters.bulan ? 1 : 0)
}

/** Lowercase, accents stripped, so "Bajo" finds "bajo" and "Jogja" finds "jogja". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

export interface FilterResult {
  packages: TourPackage[]
  /** True when the result depends on live seats that have not loaded yet. */
  pendingLiveData: boolean
}

export function applyFilters(
  packages: TourPackage[],
  destinations: Destination[],
  availability: Map<ID, PackageAvailability> | null,
  filters: PackageFilters,
): FilterResult {
  const destinationById = new Map(destinations.map((d) => [d.id, d]))
  const terms = normalize(filters.q).split(/\s+/).filter(Boolean)
  const needsLive = (filters.bulan !== null || filters.urut === "terdekat") && availability === null

  const matches = packages.filter((pkg) => {
    const destination = destinationById.get(pkg.destinationId)
    if (filters.jenis === "custom" ? !pkg.isCustomizable : filters.jenis && pkg.tripType !== filters.jenis) return false
    if (filters.destinasi.length && (!destination || !filters.destinasi.includes(destination.slug))) return false
    if (filters.durasi) {
      const bucket = DURATION_BUCKETS[filters.durasi]
      if (pkg.durationDays < bucket.min || pkg.durationDays > bucket.max) return false
    }
    if (filters.harga) {
      const price = startingPrice(pkg)
      const bucket = PRICE_BUCKETS[filters.harga]
      if (price === null || price < bucket.min || price > bucket.max) return false
    }
    if (filters.bulan && availability && pkg.tripType === "open") {
      const options = availability.get(pkg.id)?.options ?? []
      if (!options.some((o) => o.bookable && o.departure.startDate.startsWith(filters.bulan!))) return false
    }
    if (terms.length) {
      const haystack = normalize(
        [pkg.title, pkg.summary, destination?.name ?? "", destination?.province ?? "", ...pkg.tags, ...pkg.highlights].join(" "),
      )
      if (!terms.every((term) => haystack.includes(term))) return false
    }
    return true
  })

  const nextDate = (pkg: TourPackage) => availability?.get(pkg.id)?.next?.departure.startDate ?? "9999-12-31"
  const price = (pkg: TourPackage) => startingPrice(pkg) ?? Infinity
  const sorted = [...matches]
  switch (filters.urut) {
    case "terdekat":
      if (availability) sorted.sort((a, b) => nextDate(a).localeCompare(nextDate(b)))
      break
    case "harga-terendah":
      sorted.sort((a, b) => price(a) - price(b))
      break
    case "harga-tertinggi":
      sorted.sort((a, b) => price(b) - price(a))
      break
    case "durasi":
      sorted.sort((a, b) => a.durationDays - b.durationDays || price(a) - price(b))
      break
    case "rekomendasi":
      // Curated catalog order, open trips first.
      sorted.sort((a, b) => Number(a.tripType !== "open") - Number(b.tripType !== "open"))
      break
  }
  return { packages: sorted, pendingLiveData: needsLive }
}
