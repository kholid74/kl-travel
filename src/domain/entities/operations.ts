import type { DateOnly, EntityMeta, ID, IDR, Timestamp } from "../types/common"

export interface Departure extends EntityMeta {
  code: string
  packageId: ID
  kind: "scheduled" | "private"
  startDate: DateOnly
  endDate: DateOnly
  capacity: number
  minParticipants: number
  pricePerPaxOverride?: IDR
  salesClosed: boolean
  salesClosedReason?: string
  cancelledAt?: Timestamp
  cancellationReason?: string
  guideId?: ID
  notes?: string
}

export interface Guide extends EntityMeta {
  name: string
  phone: string
  languages: string[]
  destinationIds: ID[]
  status: "active" | "inactive"
}

export type VendorCategory =
  | "transportasi"
  | "kapal"
  | "akomodasi"
  | "restoran"
  | "aktivitas"
  | "tiket"
  | "dokumentasi"

export interface Vendor extends EntityMeta {
  name: string
  category: VendorCategory
  destinationIds: ID[]
  contactName: string
  phone: string
  notes?: string
}

export interface VendorAssignment extends EntityMeta {
  departureId: ID
  vendorId: ID
  service: VendorCategory
  status: "requested" | "confirmed" | "cancelled"
  note?: string
}

export type ChecklistKey =
  | "transport"
  | "accommodation"
  | "traveler_data"
  | "itinerary"
  | "guide"
  | "briefing"
  | "equipment"
  | "manifest"

export interface ChecklistItem {
  key: ChecklistKey
  label: string
  done: boolean
  doneAt?: Timestamp
  doneBy?: ID
  note?: string
}

export interface TripChecklist extends EntityMeta {
  departureId: ID
  items: ChecklistItem[]
}

export type CostCategory =
  | "transport"
  | "accommodation"
  | "meals"
  | "guide"
  | "tickets"
  | "activities"
  | "documentation"
  | "other"

export type CostOwner = { type: "package"; packageId: ID } | { type: "departure"; departureId: ID }

export interface CostItem extends EntityMeta {
  owner: CostOwner
  category: CostCategory
  label: string
  /** fixed = per departure, per_pax = per participant */
  basis: "fixed" | "per_pax"
  unitCost: IDR
  quantity: number
  vendorId?: ID
  /** Total actual spend, recorded after the trip runs. */
  actualAmount?: IDR
}
