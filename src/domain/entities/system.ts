import type { Actor, DateOnly, EntityMeta, EntityType, ID, Timestamp } from "../types/common"

export type Permission =
  | "inquiries.manage"
  | "bookings.manage"
  | "bookings.cancel"
  | "payments.record"
  | "payments.verify"
  | "packages.manage"
  | "packages.publish"
  | "departures.manage"
  | "operations.manage"
  | "costing.manage"
  | "content.manage"
  | "reports.view"
  | "team.manage"
  | "settings.manage"

export type RoleKey = "owner" | "sales" | "operations" | "finance" | "content"

export interface Role {
  id: ID
  key: RoleKey
  name: string
  description: string
  permissions: Permission[]
}

export interface User extends EntityMeta {
  name: string
  email: string
  title: string
  roleId: ID
  status: "active" | "invited" | "inactive"
}

export interface ActivityEvent {
  id: ID
  at: Timestamp
  actor: Actor
  subject: { type: EntityType; id: ID }
  related: { type: EntityType; id: ID }[]
  /** Machine-readable action, e.g. "booking.created". */
  action: string
  /** Ready-to-display sentence in Bahasa Indonesia. */
  message: string
  data?: Record<string, string | number | boolean | null>
}

export interface Settings {
  company: { name: string; tagline: string; address: string; email: string; phoneDisplay: string }
  booking: {
    pendingHoldHours: number
    depositHoldHours: number
    salesCutoffDays: number
    lowSeatThreshold: number
    maxPaxPerBooking: number
  }
  payment: {
    defaultDepositPercent: number
    defaultBalanceDueDaysBefore: number
    bankAccountDisplay: { bank: string; number: string; holder: string }
  }
  invoice: { prefix: string; footerNote: string }
}

export interface DemoMeta {
  schemaVersion: number
  seedVersion: string
  seedAnchor: DateOnly
  seededAt: Timestamp
  /** Sequence numbers for human-readable codes. */
  counters: Record<string, number>
}
