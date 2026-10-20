import type {
  DestinationCategory,
  EntityMeta,
  Faq,
  ID,
  IDR,
  RegionKey,
  Timestamp,
  TripType,
} from "../types/common"

export interface Destination extends EntityMeta {
  slug: string
  name: string
  region: RegionKey
  province: string
  categories: DestinationCategory[]
  tagline: string
  /** ≤ 180 characters, used on cards. */
  summary: string
  description: string[]
  highlights: string[]
  bestTime: string
  gettingThere: string
  coverMediaId: ID
  galleryMediaIds: ID[]
  status: "draft" | "published"
}

export interface ItineraryDay {
  id: ID
  day: number
  title: string
  description: string
  activities: string[]
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean }
  accommodation?: string
}

export interface PriceTier {
  minPax: number
  maxPax: number
  pricePerPax: IDR
}

export type PackagePricing =
  | { kind: "per_pax"; pricePerPax: IDR }
  | { kind: "tiered"; tiers: PriceTier[] }
  | { kind: "quoted" }

/** Fee charged when cancelling at least `minDaysBefore` days before departure. */
export interface CancellationTier {
  minDaysBefore: number
  feePercent: number
}

export type PackageStatus = "draft" | "published" | "archived"
export type FitnessLevel = "ringan" | "sedang" | "menantang"

export interface TourPackage extends EntityMeta {
  slug: string
  code: string
  title: string
  tripType: TripType
  visibility: "catalog" | "unlisted"
  status: PackageStatus
  publishedAt?: Timestamp
  destinationId: ID
  durationDays: number
  durationNights: number
  summary: string
  overview: string[]
  highlights: string[]
  itinerary: ItineraryDay[]
  inclusions: string[]
  exclusions: string[]
  meetingPoint: { name: string; address: string; time?: string; notes?: string }
  requirements: { minAge?: number; fitness: FitnessLevel; notes: string[] }
  terms: string[]
  /** Sorted by `minDaysBefore` descending. */
  cancellationPolicy: CancellationTier[]
  paymentTerms: { depositPercent: number; balanceDueDaysBefore: number }
  pricing: PackagePricing
  groupSize: { min: number; max: number }
  faqs: Faq[]
  coverMediaId: ID
  galleryMediaIds: ID[]
  tags: string[]
  isCustomizable: boolean
  sourceQuotationId?: ID
}

/** Static image catalog entry. Never stored in the browser database. */
export interface MediaAsset {
  id: ID
  src: string
  width: number
  height: number
  alt: string
  blurDataURL?: string
  credit: { photographer: string; sourceUrl: string }
  tags: string[]
}
