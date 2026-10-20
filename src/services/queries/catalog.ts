/**
 * Read model for the public website: pure functions over a database snapshot.
 * The same catalog shape is produced on the server from fixtures (catalog-server)
 * so client islands can start from server data and switch to live data (ADR-0003).
 */
import { toDateOnlyWIB, type Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import type { Article, Departure, Destination, SiteContent, Testimonial, TourPackage } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import {
  departureDisplayStatus,
  isBookable,
  seatSummary,
  type DepartureDisplayStatus,
  type SeatSummary,
} from "@/domain/rules/availability"
import { pricePerPax } from "@/domain/rules/pricing"
import type { ID, IDR } from "@/domain/types/common"

export interface PublicCatalog {
  destinations: Destination[]
  /** Published, catalog-visible packages whose destination is published. */
  packages: TourPackage[]
}

export interface PublicContent {
  siteContent: SiteContent
  articles: Article[]
  testimonials: Testimonial[]
}

export function selectPublicCatalog(db: DemoDatabase): PublicCatalog {
  const destinations = Object.values(db.destinations).filter((d) => d.status === "published")
  const visible = new Set(destinations.map((d) => d.id))
  const packages = Object.values(db.packages).filter(
    (p) => p.status === "published" && p.visibility === "catalog" && visible.has(p.destinationId),
  )
  return { destinations, packages }
}

export function selectPublicContent(db: DemoDatabase): PublicContent {
  return {
    siteContent: db.siteContent,
    articles: sortArticles(Object.values(db.articles).filter((a) => a.status === "published")),
    testimonials: Object.values(db.testimonials).filter((t) => t.status === "published"),
  }
}

/** Newest first. */
export function sortArticles(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
}

export interface DepartureOption {
  departure: Departure
  seats: SeatSummary
  status: DepartureDisplayStatus
  bookable: boolean
  pricePerPax: IDR
}

export interface PackageAvailability {
  /** Upcoming scheduled departures that have not been cancelled, soonest first. */
  options: DepartureOption[]
  next?: DepartureOption
  bookableCount: number
}

const EMPTY_AVAILABILITY: PackageAvailability = { options: [], bookableCount: 0 }

/** Departure options shown on the public site for one package. */
export function packageAvailability(db: DemoDatabase, packageId: ID, now: Timestamp): PackageAvailability {
  const pkg = db.packages[packageId]
  if (!pkg) return EMPTY_AVAILABILITY
  const idx = getIndexes(db)
  const today = toDateOnlyWIB(now)
  const options = (idx.departuresByPackage.get(packageId) ?? [])
    .filter((d) => d.kind === "scheduled" && !d.cancelledAt && d.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((departure): DepartureOption => {
      const seats = seatSummary(departure, idx.bookingsByDeparture.get(departure.id) ?? [], idx.paxOf, now)
      const status = departureDisplayStatus({
        departure,
        seats,
        today,
        settings: db.settings.booking,
        packageArchived: pkg.status === "archived",
      })
      return {
        departure,
        seats,
        status,
        bookable: isBookable(status),
        pricePerPax: pricePerPax(pkg, 1, departure) ?? 0,
      }
    })
  const bookable = options.filter((o) => o.bookable)
  return { options, next: bookable[0], bookableCount: bookable.length }
}

export function availabilityByPackage(db: DemoDatabase, packageIds: ID[], now: Timestamp): Map<ID, PackageAvailability> {
  return new Map(packageIds.map((id) => [id, packageAvailability(db, id, now)]))
}

export interface UpcomingDeparture extends DepartureOption {
  pkg: TourPackage
  destination: Destination
}

/** Soonest bookable open-trip departures across the public catalog. */
export function upcomingDepartures(db: DemoDatabase, now: Timestamp, limit: number): UpcomingDeparture[] {
  const { packages, destinations } = selectPublicCatalog(db)
  const destinationById = new Map(destinations.map((d) => [d.id, d]))
  const rows: UpcomingDeparture[] = []
  for (const pkg of packages) {
    if (pkg.tripType !== "open") continue
    const destination = destinationById.get(pkg.destinationId)
    if (!destination) continue
    for (const option of packageAvailability(db, pkg.id, now).options) {
      if (option.bookable) rows.push({ ...option, pkg, destination })
    }
  }
  return rows.sort((a, b) => a.departure.startDate.localeCompare(b.departure.startDate)).slice(0, limit)
}

export function findDepartureByCode(db: DemoDatabase, packageId: ID, code: string | null): Departure | undefined {
  if (!code) return undefined
  return getIndexes(db)
    .departuresByPackage.get(packageId)
    ?.find((d) => d.code === code)
}
