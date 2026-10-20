import type { Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
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
} from "@/domain/entities"
import type { ID } from "@/domain/types/common"

/**
 * Repository bound to one unit of work. Synchronous because it operates on the
 * transaction's working copy; persistence happens when the transaction commits.
 */
export interface Repository<T extends { id: ID }> {
  get(id: ID): T | undefined
  require(id: ID): T
  list(): T[]
  find(predicate: (item: T) => boolean): T[]
  insert(entity: T): T
  update(id: ID, patch: Partial<T>): T
  remove(id: ID): void
}

export interface SingletonRepository<T> {
  get(): T
  set(value: T): T
}

/** Everything a service may read or write inside one atomic transaction. */
export interface UnitOfWork {
  readonly now: Timestamp
  destinations: Repository<Destination>
  packages: Repository<TourPackage>
  departures: Repository<Departure>
  guides: Repository<Guide>
  vendors: Repository<Vendor>
  vendorAssignments: Repository<VendorAssignment>
  checklists: Repository<TripChecklist>
  costItems: Repository<CostItem>
  customers: Repository<Customer>
  travelers: Repository<Traveler>
  bookings: Repository<Booking>
  bookingTravelers: Repository<BookingTraveler>
  inquiries: Repository<Inquiry>
  quotations: Repository<Quotation>
  invoices: Repository<Invoice>
  payments: Repository<Payment>
  articles: Repository<Article>
  testimonials: Repository<Testimonial>
  users: Repository<User>
  roles: Repository<Role>
  activity: Repository<ActivityEvent>
  siteContent: SingletonRepository<SiteContent>
  settings: SingletonRepository<Settings>
  meta: SingletonRepository<DemoMeta>
  /** Read-only view of the working copy, for domain rules that need the whole dataset. */
  snapshot(): DemoDatabase
}

export type DataNotice =
  | "seeded"
  | "restored"
  | "migrated"
  | "reset_corrupt"
  | "seed_outdated"
  | "memory_only"

export interface DataSourceState {
  db: DemoDatabase
  version: number
  persistent: boolean
  notices: DataNotice[]
}

/**
 * Persistence boundary used by services (ADR-0001). The browser implementation keeps
 * one document in localStorage; an API implementation would replace it later.
 */
export interface DataSource {
  load(): DataSourceState
  current(): DataSourceState
  subscribe(listener: (state: DataSourceState) => void): () => void
  transaction<T>(work: (uow: UnitOfWork) => T): T
  reset(): DataSourceState
  dispose(): void
}
