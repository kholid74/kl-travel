import type {
  Actor,
  BudgetRange,
  DateOnly,
  EntityMeta,
  ID,
  IDR,
  Interest,
  Note,
  PriceLine,
  Source,
  Timestamp,
  TripType,
} from "../types/common"

export interface Customer extends EntityMeta {
  code: string
  fullName: string
  /** Normalised E.164. Unique. */
  phone: string
  /** Normalised lowercase. Unique when present. */
  email?: string
  city?: string
  preferredContact: "whatsapp" | "email" | "telepon"
  acquisitionSource: Source
  tags: string[]
  notes: Note[]
}

export interface Traveler extends EntityMeta {
  customerId: ID
  isCustomerSelf: boolean
  fullName?: string
  gender?: "L" | "P"
  dateOfBirth?: DateOnly
  phone?: string
  emergencyContact?: { name: string; phone: string }
  dietaryNotes?: string
}

export interface BookingTraveler {
  id: ID
  bookingId: ID
  travelerId: ID
  isLead: boolean
}

export type BookingStatus = "pending" | "awaiting_payment" | "confirmed" | "completed" | "cancelled"

export type CancellationReason = "customer_request" | "hold_expired" | "departure_cancelled" | "other"

export interface BookingCancellation {
  at: Timestamp
  by: Actor
  reason: CancellationReason
  note?: string
  feeAmount: IDR
  refundAmount: IDR
}

export interface Booking extends EntityMeta {
  code: string
  customerId: ID
  packageId: ID
  departureId: ID
  tripType: TripType
  source: Source
  inquiryId?: ID
  quotationId?: ID
  status: BookingStatus
  lines: PriceLine[]
  discount: IDR
  holdExpiresAt?: Timestamp
  holdExtensions?: number
  specialRequests?: string
  confirmedAt?: Timestamp
  completedAt?: Timestamp
  cancellation?: BookingCancellation
}

export type PipelineStage = "new" | "contacted" | "quotation_sent" | "negotiation" | "won" | "lost"

export type LostReason = "harga" | "tanggal_tidak_cocok" | "pilih_kompetitor" | "tidak_ada_respons" | "rencana_batal"

export type InquiryType = "private" | "custom" | "general"

export type TravelDates =
  | { kind: "exact"; startDate: DateOnly }
  | { kind: "range"; from: DateOnly; to: DateOnly }
  | { kind: "flexible"; month?: string }

export interface FollowUp {
  id: ID
  channel: "whatsapp" | "telepon" | "email" | "meeting"
  body: string
  authorId: ID
  at: Timestamp
}

export interface Inquiry extends EntityMeta {
  code: string
  type: InquiryType
  customerId: ID
  contactSnapshot: { fullName: string; phone: string; email?: string }
  source: Source
  packageId?: ID
  destinationIds: ID[]
  travelDates: TravelDates
  durationDays?: number
  groupSize: number
  budgetPerPax?: BudgetRange
  interests: Interest[]
  message?: string
  stage: PipelineStage
  lostReason?: LostReason
  assigneeId?: ID
  nextFollowUpDate?: DateOnly
  followUps: FollowUp[]
  convertedBookingId?: ID
}

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected"

export interface Quotation extends EntityMeta {
  code: string
  inquiryId: ID
  version: number
  title: string
  packageId?: ID
  proposedStartDate: DateOnly
  durationDays: number
  groupSize: number
  lines: PriceLine[]
  discount: IDR
  itinerarySummary: string[]
  validUntil: DateOnly
  status: QuotationStatus
  sentAt?: Timestamp
  respondedAt?: Timestamp
}
