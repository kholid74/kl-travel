import type { DateOnly, Timestamp } from "@/lib/dates"

export type { DateOnly, Timestamp }

/** Stable, prefixed identifier (e.g. "pkg_lbj_sailing_3h2m", "bk_8f3k2m9q4t"). */
export type ID = string

/** Whole rupiah. Never fractional. */
export type IDR = number

export interface EntityMeta {
  id: ID
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type TripType = "open" | "private" | "custom"

export type RegionKey = "bali-nusa-tenggara" | "jawa" | "sumatra-kepulauan" | "papua-maluku"

export type DestinationCategory = "bahari" | "pulau" | "pegunungan" | "budaya" | "petualangan" | "santai"

export type Source =
  | "website"
  | "whatsapp"
  | "instagram"
  | "tiktok"
  | "referral"
  | "google_ads"
  | "repeat"
  | "walk_in"

export type Interest =
  | "snorkeling"
  | "diving"
  | "hiking"
  | "budaya"
  | "kuliner"
  | "fotografi"
  | "santai"
  | "honeymoon"
  | "keluarga"
  | "petualangan"

/** Budget per person. */
export type BudgetRange = "lt_3jt" | "3_5jt" | "5_10jt" | "10_20jt" | "gt_20jt"

export type Actor =
  | { kind: "user"; userId: ID }
  | { kind: "customer"; customerId: ID }
  | { kind: "system" }

export interface PriceLine {
  id: ID
  label: string
  quantity: number
  unitPrice: IDR
}

export interface Note {
  id: ID
  body: string
  authorId: ID
  createdAt: Timestamp
}

export interface Faq {
  question: string
  answer: string
}

export type EntityType =
  | "destination"
  | "package"
  | "departure"
  | "customer"
  | "traveler"
  | "booking"
  | "inquiry"
  | "quotation"
  | "invoice"
  | "payment"
  | "guide"
  | "vendor"
  | "article"
  | "testimonial"
  | "user"
  | "site_content"
  | "settings"
