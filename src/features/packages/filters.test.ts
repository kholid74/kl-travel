import { describe, expect, it } from "vitest"
import { buildSeed } from "@/data/seed/build-seed"
import { availabilityByPackage, selectPublicCatalog } from "@/services/queries/catalog"
import { applyFilters, EMPTY_FILTERS, parseFilters, serializeFilters } from "./filters"

const NOW = "2026-10-20T03:00:00.000Z"
const db = buildSeed(NOW)
const { packages, destinations } = selectPublicCatalog(db)
const availability = availabilityByPackage(
  db,
  packages.map((p) => p.id),
  NOW,
)

describe("package filters", () => {
  it("round-trips through the query string and ignores unknown values", () => {
    const filters = parseFilters(new URLSearchParams("q=komodo&jenis=open&destinasi=labuan-bajo,bali&durasi=2-3&harga=x&urut=durasi"))
    expect(filters).toEqual({ ...EMPTY_FILTERS, q: "komodo", jenis: "open", destinasi: ["labuan-bajo", "bali"], durasi: "2-3", urut: "durasi" })
    expect(parseFilters(new URLSearchParams(serializeFilters(filters)))).toEqual(filters)
    expect(serializeFilters(EMPTY_FILTERS)).toBe("")
  })

  it("combines search, type, destination, duration and price", () => {
    const result = applyFilters(packages, destinations, availability, {
      ...EMPTY_FILTERS,
      q: "Komodo",
      jenis: "open",
    }).packages
    expect(result.map((p) => p.slug).sort()).toEqual(["komodo-day-trip-speedboat", "sailing-komodo-phinisi-3h2m"])

    const cheapShort = applyFilters(packages, destinations, availability, { ...EMPTY_FILTERS, durasi: "1", harga: "lt2" }).packages
    expect(cheapShort.length).toBeGreaterThan(0)
    expect(cheapShort.every((p) => p.durationDays === 1)).toBe(true)

    const custom = applyFilters(packages, destinations, availability, { ...EMPTY_FILTERS, jenis: "custom" }).packages
    expect(custom.every((p) => p.isCustomizable)).toBe(true)
  })

  it("filters by departure month only once live seats are known", () => {
    const month = [...availability.values()].flatMap((a) => a.options).find((o) => o.bookable)!.departure.startDate.slice(0, 7)
    const pending = applyFilters(packages, destinations, null, { ...EMPTY_FILTERS, bulan: month })
    expect(pending.pendingLiveData).toBe(true)
    const live = applyFilters(packages, destinations, availability, { ...EMPTY_FILTERS, jenis: "open", bulan: month })
    expect(live.pendingLiveData).toBe(false)
    for (const pkg of live.packages) {
      expect(availability.get(pkg.id)!.options.some((o) => o.bookable && o.departure.startDate.startsWith(month))).toBe(true)
    }
  })

  it("sorts by soonest departure and by price", () => {
    const soonest = applyFilters(packages, destinations, availability, { ...EMPTY_FILTERS, jenis: "open", urut: "terdekat" }).packages
    const dates = soonest.map((p) => availability.get(p.id)?.next?.departure.startDate ?? "9999")
    expect(dates).toEqual([...dates].sort())
    const cheapest = applyFilters(packages, destinations, availability, { ...EMPTY_FILTERS, urut: "harga-terendah" }).packages
    expect(cheapest[0].slug).toBe("bromo-sunrise-midnight-tour")
  })
})
