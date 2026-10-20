import type {
  ActivityEvent,
  Article,
  Booking,
  BookingTraveler,
  CostItem,
  Customer,
  DemoMeta,
  Departure,
  Destination,
  Guide,
  Inquiry,
  Invoice,
  Payment,
  Quotation,
  Role,
  Settings,
  SiteContent,
  Testimonial,
  TourPackage,
  Traveler,
  TripChecklist,
  User,
  Vendor,
  VendorAssignment,
} from "./entities"
import type { ID } from "./types/common"

export type Table<T> = Record<ID, T>

/** The whole demo dataset. One document, persisted per browser (ADR-0001). */
export interface DemoDatabase {
  meta: DemoMeta
  destinations: Table<Destination>
  packages: Table<TourPackage>
  departures: Table<Departure>
  guides: Table<Guide>
  vendors: Table<Vendor>
  vendorAssignments: Table<VendorAssignment>
  checklists: Table<TripChecklist>
  costItems: Table<CostItem>
  customers: Table<Customer>
  travelers: Table<Traveler>
  bookings: Table<Booking>
  bookingTravelers: Table<BookingTraveler>
  inquiries: Table<Inquiry>
  quotations: Table<Quotation>
  invoices: Table<Invoice>
  payments: Table<Payment>
  articles: Table<Article>
  testimonials: Table<Testimonial>
  users: Table<User>
  roles: Table<Role>
  activity: Table<ActivityEvent>
  siteContent: SiteContent
  settings: Settings
}

export const COLLECTION_KEYS = [
  "destinations",
  "packages",
  "departures",
  "guides",
  "vendors",
  "vendorAssignments",
  "checklists",
  "costItems",
  "customers",
  "travelers",
  "bookings",
  "bookingTravelers",
  "inquiries",
  "quotations",
  "invoices",
  "payments",
  "articles",
  "testimonials",
  "users",
  "roles",
  "activity",
] as const satisfies readonly (keyof DemoDatabase)[]

export type CollectionKey = (typeof COLLECTION_KEYS)[number]

export function values<T>(table: Table<T>): T[] {
  return Object.values(table)
}
