import type { DemoDatabase } from "./database"
import type {
  ActivityEvent,
  Booking,
  BookingTraveler,
  CostItem,
  Departure,
  Inquiry,
  Invoice,
  Payment,
  Quotation,
  TourPackage,
  TripChecklist,
  VendorAssignment,
} from "./entities"
import type { ID } from "./types/common"

export interface DatabaseIndexes {
  packagesByDestination: Map<ID, TourPackage[]>
  departuresByPackage: Map<ID, Departure[]>
  bookingsByDeparture: Map<ID, Booking[]>
  bookingsByCustomer: Map<ID, Booking[]>
  bookingTravelersByBooking: Map<ID, BookingTraveler[]>
  paymentsByBooking: Map<ID, Payment[]>
  invoiceByBooking: Map<ID, Invoice>
  inquiriesByCustomer: Map<ID, Inquiry[]>
  quotationsByInquiry: Map<ID, Quotation[]>
  checklistByDeparture: Map<ID, TripChecklist>
  costItemsByDeparture: Map<ID, CostItem[]>
  costItemsByPackage: Map<ID, CostItem[]>
  vendorAssignmentsByDeparture: Map<ID, VendorAssignment[]>
  activityBySubject: Map<ID, ActivityEvent[]>
  paxOf: (bookingId: ID) => number
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

const cache = new WeakMap<DemoDatabase, DatabaseIndexes>()

/** Lookup tables for one database snapshot. Memoised per snapshot object. */
export function getIndexes(db: DemoDatabase): DatabaseIndexes {
  const cached = cache.get(db)
  if (cached) return cached

  const idx: DatabaseIndexes = {
    packagesByDestination: new Map(),
    departuresByPackage: new Map(),
    bookingsByDeparture: new Map(),
    bookingsByCustomer: new Map(),
    bookingTravelersByBooking: new Map(),
    paymentsByBooking: new Map(),
    invoiceByBooking: new Map(),
    inquiriesByCustomer: new Map(),
    quotationsByInquiry: new Map(),
    checklistByDeparture: new Map(),
    costItemsByDeparture: new Map(),
    costItemsByPackage: new Map(),
    vendorAssignmentsByDeparture: new Map(),
    activityBySubject: new Map(),
    paxOf: (bookingId) => idx.bookingTravelersByBooking.get(bookingId)?.length ?? 0,
  }

  for (const pkg of Object.values(db.packages)) push(idx.packagesByDestination, pkg.destinationId, pkg)
  for (const dep of Object.values(db.departures)) push(idx.departuresByPackage, dep.packageId, dep)
  for (const booking of Object.values(db.bookings)) {
    push(idx.bookingsByDeparture, booking.departureId, booking)
    push(idx.bookingsByCustomer, booking.customerId, booking)
  }
  for (const bt of Object.values(db.bookingTravelers)) push(idx.bookingTravelersByBooking, bt.bookingId, bt)
  for (const payment of Object.values(db.payments)) push(idx.paymentsByBooking, payment.bookingId, payment)
  for (const invoice of Object.values(db.invoices)) idx.invoiceByBooking.set(invoice.bookingId, invoice)
  for (const inquiry of Object.values(db.inquiries)) push(idx.inquiriesByCustomer, inquiry.customerId, inquiry)
  for (const quotation of Object.values(db.quotations)) push(idx.quotationsByInquiry, quotation.inquiryId, quotation)
  for (const checklist of Object.values(db.checklists)) idx.checklistByDeparture.set(checklist.departureId, checklist)
  for (const item of Object.values(db.costItems)) {
    if (item.owner.type === "departure") push(idx.costItemsByDeparture, item.owner.departureId, item)
    else push(idx.costItemsByPackage, item.owner.packageId, item)
  }
  for (const va of Object.values(db.vendorAssignments)) push(idx.vendorAssignmentsByDeparture, va.departureId, va)
  for (const event of Object.values(db.activity)) {
    push(idx.activityBySubject, event.subject.id, event)
    for (const rel of event.related) push(idx.activityBySubject, rel.id, event)
  }
  for (const list of idx.activityBySubject.values()) list.sort((a, b) => b.at.localeCompare(a.at))

  cache.set(db, idx)
  return idx
}
