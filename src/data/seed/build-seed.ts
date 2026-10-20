/**
 * Builds the demo dataset relative to "now" (docs/seed-data.md). Deterministic for a given
 * `now`: the PRNG is seeded with SEED_VERSION, so every visitor sees the same story shifted
 * to their own calendar.
 *
 * Two passes: entities are created first with timestamps; human-readable codes and activity
 * messages are assigned at the end in chronological order.
 */
import { addDays, addHours, addMinutes, atWIB, diffDays, toDateOnlyWIB, type DateOnly, type Timestamp } from "@/lib/dates"
import { formatDate, formatIDR } from "@/lib/format"
import { pad } from "@/lib/ids"
import { createRng, type Rng } from "@/lib/prng"
import type { DemoDatabase } from "@/domain/database"
import type {
  ActivityEvent,
  Booking,
  BookingTraveler,
  CancellationReason,
  ChecklistKey,
  Customer,
  Departure,
  Inquiry,
  InquiryType,
  Invoice,
  LostReason,
  Payment,
  PaymentMethod,
  PipelineStage,
  Quotation,
  TourPackage,
  Traveler,
  TravelDates,
  VendorCategory,
} from "@/domain/entities"
import type { Actor, BudgetRange, EntityType, ID, Interest, PriceLine, Source } from "@/domain/types/common"
import { CANCELLATION_REASON_LABEL, LOST_REASON_LABEL, PIPELINE_STAGE_LABEL, SOURCE_LABEL } from "@/domain/labels"
import { cancellationQuote } from "@/domain/rules/cancellation"
import { buildInstallments } from "@/domain/rules/invoice-schedule"
import { priceTotal, pricePerPax } from "@/domain/rules/pricing"
import { checklistTemplate } from "@/domain/rules/trip-readiness"
import { ARTICLES } from "../fixtures/articles"
import { DESTINATIONS } from "../fixtures/destinations"
import { CATALOG_PACKAGES, type CostLine, type PackageFixture } from "../fixtures/packages"
import { day, fixed, perPax, PRIVATE_TRIP_TERMS, STANDARD_POLICY } from "../fixtures/packages/shared"
import { GUIDES, ROLES, TESTIMONIALS, USERS, VENDORS } from "../fixtures/people"
import { SETTINGS, SITE_CONTENT } from "../fixtures/site-content"
import { CITIES, DIETARY_NOTES, EMAIL_DOMAINS, FIRST_NAMES_F, FIRST_NAMES_M, LAST_NAMES } from "./names"

export const SCHEMA_VERSION = 1
export const SEED_VERSION = "2026.10.1"
/** Payments submitted by customers point at an illustrated "bukti transfer" (never a real file). */
export const PROOF_ILLUSTRATION_ID = "proof-transfer-illustration"

const SALES = ["usr_dimas", "usr_sekar"] as const
const FINANCE = "usr_lestari"
const OPS = "usr_bayu"

type Outcome =
  | "completed"
  | "confirmed_paid"
  | "confirmed_deposit"
  | "confirmed_overdue"
  | "confirmed_balance_pending"
  | "awaiting"
  | "awaiting_submitted"
  | "awaiting_expiring"
  | "pending"
  | "cancel_hold_expired"
  | "cancel_customer"
  | "cancel_departure"

interface BookingPlan {
  dep: Departure
  pax: number
  outcome: Outcome
  customer?: Customer
  source?: Source
  travelersComplete?: boolean
  discount?: number
  lines?: PriceLine[]
  inquiry?: Inquiry
  quotation?: Quotation
  /** Day offset for creation (otherwise derived from the departure date). */
  createdOffset?: number
  /** Explicit approval time (conversions). */
  approvedAt?: Timestamp
  paidInFull?: boolean
  cancelOffset?: number
  refundDone?: boolean
}

interface PendingEvent {
  at: Timestamp
  actor: Actor
  subject: { type: EntityType; id: ID }
  related?: { type: EntityType; id: ID }[]
  action: string
  message: () => string
  data?: ActivityEvent["data"]
}

interface DepartureSpec {
  pkgId: ID
  start: number
  capacity?: number
  min?: number
  guideId?: ID
  override?: number
  salesClosed?: string
  cancelled?: { at: number; reason: string }
  checklistDone?: number | "all"
}

const user = (userId: ID): Actor => ({ kind: "user", userId })
const SYSTEM: Actor = { kind: "system" }

class SeedBuilder {
  readonly now: Timestamp
  readonly today: DateOnly
  readonly rng: Rng = createRng(SEED_VERSION)
  readonly db: DemoDatabase
  private seq = new Map<string, number>()
  private events: PendingEvent[] = []
  private packages = new Map<ID, PackageFixture>()
  private genders = new Map<ID, "L" | "P">()
  private usedNames = new Set<string>()
  private phoneSeq = 100
  private contactSeq = 5000
  /** Customers who finished a trip and may book again after `freeFrom`. */
  private repeatPool: { customer: Customer; freeFrom: Timestamp }[] = []
  private repeatsUsed = 0

  constructor(now: Timestamp) {
    this.now = now
    this.today = toDateOnlyWIB(now)
    this.db = {
      meta: { schemaVersion: SCHEMA_VERSION, seedVersion: SEED_VERSION, seedAnchor: this.today, seededAt: now, counters: {} },
      destinations: {},
      packages: {},
      departures: {},
      guides: {},
      vendors: {},
      vendorAssignments: {},
      checklists: {},
      costItems: {},
      customers: {},
      travelers: {},
      bookings: {},
      bookingTravelers: {},
      inquiries: {},
      quotations: {},
      invoices: {},
      payments: {},
      articles: {},
      testimonials: {},
      users: {},
      roles: {},
      activity: {},
      siteContent: { ...SITE_CONTENT, updatedAt: now },
      settings: SETTINGS,
    }
  }

  // ------------------------------------------------------------------ helpers

  d(offset: number): DateOnly {
    return addDays(this.today, offset)
  }

  at(offset: number, hour = 9, minute = 0): Timestamp {
    return atWIB(this.d(offset), hour, minute)
  }

  /** Clamp a timestamp so nothing is dated in the future. */
  past(ts: Timestamp, marginMinutes = 5): Timestamp {
    const limit = addMinutes(this.now, -marginMinutes)
    return Date.parse(ts) > Date.parse(limit) ? limit : ts
  }

  id(prefix: string): ID {
    const n = (this.seq.get(prefix) ?? 0) + 1
    this.seq.set(prefix, n)
    return `${prefix}_s${pad(n)}`
  }

  stamp(createdAt: Timestamp, updatedAt: Timestamp = createdAt) {
    return { createdAt, updatedAt }
  }

  emit(event: PendingEvent) {
    this.events.push(event)
  }

  pkg(id: ID): PackageFixture {
    const found = this.packages.get(id)
    if (!found) throw new Error(`Unknown package ${id}`)
    return found
  }

  sales(): ID {
    return this.rng.pick(SALES)
  }

  // ------------------------------------------------------------------ catalog

  catalog() {
    const base = this.at(-420)
    for (const role of ROLES) this.db.roles[role.id] = role
    for (const u of USERS) this.db.users[u.id] = { ...u, ...this.stamp(u.status === "invited" ? this.at(-6) : base) }
    for (const g of GUIDES) this.db.guides[g.id] = { ...g, ...this.stamp(base) }
    for (const v of VENDORS) this.db.vendors[v.id] = { ...v, ...this.stamp(base) }
    for (const dst of DESTINATIONS) this.db.destinations[dst.id] = { ...dst, ...this.stamp(base, this.at(-30)) }

    for (const fixture of CATALOG_PACKAGES) this.addPackage(fixture, base)

    for (const article of ARTICLES) {
      const { publishedDaysAgo, ...rest } = article
      const createdAt = this.at(-(publishedDaysAgo ?? 3) - 4, 10)
      this.db.articles[article.id] = {
        ...rest,
        ...this.stamp(createdAt, publishedDaysAgo !== undefined ? this.at(-publishedDaysAgo, 10) : this.at(-2, 15)),
        publishedAt: publishedDaysAgo !== undefined ? this.at(-publishedDaysAgo, 10) : undefined,
      }
    }
    for (const t of TESTIMONIALS) {
      const { daysAgo, ...rest } = t
      this.db.testimonials[t.id] = { ...rest, ...this.stamp(this.at(-daysAgo, 14)) }
    }
    this.db.siteContent = { ...SITE_CONTENT, updatedAt: this.at(-6, 16), updatedBy: "usr_nadia" }
  }

  addPackage(fixture: PackageFixture, createdAt: Timestamp): TourPackage {
    this.packages.set(fixture.id, fixture)
    const { costTemplate, ...pkg } = fixture
    const entity: TourPackage = {
      ...pkg,
      ...this.stamp(createdAt, this.at(-20)),
      publishedAt: pkg.status === "published" ? addHours(createdAt, 48) : undefined,
    }
    this.db.packages[pkg.id] = entity
    for (const line of costTemplate) {
      const id = this.id("cst")
      this.db.costItems[id] = { id, owner: { type: "package", packageId: pkg.id }, ...line, ...this.stamp(createdAt) }
    }
    return entity
  }

  // ------------------------------------------------------------------ people

  personName(gender: "L" | "P", lastName?: string): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      const first = this.rng.pick(gender === "P" ? FIRST_NAMES_F : FIRST_NAMES_M)
      const name = `${first} ${lastName ?? this.rng.pick(LAST_NAMES)}`
      if (!this.usedNames.has(name)) {
        this.usedNames.add(name)
        return name
      }
    }
    return `${this.rng.pick(gender === "P" ? FIRST_NAMES_F : FIRST_NAMES_M)} ${this.rng.pick(LAST_NAMES)}`
  }

  nextPhone(): string {
    this.phoneSeq += 1
    return `+628110000${pad(this.phoneSeq)}`
  }

  contactPhone(): string {
    this.contactSeq += 1
    return `+628110000${pad(this.contactSeq)}`
  }

  newCustomer(input: { createdAt: Timestamp; source: Source; name?: string; gender?: "L" | "P"; city?: string }): Customer {
    const gender = input.gender ?? (this.rng.chance(0.5) ? "P" : "L")
    const fullName = input.name ?? this.personName(gender)
    if (input.name) this.usedNames.add(input.name)
    const id = this.id("cus")
    const slug = fullName
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .replace(/\s+/g, ".")
    const email = this.rng.chance(0.88) ? `${slug}${this.rng.chance(0.3) ? this.rng.int(1, 99) : ""}@${this.rng.pick(EMAIL_DOMAINS)}` : undefined
    const customer: Customer = {
      id,
      code: "",
      fullName,
      phone: this.nextPhone(),
      email: email && !Object.values(this.db.customers).some((c) => c.email === email) ? email : undefined,
      city: input.city ?? this.rng.pick(CITIES),
      preferredContact: this.rng.chance(0.75) ? "whatsapp" : this.rng.chance(0.5) ? "email" : "telepon",
      acquisitionSource: input.source,
      tags: [],
      notes: [],
      ...this.stamp(input.createdAt),
    }
    this.genders.set(id, gender)
    this.db.customers[id] = customer
    return customer
  }

  randomSource(): Source {
    const r = this.rng.next()
    if (r < 0.42) return "website"
    if (r < 0.67) return "whatsapp"
    if (r < 0.82) return "instagram"
    if (r < 0.9) return "referral"
    if (r < 0.95) return "tiktok"
    return "google_ads"
  }

  travelers(customer: Customer, pax: number, complete: boolean, at: Timestamp): ID[] {
    const ids: ID[] = []
    const family = pax >= 3 && this.rng.chance(0.4)
    const familyName = customer.fullName.split(" ").slice(1).join(" ") || undefined
    for (let i = 0; i < pax; i++) {
      const id = this.id("trv")
      const self = i === 0
      const gender = self ? (this.genders.get(customer.id) ?? "L") : this.rng.chance(0.5) ? "P" : "L"
      const child = family && i >= 2
      const traveler: Traveler = {
        id,
        customerId: customer.id,
        isCustomerSelf: self,
        ...this.stamp(at),
      }
      if (self || complete || this.rng.chance(0.4)) {
        traveler.fullName = self ? customer.fullName : this.personName(gender, family ? familyName : undefined)
      }
      if (complete) {
        traveler.gender = gender
        traveler.dateOfBirth = child
          ? `${this.rng.int(2012, 2019)}-${pad(this.rng.int(1, 12), 2)}-${pad(this.rng.int(1, 28), 2)}`
          : `${this.rng.int(1968, 2003)}-${pad(this.rng.int(1, 12), 2)}-${pad(this.rng.int(1, 28), 2)}`
        traveler.phone = self ? customer.phone : undefined
        traveler.emergencyContact = { name: this.personName(this.rng.chance(0.5) ? "P" : "L"), phone: this.contactPhone() }
        if (this.rng.chance(0.12)) traveler.dietaryNotes = this.rng.pick(DIETARY_NOTES)
      } else if (self) {
        traveler.phone = customer.phone
      }
      this.db.travelers[id] = traveler
      ids.push(id)
    }
    return ids
  }

  // ------------------------------------------------------------------ departures

  departure(spec: DepartureSpec): Departure {
    const pkg = this.pkg(spec.pkgId)
    const startDate = this.d(spec.start)
    const id = this.id("dep")
    const createdAt = this.at(Math.max(spec.start - 120, -240), 10)
    const dep: Departure = {
      id,
      code: "",
      packageId: pkg.id,
      kind: "scheduled",
      startDate,
      endDate: addDays(startDate, pkg.durationDays - 1),
      capacity: spec.capacity ?? pkg.groupSize.max,
      minParticipants: spec.min ?? 1,
      pricePerPaxOverride: spec.override,
      salesClosed: !!spec.salesClosed,
      salesClosedReason: spec.salesClosed,
      guideId: spec.guideId,
      ...this.stamp(createdAt),
    }
    if (spec.cancelled) {
      dep.cancelledAt = this.at(spec.cancelled.at, 15)
      dep.cancellationReason = spec.cancelled.reason
      dep.updatedAt = dep.cancelledAt
      this.emit({
        at: dep.cancelledAt,
        actor: user(OPS),
        subject: { type: "departure", id },
        action: "departure.cancelled",
        message: () => `Keberangkatan ${dep.code} dibatalkan: ${spec.cancelled!.reason}`,
      })
    }
    if (spec.salesClosed) {
      this.emit({
        at: this.at(-8, 11),
        actor: user(OPS),
        subject: { type: "departure", id },
        action: "departure.sales_closed",
        message: () => `Penjualan ${dep.code} ditutup: ${spec.salesClosed}`,
      })
    }
    this.db.departures[id] = dep
    this.copyCosts(dep, pkg.costTemplate, createdAt)
    this.checklist(dep, pkg, spec.checklistDone ?? 0)
    return dep
  }

  copyCosts(dep: Departure, template: CostLine[], createdAt: Timestamp) {
    for (const line of template) {
      const id = this.id("cst")
      this.db.costItems[id] = { id, owner: { type: "departure", departureId: dep.id }, ...line, ...this.stamp(createdAt) }
    }
  }

  /** Record actual spend for a finished departure (±6% around the estimate). */
  actuals(dep: Departure, complete: boolean) {
    const pax = this.paxOn(dep.id)
    const items = Object.values(this.db.costItems).filter((c) => c.owner.type === "departure" && c.owner.departureId === dep.id)
    items.forEach((item, index) => {
      if (!complete && index >= items.length - 2) return
      const estimate = item.unitCost * item.quantity * (item.basis === "per_pax" ? pax : 1)
      const variance = 1 + (this.rng.next() * 0.12 - 0.05)
      item.actualAmount = Math.round((estimate * variance) / 10_000) * 10_000
      item.updatedAt = this.at(diffDays(dep.endDate, this.today) + 3, 16)
    })
  }

  paxOn(departureId: ID): number {
    let pax = 0
    for (const b of Object.values(this.db.bookings)) {
      if (b.departureId !== departureId || (b.status !== "confirmed" && b.status !== "completed")) continue
      pax += Object.values(this.db.bookingTravelers).filter((bt) => bt.bookingId === b.id).length
    }
    return pax
  }

  vendorFor(destinationId: ID, categories: VendorCategory[]) {
    return Object.values(this.db.vendors).find((v) => categories.includes(v.category) && v.destinationIds.includes(destinationId))
  }

  checklist(dep: Departure, pkg: PackageFixture, done: number | "all") {
    const items = checklistTemplate(pkg)
    const order: ChecklistKey[] = ["transport", "accommodation", "guide", "itinerary", "equipment", "briefing", "traveler_data", "manifest"]
    const sorted = order.filter((key) => items.some((i) => i.key === key))
    const doneCount = done === "all" ? sorted.length : done
    const doneKeys = new Set(sorted.filter((key) => key !== "guide" || dep.guideId).slice(0, doneCount))
    const finished = dep.startDate <= this.today
    const doneAtBase = Math.min(diffDays(dep.startDate, this.today) - 3, -1)

    for (const item of items) {
      if (doneKeys.has(item.key)) {
        item.done = true
        item.doneAt = this.past(this.at(doneAtBase - this.rng.int(0, 10), this.rng.int(9, 17)))
        item.doneBy = OPS
      }
    }
    const id = this.id("chk")
    this.db.checklists[id] = { id, departureId: dep.id, items, ...this.stamp(dep.createdAt, finished ? this.at(doneAtBase) : this.past(this.at(-1))) }

    if (dep.cancelledAt) return
    // Main transport decides the vendor type; boat-based stays (no accommodation cost) sleep on the boat.
    const mainTransport = pkg.costTemplate.find((c) => c.category === "transport")?.label ?? ""
    const boat = /kapal|speedboat|phinisi|liveaboard/i.test(mainTransport)
    const transportVendor =
      this.vendorFor(pkg.destinationId, [boat ? "kapal" : "transportasi"]) ?? this.vendorFor(pkg.destinationId, ["transportasi", "kapal"])
    const sleepsOnBoat = boat && !pkg.costTemplate.some((c) => c.category === "accommodation")
    const lodgingVendor = pkg.durationNights === 0 ? undefined : sleepsOnBoat ? transportVendor : this.vendorFor(pkg.destinationId, ["akomodasi"])
    const assign = (vendorId: ID, service: VendorCategory, status: "requested" | "confirmed") => {
      const vid = this.id("vas")
      this.db.vendorAssignments[vid] = { id: vid, departureId: dep.id, vendorId, service, status, ...this.stamp(dep.createdAt) }
    }
    if (transportVendor) assign(transportVendor.id, transportVendor.category, doneKeys.has("transport") ? "confirmed" : "requested")
    if (lodgingVendor && lodgingVendor.id !== transportVendor?.id) {
      assign(lodgingVendor.id, lodgingVendor.category, doneKeys.has("accommodation") ? "confirmed" : "requested")
    }
  }

  // ------------------------------------------------------------------ bookings

  pickCustomer(plan: BookingPlan, createdAt: Timestamp): { customer: Customer; source: Source } {
    if (plan.customer) return { customer: plan.customer, source: plan.source ?? plan.customer.acquisitionSource }
    const candidates = this.repeatPool.filter((entry) => entry.freeFrom < createdAt)
    if (candidates.length > 0 && this.repeatsUsed < 18 && this.rng.chance(0.35)) {
      const entry = this.rng.pick(candidates)
      this.repeatPool.splice(this.repeatPool.indexOf(entry), 1)
      this.repeatsUsed += 1
      if (!entry.customer.tags.includes("repeat")) entry.customer.tags.push("repeat")
      return { customer: entry.customer, source: "repeat" }
    }
    const source = plan.source ?? this.randomSource()
    return { customer: this.newCustomer({ createdAt, source }), source }
  }

  bookingCreatedAt(plan: BookingPlan): Timestamp {
    const startOffset = diffDays(plan.dep.startDate, this.today)
    const offset =
      plan.createdOffset ??
      (() => {
        const hi = Math.min(startOffset - 18, -3)
        const lo = Math.min(Math.max(startOffset - 80, -200), hi)
        return this.rng.int(lo, hi)
      })()
    return this.at(offset, this.rng.int(8, 21), this.rng.int(0, 59))
  }

  book(plan: BookingPlan): Booking {
    const { dep, pax, outcome } = plan
    const pkg = this.pkg(dep.packageId)

    // --- timeline
    let createdAt: Timestamp
    let approvedAt: Timestamp | undefined
    if (outcome === "pending") {
      createdAt = addHours(this.now, -this.rng.int(2, 20))
    } else if (outcome === "awaiting" || outcome === "awaiting_submitted") {
      approvedAt = plan.approvedAt ?? addHours(this.now, -this.rng.int(4, 30))
      createdAt = addHours(approvedAt, -this.rng.int(1, 4))
    } else if (outcome === "awaiting_expiring") {
      approvedAt = addMinutes(this.now, -(48 * 60 - 280))
      createdAt = addHours(approvedAt, -2)
    } else if (outcome === "cancel_hold_expired") {
      approvedAt = this.at(this.rng.int(-9, -4), 10, 30)
      createdAt = addHours(approvedAt, -3)
    } else {
      createdAt = this.bookingCreatedAt(plan)
      approvedAt = plan.approvedAt ?? addHours(createdAt, this.rng.int(1, 5))
    }
    if (plan.approvedAt && !plan.createdOffset) createdAt = plan.approvedAt

    const { customer, source } = this.pickCustomer(plan, createdAt)
    const unitPrice = pricePerPax(pkg, pax, dep) ?? 0
    const lines: PriceLine[] = plan.lines ?? [
      { id: this.id("pl"), label: `${pkg.title} · ${formatDate(dep.startDate)}`, quantity: pax, unitPrice },
    ]
    const discount = plan.discount ?? 0
    const id = this.id("bk")
    const booking: Booking = {
      id,
      code: "",
      customerId: customer.id,
      packageId: pkg.id,
      departureId: dep.id,
      tripType: pkg.tripType,
      source,
      inquiryId: plan.inquiry?.id,
      quotationId: plan.quotation?.id,
      status: "pending",
      lines,
      discount,
      ...this.stamp(createdAt),
    }
    this.db.bookings[id] = booking
    const travelerComplete = plan.travelersComplete ?? outcome !== "pending"
    const travelerIds = this.travelers(customer, pax, travelerComplete, createdAt)
    travelerIds.forEach((travelerId, i) => {
      const btId = this.id("bt")
      this.db.bookingTravelers[btId] = { id: btId, bookingId: id, travelerId, isLead: i === 0 } satisfies BookingTraveler
    })

    const createdBy: Actor = plan.inquiry ? user(plan.inquiry.assigneeId ?? this.sales()) : source === "website" ? { kind: "customer", customerId: customer.id } : user(this.sales())
    this.emit({
      at: createdAt,
      actor: createdBy,
      subject: { type: "booking", id },
      related: [{ type: "departure", id: dep.id }, { type: "customer", id: customer.id }],
      action: "booking.created",
      message: () =>
        plan.inquiry
          ? `Booking ${booking.code} dibuat dari konversi inquiry ${plan.inquiry.code}`
          : source === "website"
            ? `Booking ${booking.code} masuk dari website untuk ${pkg.title} (${pax} pax)`
            : `Booking ${booking.code} dicatat dari ${SOURCE_LABEL[source]} untuk ${pkg.title} (${pax} pax)`,
    })

    if (outcome === "pending") {
      booking.holdExpiresAt = addHours(createdAt, this.db.settings.booking.pendingHoldHours)
      return booking
    }

    // --- approval & invoice
    const approvalTs = approvedAt!
    booking.status = "awaiting_payment"
    booking.holdExpiresAt = addHours(approvalTs, this.db.settings.booking.depositHoldHours)
    booking.updatedAt = approvalTs
    const total = priceTotal(booking)
    const invoiceId = this.id("inv")
    const invoice: Invoice = {
      id: invoiceId,
      number: "",
      bookingId: id,
      issuedAt: approvalTs,
      lines: booking.lines.map((line) => ({ ...line })),
      discount: booking.discount,
      installments: buildInstallments({
        total,
        depositPercent: pkg.paymentTerms.depositPercent,
        balanceDueDaysBefore: pkg.paymentTerms.balanceDueDaysBefore,
        departureStart: dep.startDate,
        today: toDateOnlyWIB(approvalTs),
        depositDueDate: toDateOnlyWIB(booking.holdExpiresAt),
      }).map((draft) => ({ ...draft, id: this.id("ins") })),
      ...this.stamp(approvalTs),
    }
    this.db.invoices[invoiceId] = invoice
    const approver = plan.inquiry?.assigneeId ?? this.sales()
    this.emit({
      at: approvalTs,
      actor: user(approver),
      subject: { type: "booking", id },
      related: [{ type: "invoice", id: invoiceId }],
      action: plan.inquiry ? "invoice.issued" : "booking.approved",
      message: () =>
        plan.inquiry
          ? `Invoice ${invoice.number} diterbitkan untuk booking ${booking.code}`
          : `Booking ${booking.code} diverifikasi, invoice ${invoice.number} diterbitkan`,
    })

    if (outcome === "awaiting" || outcome === "awaiting_expiring") return booking
    if (outcome === "awaiting_submitted") {
      this.payment(booking, invoice, invoice.installments[0].amount, addHours(this.now, -2), { verified: false, byCustomer: true })
      return booking
    }
    if (outcome === "cancel_hold_expired") {
      const at = addMinutes(booking.holdExpiresAt, 7)
      this.cancel(booking, invoice, { at, by: SYSTEM, reason: "hold_expired", fee: 0, refund: 0, refundDone: false })
      return booking
    }

    // --- deposit
    const deposit = invoice.installments[0]
    const depositPaidAt = this.past(addHours(approvalTs, this.rng.int(2, 26)), 90)
    const depositVerifiedAt = this.payment(booking, invoice, deposit.amount, depositPaidAt, { verified: true, byCustomer: source === "website" })
    booking.status = "confirmed"
    booking.confirmedAt = depositVerifiedAt
    booking.holdExpiresAt = undefined
    booking.updatedAt = depositVerifiedAt
    this.emit({
      at: depositVerifiedAt,
      actor: SYSTEM,
      subject: { type: "booking", id },
      action: "booking.confirmed",
      message: () => `Booking ${booking.code} terkonfirmasi setelah ${deposit.kind === "full" ? "pembayaran" : "DP"} diterima`,
    })

    const balance = invoice.installments[1]
    const cancelAt =
      outcome === "cancel_departure" ? dep.cancelledAt : outcome === "cancel_customer" ? this.at(plan.cancelOffset ?? -5, 11) : undefined
    const payBalance = (status: "verified" | "pending") => {
      if (!balance) return
      const due = atWIB(balance.dueDate, 10)
      const lo = addHours(depositVerifiedAt, 24 * 4)
      const latest = cancelAt ? addHours(cancelAt, -24) : addHours(this.now, -3)
      const hi = Date.parse(due) < Date.parse(latest) ? addHours(due, -24) : latest
      const paidAt =
        Date.parse(hi) > Date.parse(lo)
          ? new Date(Date.parse(lo) + this.rng.next() * (Date.parse(hi) - Date.parse(lo))).toISOString()
          : this.past(addHours(depositVerifiedAt, 6), 60)
      this.payment(booking, invoice, balance.amount, status === "pending" ? addHours(this.now, -5) : paidAt, {
        verified: status === "verified",
        byCustomer: status === "pending" || source === "website",
      })
    }

    switch (outcome) {
      case "confirmed_paid":
      case "completed":
        payBalance("verified")
        break
      case "confirmed_balance_pending":
        payBalance("pending")
        break
      case "confirmed_deposit":
      case "confirmed_overdue":
        break
      case "cancel_customer":
      case "cancel_departure":
        if (plan.paidInFull) payBalance("verified")
        break
    }

    if (outcome === "completed") {
      const completedAt = atWIB(addDays(dep.endDate, 1), 9)
      booking.status = "completed"
      booking.completedAt = completedAt
      booking.updatedAt = completedAt
      this.repeatPool.push({ customer, freeFrom: completedAt })
      this.emit({
        at: completedAt,
        actor: SYSTEM,
        subject: { type: "booking", id },
        action: "booking.completed",
        message: () => `Trip selesai, booking ${booking.code} ditandai Selesai`,
      })
    }

    if (outcome === "cancel_customer" || outcome === "cancel_departure") {
      const reason: CancellationReason = outcome === "cancel_customer" ? "customer_request" : "departure_cancelled"
      const at = cancelAt!
      const paidNet = this.paidNet(id)
      const quote = cancellationQuote({
        status: "confirmed",
        reason,
        total,
        paidNet,
        departureStart: dep.startDate,
        today: toDateOnlyWIB(at),
        policy: pkg.cancellationPolicy,
      })
      this.cancel(booking, invoice, {
        at,
        by: outcome === "cancel_customer" ? user(this.sales()) : user(OPS),
        reason,
        fee: quote.fee,
        refund: quote.refund,
        refundDone: !!plan.refundDone,
      })
    }
    return booking
  }

  paidNet(bookingId: ID): number {
    return Object.values(this.db.payments)
      .filter((p) => p.bookingId === bookingId && p.status === "verified")
      .reduce((sum, p) => sum + (p.direction === "in" ? p.amount : -p.amount), 0)
  }

  payment(
    booking: Booking,
    invoice: Invoice,
    amount: number,
    paidAt: Timestamp,
    opts: { verified: boolean; byCustomer: boolean; direction?: "in" | "refund" },
  ): Timestamp {
    const id = this.id("pay")
    const direction = opts.direction ?? "in"
    const methods: PaymentMethod[] = ["transfer_bank", "transfer_bank", "virtual_account", "qris"]
    const verifiedAt = opts.verified ? this.past(addHours(paidAt, this.rng.int(1, 3)), 2) : undefined
    const payment: Payment = {
      id,
      code: "",
      bookingId: booking.id,
      invoiceId: invoice.id,
      direction,
      amount,
      method: direction === "refund" ? "transfer_bank" : this.rng.pick(methods),
      status: opts.verified ? "verified" : "pending_verification",
      paidAt,
      reference: `TRF${this.rng.int(100000, 999999)}`,
      submittedBy: opts.byCustomer ? { kind: "customer", customerId: booking.customerId } : user(FINANCE),
      verifiedAt,
      verifiedBy: opts.verified ? FINANCE : undefined,
      ...this.stamp(paidAt, verifiedAt ?? paidAt),
    }
    if (opts.byCustomer && direction === "in") payment.proofMediaId = PROOF_ILLUSTRATION_ID
    this.db.payments[id] = payment

    if (direction === "refund") {
      this.emit({
        at: verifiedAt ?? paidAt,
        actor: user(FINANCE),
        subject: { type: "booking", id: booking.id },
        related: [{ type: "payment", id }],
        action: "refund.recorded",
        message: () => `Refund ${formatIDR(amount)} untuk booking ${booking.code} telah ditransfer`,
      })
      return verifiedAt ?? paidAt
    }
    this.emit({
      at: paidAt,
      actor: opts.byCustomer ? { kind: "customer", customerId: booking.customerId } : user(FINANCE),
      subject: { type: "booking", id: booking.id },
      related: [{ type: "payment", id }],
      action: opts.byCustomer ? "payment.submitted" : "payment.recorded",
      message: () =>
        opts.byCustomer
          ? `Pelanggan mengirim konfirmasi pembayaran ${formatIDR(amount)} untuk booking ${booking.code}`
          : `Pembayaran ${formatIDR(amount)} untuk booking ${booking.code} dicatat`,
    })
    if (verifiedAt) {
      this.emit({
        at: verifiedAt,
        actor: user(FINANCE),
        subject: { type: "booking", id: booking.id },
        related: [{ type: "payment", id }],
        action: "payment.verified",
        message: () => `Pembayaran ${payment.code} sebesar ${formatIDR(amount)} diverifikasi`,
      })
    }
    return verifiedAt ?? paidAt
  }

  cancel(
    booking: Booking,
    invoice: Invoice,
    input: { at: Timestamp; by: Actor; reason: CancellationReason; fee: number; refund: number; refundDone: boolean },
  ) {
    booking.status = "cancelled"
    booking.holdExpiresAt = undefined
    booking.cancellation = { at: input.at, by: input.by, reason: input.reason, feeAmount: input.fee, refundAmount: input.refund }
    booking.updatedAt = input.at
    invoice.voidedAt = input.at
    invoice.updatedAt = input.at
    this.emit({
      at: input.at,
      actor: input.by,
      subject: { type: "booking", id: booking.id },
      action: "booking.cancelled",
      message: () =>
        `Booking ${booking.code} dibatalkan (${CANCELLATION_REASON_LABEL[input.reason].toLowerCase()})` +
        (input.refund > 0 ? `, refund ${formatIDR(input.refund)}` : ""),
      data: { fee: input.fee, refund: input.refund },
    })
    if (input.refund > 0 && input.refundDone) {
      this.payment(booking, invoice, input.refund, this.past(addHours(input.at, 46), 30), {
        verified: true,
        byCustomer: false,
        direction: "refund",
      })
    }
  }

  /** Split a seat total into realistic party sizes (mostly 2–4). */
  splitPax(total: number): number[] {
    const sizes: number[] = []
    let left = total
    while (left > 0) {
      const r = this.rng.next()
      const size = Math.min(left, r < 0.05 ? 1 : r < 0.25 ? 2 : r < 0.55 ? 3 : r < 0.8 ? 4 : 5)
      sizes.push(size)
      left -= size
    }
    return sizes
  }

  fill(dep: Departure, total: number, outcome: Outcome | ((index: number) => Outcome), extra: Partial<BookingPlan> = {}) {
    this.splitPax(total).forEach((pax, index) => {
      this.book({ dep, pax, outcome: typeof outcome === "function" ? outcome(index) : outcome, ...extra })
    })
  }

  // ------------------------------------------------------------------ scenarios

  scheduledTrips() {
    const D = (spec: DepartureSpec) => this.departure(spec)
    const mostlyPaid = (overdueIndex: number) => (i: number) => (i === overdueIndex ? "confirmed_overdue" : "confirmed_paid") as Outcome
    const mix = (i: number): Outcome => (i % 2 === 0 ? "confirmed_paid" : "confirmed_deposit")

    // Past, completed
    const d01 = D({ pkgId: "pkg_lbj_sailing_3h2m", start: -150, min: 9, guideId: "gde_kornelis", checklistDone: "all" })
    this.fill(d01, 14, "completed")
    this.actuals(d01, true)
    const d02 = D({ pkgId: "pkg_brm_sunrise_1h", start: -120, min: 9, guideId: "gde_arief", checklistDone: "all" })
    this.fill(d02, 14, "completed")
    this.actuals(d02, true)
    const d03 = D({ pkgId: "pkg_bali_munduk_2h1m", start: -95, min: 5, guideId: "gde_made", checklistDone: "all" })
    this.fill(d03, 8, "completed")
    this.book({ dep: d03, pax: 2, outcome: "cancel_customer", paidInFull: true, createdOffset: -150, cancelOffset: -131, refundDone: true })
    this.actuals(d03, true)
    const d04 = D({ pkgId: "pkg_yog_heritage_3h2m", start: -70, min: 5, guideId: "gde_rara", checklistDone: "all" })
    this.fill(d04, 11, "completed")
    this.actuals(d04, true)
    const d05 = D({ pkgId: "pkg_np_west_snorkeling_1h", start: -45, min: 7, guideId: "gde_kadek", checklistDone: "all" })
    this.fill(d05, 10, "completed")
    this.actuals(d05, false)
    const d06 = D({ pkgId: "pkg_lbk_gili_3h2m", start: -12, min: 5, guideId: "gde_lalu", checklistDone: "all" })
    this.fill(d06, 9, "completed")
    this.actuals(d06, false)

    // Past, cancelled below minimum
    const d07 = D({ pkgId: "pkg_ra_wayag_piaynemo_5h4m", start: -40, min: 6, cancelled: { at: -62, reason: "Peserta terkonfirmasi di bawah minimum" } })
    this.book({ dep: d07, pax: 3, outcome: "cancel_departure", createdOffset: -95, refundDone: true })

    // In progress
    const d08 = D({ pkgId: "pkg_lbj_sailing_3h2m", start: -1, min: 9, guideId: "gde_agustinus", checklistDone: "all" })
    this.fill(d08, 13, "confirmed_paid")

    // Upcoming
    const d09 = D({ pkgId: "pkg_lbj_sailing_3h2m", start: 12, min: 9, guideId: "gde_kornelis", override: 3_750_000, checklistDone: 5 })
    this.fill(d09, 16, (i) => (i === 1 ? "confirmed_overdue" : i === 2 ? "confirmed_balance_pending" : "confirmed_paid"))
    this.markIncompleteTraveler(d09)

    const d10 = D({ pkgId: "pkg_brm_sunrise_1h", start: 5, min: 9, guideId: "gde_arief", checklistDone: 2 })
    this.fill(d10, 12, "confirmed_paid")
    this.book({ dep: d10, pax: 2, outcome: "pending", source: "website" })

    const d11 = D({ pkgId: "pkg_lbk_gili_3h2m", start: 20, min: 5, guideId: "gde_lalu", checklistDone: 2 })
    this.fill(d11, 9, mix)
    this.book({ dep: d11, pax: 2, outcome: "awaiting" })
    this.book({ dep: d11, pax: 1, outcome: "awaiting", source: "website" })

    const d12 = D({ pkgId: "pkg_np_west_snorkeling_1h", start: 9, min: 7, guideId: "gde_made", checklistDone: 3 })
    this.fill(d12, 8, "confirmed_paid")
    this.book({ dep: d12, pax: 3, outcome: "awaiting_expiring", source: "whatsapp" })
    this.book({ dep: d12, pax: 2, outcome: "cancel_customer", createdOffset: -30, cancelOffset: -5, refundDone: false })

    const d13 = D({ pkgId: "pkg_ra_wayag_piaynemo_5h4m", start: 34, min: 6, guideId: "gde_yonas", checklistDone: 1 })
    this.fill(d13, 4, mix)

    const d14 = D({ pkgId: "pkg_lbk_rinjani_3h2m", start: 45, min: 4, guideId: "gde_lalu", salesClosed: "Ditutup sementara menunggu pembukaan jalur pendakian" })
    this.fill(d14, 6, mix)

    const d15 = D({ pkgId: "pkg_brm_ijen_3h2m", start: 28, min: 6, cancelled: { at: -3, reason: "Akses Kawah Ijen ditutup sementara oleh pengelola" } })
    this.book({ dep: d15, pax: 3, outcome: "cancel_departure", createdOffset: -34, refundDone: true })
    this.book({ dep: d15, pax: 2, outcome: "cancel_departure", createdOffset: -21, refundDone: false })

    const d16 = D({ pkgId: "pkg_yog_heritage_3h2m", start: 7, min: 5, guideId: "gde_rara", checklistDone: "all" })
    this.fill(d16, 7, mostlyPaid(0))

    const d17 = D({ pkgId: "pkg_lbj_daytrip_speedboat", start: 13, min: 6, checklistDone: 1 })
    this.fill(d17, 5, "confirmed_paid")

    const d18 = D({ pkgId: "pkg_blt_island_hopping_3h2m", start: 16, min: 5 })
    this.fill(d18, 6, mix)
    this.book({ dep: d18, pax: 2, outcome: "pending", source: "website", travelersComplete: false })

    const d19 = D({ pkgId: "pkg_brm_ijen_3h2m", start: 52, min: 6, guideId: "gde_arief" })
    this.fill(d19, 4, "confirmed_deposit")
    this.book({ dep: d19, pax: 2, outcome: "cancel_hold_expired", source: "instagram" })

    const d20 = D({ pkgId: "pkg_brm_sunrise_1h", start: 33, min: 9, guideId: "gde_arief" })
    this.fill(d20, 3, "confirmed_paid")
    this.book({ dep: d20, pax: 2, outcome: "awaiting_submitted", source: "website" })

    const d21 = D({ pkgId: "pkg_lbj_sailing_3h2m", start: 60, min: 9, guideId: "gde_agustinus" })
    this.fill(d21, 2, "confirmed_deposit")
    this.book({ dep: d21, pax: 2, outcome: "pending", source: "website" })
    this.book({ dep: d21, pax: 1, outcome: "cancel_hold_expired", source: "website" })

    D({ pkgId: "pkg_lbk_gili_3h2m", start: 95, min: 5 })
  }

  /** Leave one traveler on an upcoming departure without full data. */
  markIncompleteTraveler(dep: Departure) {
    const booking = Object.values(this.db.bookings).find((b) => b.departureId === dep.id && b.status === "confirmed")
    if (!booking) return
    const bt = Object.values(this.db.bookingTravelers).find((x) => x.bookingId === booking.id && !x.isLead)
    if (!bt) return
    const traveler = this.db.travelers[bt.travelerId]
    traveler.dateOfBirth = undefined
    traveler.emergencyContact = undefined
  }

  // ------------------------------------------------------------------ inquiries

  inquiry(input: {
    type: InquiryType
    customer: Customer
    source: Source
    createdOffset: number
    createdHour?: number
    stage: PipelineStage
    history: [PipelineStage, number][]
    packageId?: ID
    destinationIds?: ID[]
    travelDates: TravelDates
    durationDays?: number
    groupSize: number
    budget?: BudgetRange
    interests?: Interest[]
    message?: string
    assigneeId?: ID
    nextFollowUp?: number
    lostReason?: LostReason
    followUps?: { offset: number; channel: "whatsapp" | "telepon" | "email" | "meeting"; body: string }[]
  }): Inquiry {
    const createdAt = input.createdOffset === 0 ? addHours(this.now, -(input.createdHour ?? 3)) : this.at(input.createdOffset, input.createdHour ?? 10, this.rng.int(0, 59))
    const id = this.id("inq")
    const assigneeId = input.assigneeId ?? (input.stage === "new" ? undefined : this.sales())
    const inquiry: Inquiry = {
      id,
      code: "",
      type: input.type,
      customerId: input.customer.id,
      contactSnapshot: { fullName: input.customer.fullName, phone: input.customer.phone, email: input.customer.email },
      source: input.source,
      packageId: input.packageId,
      destinationIds: input.destinationIds ?? (input.packageId ? [this.pkg(input.packageId).destinationId] : []),
      travelDates: input.travelDates,
      durationDays: input.durationDays,
      groupSize: input.groupSize,
      budgetPerPax: input.budget,
      interests: input.interests ?? [],
      message: input.message,
      stage: input.stage,
      lostReason: input.lostReason,
      assigneeId,
      nextFollowUpDate: input.nextFollowUp !== undefined ? this.d(input.nextFollowUp) : undefined,
      followUps: [],
      ...this.stamp(createdAt),
    }
    this.db.inquiries[id] = inquiry
    this.emit({
      at: createdAt,
      actor: input.source === "website" ? { kind: "customer", customerId: input.customer.id } : user(assigneeId ?? this.sales()),
      subject: { type: "inquiry", id },
      related: [{ type: "customer", id: input.customer.id }],
      action: "inquiry.created",
      message: () => `Inquiry ${inquiry.code} masuk dari ${SOURCE_LABEL[input.source]}: ${input.customer.fullName}, ${input.groupSize} orang`,
    })
    for (const f of input.followUps ?? []) {
      const at = this.past(this.at(f.offset, this.rng.int(9, 18), this.rng.int(0, 59)))
      inquiry.followUps.push({ id: this.id("fu"), channel: f.channel, body: f.body, authorId: assigneeId ?? SALES[0], at })
      inquiry.updatedAt = at
    }
    let previous: PipelineStage = "new"
    for (const [stage, offset] of input.history) {
      const at = this.past(this.at(offset, this.rng.int(10, 17)))
      const from = previous
      this.emit({
        at,
        actor: user(assigneeId ?? SALES[0]),
        subject: { type: "inquiry", id },
        action: "inquiry.stage_changed",
        message: () =>
          `Tahap ${inquiry.code}: ${PIPELINE_STAGE_LABEL[from]} → ${PIPELINE_STAGE_LABEL[stage]}` +
          (stage === "lost" && input.lostReason ? ` (${LOST_REASON_LABEL[input.lostReason]})` : ""),
        data: { from, to: stage },
      })
      previous = stage
      inquiry.updatedAt = at
    }
    return inquiry
  }

  quotation(
    inquiry: Inquiry,
    input: {
      version: number
      status: Quotation["status"]
      sentOffset: number
      validDays: number
      respondedOffset?: number
      title: string
      packageId?: ID
      proposedStart: number
      durationDays: number
      lines: Omit<PriceLine, "id">[]
      discount?: number
      itinerarySummary?: string[]
    },
  ): Quotation {
    const id = this.id("quo")
    const sentAt = this.past(this.at(input.sentOffset, 14))
    const quotation: Quotation = {
      id,
      code: "",
      inquiryId: inquiry.id,
      version: input.version,
      title: input.title,
      packageId: input.packageId,
      proposedStartDate: this.d(input.proposedStart),
      durationDays: input.durationDays,
      groupSize: inquiry.groupSize,
      lines: input.lines.map((line) => ({ ...line, id: this.id("pl") })),
      discount: input.discount ?? 0,
      itinerarySummary: input.itinerarySummary ?? [],
      validUntil: addDays(toDateOnlyWIB(sentAt), input.validDays),
      status: input.status,
      sentAt: input.status === "draft" ? undefined : sentAt,
      respondedAt: input.respondedOffset !== undefined ? this.past(this.at(input.respondedOffset, 16)) : undefined,
      ...this.stamp(addHours(sentAt, -3), sentAt),
    }
    this.db.quotations[id] = quotation
    if (quotation.sentAt) {
      this.emit({
        at: quotation.sentAt,
        actor: user(inquiry.assigneeId ?? SALES[0]),
        subject: { type: "inquiry", id: inquiry.id },
        related: [{ type: "quotation", id }],
        action: "quotation.sent",
        message: () => `Penawaran ${quotation.code} sebesar ${formatIDR(priceTotal(quotation))} dikirim`,
      })
    }
    if (quotation.status === "accepted" && quotation.respondedAt) {
      this.emit({
        at: quotation.respondedAt,
        actor: user(inquiry.assigneeId ?? SALES[0]),
        subject: { type: "inquiry", id: inquiry.id },
        related: [{ type: "quotation", id }],
        action: "quotation.accepted",
        message: () => `Penawaran ${quotation.code} disetujui pelanggan`,
      })
    }
    return quotation
  }

  /** Inquiry conversion into a private departure + booking (docs/domain-model.md §6.7). */
  convert(inquiry: Inquiry, quotation: Quotation, input: { offset: number; outcome: Outcome; guideId?: ID; packageFixture?: PackageFixture; checklistDone?: number | "all" }) {
    const convertedAt = input.offset === 0 ? addHours(this.now, -10) : this.at(input.offset, 15)
    const pkg = input.packageFixture ? this.addPackage(input.packageFixture, convertedAt) : this.db.packages[quotation.packageId!]
    if (input.packageFixture) {
      this.emit({
        at: convertedAt,
        actor: user(inquiry.assigneeId ?? SALES[0]),
        subject: { type: "package", id: pkg.id },
        related: [{ type: "quotation", id: quotation.id }],
        action: "package.created_from_quotation",
        message: () => `Paket custom "${pkg.title}" dibuat dari penawaran ${quotation.code}`,
      })
    }
    const start = diffDays(quotation.proposedStartDate, this.today)
    const dep = this.departure({ pkgId: pkg.id, start, capacity: inquiry.groupSize, min: 1, guideId: input.guideId, checklistDone: input.checklistDone ?? 0 })
    dep.kind = "private"
    dep.createdAt = convertedAt
    dep.updatedAt = convertedAt
    const booking = this.book({
      dep,
      pax: inquiry.groupSize,
      outcome: input.outcome,
      customer: this.db.customers[inquiry.customerId],
      source: inquiry.source,
      inquiry,
      quotation,
      lines: quotation.lines.map((line) => ({ ...line, id: this.id("pl") })),
      discount: quotation.discount,
      approvedAt: convertedAt,
    })
    inquiry.convertedBookingId = booking.id
    inquiry.updatedAt = convertedAt
    this.emit({
      at: convertedAt,
      actor: user(inquiry.assigneeId ?? SALES[0]),
      subject: { type: "inquiry", id: inquiry.id },
      related: [{ type: "booking", id: booking.id }],
      action: "inquiry.converted",
      message: () => `Inquiry ${inquiry.code} dikonversi menjadi booking ${booking.code}`,
    })
    return { dep, booking }
  }

  customPackage(input: {
    id: ID
    slug: string
    code: string
    title: string
    destinationId: ID
    days: number
    summary: string
    plan: string[]
    coverMediaId: ID
    galleryMediaIds: ID[]
    costTemplate: CostLine[]
    quotationId: ID
  }): PackageFixture {
    return {
      id: input.id,
      slug: input.slug,
      code: input.code,
      title: input.title,
      tripType: "custom",
      visibility: "unlisted",
      status: "published",
      destinationId: input.destinationId,
      durationDays: input.days,
      durationNights: input.days - 1,
      summary: input.summary,
      overview: [input.summary],
      highlights: [],
      itinerary: input.plan.map((line, i) => day(input.id, i + 1, line, "Detail kegiatan mengikuti penawaran yang disetujui.", [], i === input.plan.length - 1 ? "BL" : "BLD")),
      inclusions: ["Sesuai rincian penawaran"],
      exclusions: ["Tiket pesawat menuju titik kumpul"],
      meetingPoint: { name: "Disepakati bersama pelanggan", address: "-" },
      requirements: { fitness: "sedang", notes: [] },
      terms: PRIVATE_TRIP_TERMS,
      cancellationPolicy: STANDARD_POLICY,
      paymentTerms: { depositPercent: 30, balanceDueDaysBefore: 14 },
      pricing: { kind: "quoted" },
      groupSize: { min: 1, max: 20 },
      faqs: [],
      coverMediaId: input.coverMediaId,
      galleryMediaIds: input.galleryMediaIds,
      tags: ["custom"],
      isCustomizable: false,
      sourceQuotationId: input.quotationId,
      costTemplate: input.costTemplate,
    }
  }

  privateTrips() {
    // A — Private Phinisi, completed
    const a = this.newCustomer({ createdAt: this.at(-112, 10), source: "instagram", name: "Rendra Nasution", gender: "L", city: "Medan" })
    const inqA = this.inquiry({ type: "private", customer: a, source: "instagram", createdOffset: -112, stage: "won", history: [["contacted", -111], ["quotation_sent", -108], ["won", -102]], packageId: "pkg_lbj_private_phinisi_4h3m", travelDates: { kind: "exact", startDate: this.d(-60) }, groupSize: 4, interests: ["snorkeling", "fotografi"], assigneeId: "usr_dimas", followUps: [{ offset: -111, channel: "whatsapp", body: "Konfirmasi tanggal dan jumlah peserta; tamu ingin kapal dengan kabin ber-AC." }] })
    const quoA = this.quotation(inqA, { version: 1, status: "accepted", sentOffset: -108, validDays: 7, respondedOffset: -102, title: "Private Phinisi Labuan Bajo 4H3M · 4 pax", packageId: "pkg_lbj_private_phinisi_4h3m", proposedStart: -60, durationDays: 4, lines: [{ label: "Private Phinisi Labuan Bajo · 4 pax", quantity: 4, unitPrice: 9_750_000 }] })
    this.convert(inqA, quoA, { offset: -101, outcome: "completed", guideId: "gde_agustinus", checklistDone: "all" })

    // B — Custom Bali & Nusa Penida for an office group, completed
    const b = this.newCustomer({ createdAt: this.at(-74, 10), source: "referral", name: "Clarissa Gunawan", gender: "P", city: "Jakarta Selatan" })
    const inqB = this.inquiry({ type: "custom", customer: b, source: "referral", createdOffset: -74, stage: "won", history: [["contacted", -73], ["quotation_sent", -70], ["negotiation", -68], ["won", -64]], destinationIds: ["dst_bali", "dst_nusa_penida"], travelDates: { kind: "range", from: this.d(-27), to: this.d(-20) }, durationDays: 4, groupSize: 8, budget: "3_5jt", interests: ["santai", "snorkeling", "kuliner"], message: "Outing kantor 8 orang, ingin kombinasi Ubud dan Nusa Penida, tidak terlalu padat.", assigneeId: "usr_sekar", followUps: [{ offset: -73, channel: "meeting", body: "Meeting online dengan HR; fokus team bonding dan waktu santai." }, { offset: -67, channel: "email", body: "Kirim revisi: tambah makan malam bersama di hari ketiga." }] })
    const quoB = this.quotation(inqB, { version: 1, status: "accepted", sentOffset: -70, validDays: 10, respondedOffset: -64, title: "Custom Bali & Nusa Penida · 8 pax", proposedStart: -25, durationDays: 4, lines: [{ label: "Paket custom Bali & Nusa Penida 4H3M (per orang)", quantity: 8, unitPrice: 4_950_000 }, { label: "Makan malam bersama di Jimbaran", quantity: 1, unitPrice: 2_400_000 }], discount: 1_000_000, itinerarySummary: ["Tiba & Ubud", "Nusa Penida barat", "Nusa Penida timur & makan malam bersama", "Kembali"] })
    const pkgB = this.customPackage({ id: "pkg_custom_bali_penida", slug: "custom-bali-nusa-penida-rombongan-kantor", code: "NV-CUS-0001", title: "Custom Trip Bali & Nusa Penida — Rombongan Kantor", destinationId: "dst_nusa_penida", days: 4, summary: "Perjalanan custom 4 hari untuk outing kantor 8 orang.", plan: quoB.itinerarySummary, coverMediaId: "img-np-east-coast", galleryMediaIds: ["img-bali-ubud-palms", "img-np-treehouse"], costTemplate: [fixed("transport", "Mobil & kapal cepat rombongan", 7_000_000), fixed("guide", "Guide 4 hari", 2_600_000), fixed("meals", "Makan malam bersama", 2_400_000), perPax("accommodation", "Hotel 3 malam (berbagi)", 1_650_000), perPax("meals", "Makan harian", 450_000), perPax("tickets", "Tiket & retribusi", 300_000)], quotationId: quoB.id })
    this.convert(inqB, quoB, { offset: -63, outcome: "completed", guideId: "gde_made", packageFixture: pkgB, checklistDone: "all" })

    // C — Honeymoon, confirmed with deposit
    const c = this.newCustomer({ createdAt: this.at(-46, 20), source: "website", name: "Maria Kusuma", gender: "P", city: "Surabaya" })
    const inqC = this.inquiry({ type: "private", customer: c, source: "website", createdOffset: -46, createdHour: 20, stage: "won", history: [["contacted", -45], ["quotation_sent", -44], ["won", -41]], packageId: "pkg_bali_honeymoon_5h4m", travelDates: { kind: "exact", startDate: this.d(18) }, groupSize: 2, interests: ["honeymoon", "santai"], message: "Bulan madu setelah resepsi, ingin vila yang tenang.", assigneeId: "usr_sekar" })
    const quoC = this.quotation(inqC, { version: 1, status: "accepted", sentOffset: -44, validDays: 7, respondedOffset: -41, title: "Bali Honeymoon Retreat · 2 pax", packageId: "pkg_bali_honeymoon_5h4m", proposedStart: 18, durationDays: 5, lines: [{ label: "Bali Honeymoon Retreat · 2 pax", quantity: 2, unitPrice: 11_800_000 }] })
    this.convert(inqC, quoC, { offset: -40, outcome: "confirmed_deposit", guideId: "gde_made", checklistDone: 3 })

    // D — Jogja family, confirmed & paid
    const dCust = this.newCustomer({ createdAt: this.at(-52, 9), source: "whatsapp", name: "Haris Siregar", gender: "L", city: "Medan" })
    const inqD = this.inquiry({ type: "private", customer: dCust, source: "whatsapp", createdOffset: -52, stage: "won", history: [["contacted", -52], ["quotation_sent", -50], ["won", -47]], packageId: "pkg_yog_family_4h3m", travelDates: { kind: "exact", startDate: this.d(40) }, groupSize: 6, interests: ["keluarga", "budaya"], message: "Dua keluarga, 4 dewasa dan 2 anak usia 8 dan 10 tahun.", assigneeId: "usr_dimas" })
    const quoD = this.quotation(inqD, { version: 1, status: "accepted", sentOffset: -50, validDays: 7, respondedOffset: -47, title: "Private Jogja Family Trip · 6 pax", packageId: "pkg_yog_family_4h3m", proposedStart: 40, durationDays: 4, lines: [{ label: "Private Jogja Family Trip · 6 pax", quantity: 6, unitPrice: 2_850_000 }], discount: 500_000 })
    this.convert(inqD, quoD, { offset: -46, outcome: "confirmed_paid", guideId: "gde_rara", checklistDone: 2 })

    // E — Custom Raja Ampat diving, converted 10 hours ago, awaiting payment
    const e = this.newCustomer({ createdAt: this.at(-21, 11), source: "referral", name: "Andreas Halim", gender: "L", city: "Medan" })
    const inqE = this.inquiry({ type: "custom", customer: e, source: "referral", createdOffset: -21, stage: "won", history: [["contacted", -20], ["quotation_sent", -16], ["negotiation", -12], ["quotation_sent", -6], ["won", -2]], destinationIds: ["dst_raja_ampat"], travelDates: { kind: "flexible", month: this.d(75).slice(0, 7) }, durationDays: 6, groupSize: 4, budget: "gt_20jt", interests: ["diving", "snorkeling", "fotografi"], message: "Keluarga Halim, 2 penyelam bersertifikat dan 2 snorkeler.", assigneeId: "usr_dimas", followUps: [{ offset: -20, channel: "telepon", body: "Diskusi kebutuhan diving dan sertifikasi peserta." }, { offset: -11, channel: "whatsapp", body: "Tamu minta opsi homestay lebih nyaman; siapkan revisi." }] })
    this.quotation(inqE, { version: 1, status: "rejected", sentOffset: -16, validDays: 7, respondedOffset: -12, title: "Custom Raja Ampat Diving · 4 pax", proposedStart: 75, durationDays: 6, lines: [{ label: "Paket custom Raja Ampat Diving 6H5M (per orang)", quantity: 4, unitPrice: 24_500_000 }], itinerarySummary: ["Sorong – Waisai", "Cape Kri & Sardine Reef", "Piaynemo", "Arborek & Manta Sandy", "Friwen Wall", "Kembali"] })
    const quoE = this.quotation(inqE, { version: 2, status: "accepted", sentOffset: -6, validDays: 7, respondedOffset: -2, title: "Custom Raja Ampat Diving · 4 pax (revisi)", proposedStart: 75, durationDays: 6, lines: [{ label: "Paket custom Raja Ampat Diving 6H5M (per orang)", quantity: 4, unitPrice: 22_500_000 }, { label: "Upgrade resor tepi laut", quantity: 1, unitPrice: 4_000_000 }], itinerarySummary: ["Sorong – Waisai", "Cape Kri & Sardine Reef", "Piaynemo", "Arborek & Manta Sandy", "Friwen Wall", "Kembali"] })
    const pkgE = this.customPackage({ id: "pkg_custom_ra_diving", slug: "custom-raja-ampat-diving-keluarga-halim", code: "NV-CUS-0002", title: "Custom Trip Raja Ampat Diving — Keluarga Halim", destinationId: "dst_raja_ampat", days: 6, summary: "Perjalanan diving dan snorkeling 6 hari untuk keluarga Halim.", plan: quoE.itinerarySummary, coverMediaId: "img-ra-karst-aerial", galleryMediaIds: ["img-ra-kri-reef", "img-ra-piaynemo"], costTemplate: [fixed("transport", "Speedboat charter 5 hari", 38_000_000), fixed("guide", "Dive master & guide", 9_000_000), fixed("accommodation", "Upgrade resor tepi laut", 5_000_000), perPax("accommodation", "Resor 5 malam", 4_200_000), perPax("activities", "Paket diving / snorkeling", 1_600_000), perPax("tickets", "Kartu jasa lingkungan", 700_000)], quotationId: quoE.id })
    this.convert(inqE, quoE, { offset: 0, outcome: "awaiting", guideId: "gde_yonas", packageFixture: pkgE })
  }

  openInquiries() {
    const prospect = (source: Source, offset: number, gender?: "L" | "P", city?: string) =>
      this.newCustomer({ createdAt: offset === 0 ? addHours(this.now, -6) : this.at(offset, 9), source, gender, city })
    const existing = () => this.repeatPool[this.rng.int(0, this.repeatPool.length - 1)]?.customer ?? prospect("repeat", -30)

    // Won, ready to convert
    const f = prospect("instagram", -24)
    const inqF = this.inquiry({ type: "private", customer: f, source: "instagram", createdOffset: -24, stage: "won", history: [["contacted", -23], ["quotation_sent", -19], ["negotiation", -15], ["won", -4]], packageId: "pkg_lbj_private_phinisi_4h3m", travelDates: { kind: "exact", startDate: this.d(50) }, groupSize: 6, interests: ["snorkeling", "fotografi"], nextFollowUp: 1, followUps: [{ offset: -15, channel: "whatsapp", body: "Tamu meminta potongan harga untuk 6 orang; ajukan ke owner." }] })
    this.quotation(inqF, { version: 1, status: "accepted", sentOffset: -19, validDays: 14, respondedOffset: -4, title: "Private Phinisi Labuan Bajo · 6 pax", packageId: "pkg_lbj_private_phinisi_4h3m", proposedStart: 50, durationDays: 4, lines: [{ label: "Private Phinisi Labuan Bajo · 6 pax", quantity: 6, unitPrice: 9_750_000 }], discount: 1_500_000 })

    const g = existing()
    this.inquiry({ type: "general", customer: g, source: "whatsapp", createdOffset: -6, stage: "won", history: [["contacted", -6], ["won", -1]], packageId: "pkg_brm_sunrise_1h", travelDates: { kind: "exact", startDate: this.d(33) }, groupSize: 6, interests: ["fotografi"], message: "Rombongan komunitas fotografi, ingin ikut jadwal Bromo Sunrise yang sudah ada.", nextFollowUp: 0 })

    // Negotiation
    const h = existing()
    const inqH = this.inquiry({ type: "private", customer: h, source: "repeat", createdOffset: -18, stage: "negotiation", history: [["contacted", -17], ["quotation_sent", -14], ["negotiation", -10], ["quotation_sent", -5], ["negotiation", -3]], packageId: "pkg_ra_private_liveaboard_6h5m", travelDates: { kind: "flexible", month: this.d(120).slice(0, 7) }, groupSize: 5, interests: ["snorkeling", "diving"], nextFollowUp: 2, followUps: [{ offset: -10, channel: "telepon", body: "Tamu membandingkan dengan liveaboard lain; tekankan kru dan rute privat." }] })
    this.quotation(inqH, { version: 1, status: "rejected", sentOffset: -14, validDays: 7, respondedOffset: -10, title: "Private Liveaboard Raja Ampat · 5 pax", packageId: "pkg_ra_private_liveaboard_6h5m", proposedStart: 120, durationDays: 6, lines: [{ label: "Private Liveaboard Raja Ampat · 5 pax", quantity: 5, unitPrice: 29_900_000 }] })
    this.quotation(inqH, { version: 2, status: "sent", sentOffset: -5, validDays: 14, title: "Private Liveaboard Raja Ampat · 5 pax (revisi)", packageId: "pkg_ra_private_liveaboard_6h5m", proposedStart: 120, durationDays: 6, lines: [{ label: "Private Liveaboard Raja Ampat · 5 pax", quantity: 5, unitPrice: 29_900_000 }], discount: 5_000_000 })

    const i = prospect("google_ads", -15)
    const inqI = this.inquiry({ type: "custom", customer: i, source: "google_ads", createdOffset: -15, stage: "negotiation", history: [["contacted", -14], ["quotation_sent", -11], ["negotiation", -7]], destinationIds: ["dst_labuan_bajo", "dst_lombok"], travelDates: { kind: "range", from: this.d(70), to: this.d(85) }, durationDays: 7, groupSize: 4, budget: "10_20jt", interests: ["petualangan", "snorkeling"], message: "Ingin overland Lombok sampai Labuan Bajo dengan kapal.", nextFollowUp: 1 })
    this.quotation(inqI, { version: 1, status: "sent", sentOffset: -11, validDays: 14, title: "Custom Lombok – Labuan Bajo Overland · 4 pax", proposedStart: 72, durationDays: 7, lines: [{ label: "Paket custom Lombok – Labuan Bajo 7H6M (per orang)", quantity: 4, unitPrice: 14_200_000 }], itinerarySummary: ["Lombok", "Gili", "Kapal ke Sumbawa", "Moyo", "Kapal ke Komodo", "Padar & Pink Beach", "Labuan Bajo"] })

    const j = prospect("website", -13, "P")
    const inqJ = this.inquiry({ type: "private", customer: j, source: "website", createdOffset: -13, stage: "negotiation", history: [["contacted", -12], ["quotation_sent", -10], ["negotiation", -6]], packageId: "pkg_bali_ubud_sidemen_4h3m", travelDates: { kind: "exact", startDate: this.d(38) }, groupSize: 3, interests: ["budaya", "santai"], nextFollowUp: 3 })
    this.quotation(inqJ, { version: 1, status: "sent", sentOffset: -10, validDays: 14, title: "Bali Ubud & Sidemen · 3 pax", packageId: "pkg_bali_ubud_sidemen_4h3m", proposedStart: 38, durationDays: 4, lines: [{ label: "Bali Ubud & Sidemen Slow Travel · 3 pax", quantity: 3, unitPrice: 5_400_000 }] })

    // Quotation sent
    const k = prospect("instagram", -9)
    const inqK = this.inquiry({ type: "private", customer: k, source: "instagram", createdOffset: -9, stage: "quotation_sent", history: [["contacted", -9], ["quotation_sent", -7]], packageId: "pkg_np_private_2h1m", travelDates: { kind: "exact", startDate: this.d(26) }, groupSize: 4, interests: ["snorkeling"], nextFollowUp: 1 })
    this.quotation(inqK, { version: 1, status: "sent", sentOffset: -7, validDays: 10, title: "Private Nusa Penida · 4 pax", packageId: "pkg_np_private_2h1m", proposedStart: 26, durationDays: 2, lines: [{ label: "Private Nusa Penida · 4 pax", quantity: 4, unitPrice: 2_250_000 }] })

    const l = prospect("tiktok", -11, "P")
    const inqL = this.inquiry({ type: "custom", customer: l, source: "tiktok", createdOffset: -11, stage: "quotation_sent", history: [["contacted", -10], ["quotation_sent", -8]], destinationIds: ["dst_yogyakarta", "dst_bromo"], travelDates: { kind: "flexible", month: this.d(60).slice(0, 7) }, durationDays: 5, groupSize: 2, budget: "5_10jt", interests: ["budaya", "fotografi"], nextFollowUp: 2 })
    this.quotation(inqL, { version: 1, status: "sent", sentOffset: -8, validDays: 14, title: "Custom Jogja & Bromo · 2 pax", proposedStart: 60, durationDays: 5, lines: [{ label: "Paket custom Jogja & Bromo 5H4M (per orang)", quantity: 2, unitPrice: 6_750_000 }], itinerarySummary: ["Yogyakarta", "Borobudur & Merapi", "Kereta ke Malang", "Sunrise Bromo", "Kembali dari Surabaya"] })

    const m = prospect("whatsapp", -26)
    const inqM = this.inquiry({ type: "private", customer: m, source: "whatsapp", createdOffset: -26, stage: "quotation_sent", history: [["contacted", -25], ["quotation_sent", -22]], packageId: "pkg_yog_family_4h3m", travelDates: { kind: "exact", startDate: this.d(55) }, groupSize: 9, interests: ["keluarga", "budaya"], message: "Reuni keluarga besar, 9 orang termasuk 3 lansia.", nextFollowUp: -3 })
    this.quotation(inqM, { version: 1, status: "sent", sentOffset: -22, validDays: 10, title: "Private Jogja Family Trip · 9 pax", packageId: "pkg_yog_family_4h3m", proposedStart: 55, durationDays: 4, lines: [{ label: "Private Jogja Family Trip · 9 pax", quantity: 9, unitPrice: 2_450_000 }] })

    const n = existing()
    const inqN = this.inquiry({ type: "custom", customer: n, source: "repeat", createdOffset: -8, stage: "quotation_sent", history: [["contacted", -8], ["quotation_sent", -5]], destinationIds: ["dst_belitung"], travelDates: { kind: "range", from: this.d(44), to: this.d(50) }, durationDays: 4, groupSize: 5, budget: "3_5jt", interests: ["keluarga", "santai"], nextFollowUp: 2 })
    this.quotation(inqN, { version: 1, status: "sent", sentOffset: -5, validDays: 14, title: "Custom Belitung Keluarga · 5 pax", proposedStart: 46, durationDays: 4, lines: [{ label: "Paket custom Belitung 4H3M (per orang)", quantity: 5, unitPrice: 3_600_000 }], itinerarySummary: ["Tiba & Tanjung Tinggi", "Island hopping", "Belitung Timur", "Kembali"] })

    // Contacted
    const o = prospect("website", -5, "P")
    this.inquiry({ type: "private", customer: o, source: "website", createdOffset: -5, stage: "contacted", history: [["contacted", -4]], packageId: "pkg_bali_honeymoon_5h4m", travelDates: { kind: "flexible", month: this.d(90).slice(0, 7) }, groupSize: 2, interests: ["honeymoon"], nextFollowUp: -2, followUps: [{ offset: -4, channel: "whatsapp", body: "Menanyakan tanggal pernikahan dan preferensi vila." }] })
    const p = prospect("instagram", -7)
    this.inquiry({ type: "custom", customer: p, source: "instagram", createdOffset: -7, stage: "contacted", history: [["contacted", -6]], destinationIds: ["dst_raja_ampat"], travelDates: { kind: "flexible" }, durationDays: 5, groupSize: 2, budget: "10_20jt", interests: ["snorkeling", "fotografi"], nextFollowUp: -1, followUps: [{ offset: -6, channel: "whatsapp", body: "Tamu belum menentukan bulan; kirim info musim terbaik." }] })
    const q = prospect("website", -3, "L")
    this.inquiry({ type: "general", customer: q, source: "website", createdOffset: -3, stage: "contacted", history: [["contacted", -2]], packageId: "pkg_lbk_rinjani_3h2m", travelDates: { kind: "flexible" }, groupSize: 1, interests: ["hiking"], message: "Apakah pemula boleh ikut pendakian Rinjani 3H2M?", nextFollowUp: 2, followUps: [{ offset: -2, channel: "email", body: "Kirim panduan persiapan fisik dan perlengkapan." }] })
    const r = existing()
    this.inquiry({ type: "private", customer: r, source: "repeat", createdOffset: -4, stage: "contacted", history: [["contacted", -3]], packageId: "pkg_lbj_private_phinisi_4h3m", travelDates: { kind: "range", from: this.d(100), to: this.d(110) }, groupSize: 8, interests: ["snorkeling"], nextFollowUp: 0 })

    // New
    const s = prospect("website", 0, "P")
    this.inquiry({ type: "custom", customer: s, source: "website", createdOffset: 0, createdHour: 2, stage: "new", history: [], destinationIds: ["dst_labuan_bajo", "dst_bali"], travelDates: { kind: "range", from: this.d(65), to: this.d(75) }, durationDays: 7, groupSize: 4, budget: "10_20jt", interests: ["snorkeling", "santai", "kuliner"], message: "Ingin gabungan sailing Komodo dan beberapa hari santai di Bali." })
    const t = prospect("website", 0, "L")
    this.inquiry({ type: "private", customer: t, source: "website", createdOffset: 0, createdHour: 5, stage: "new", history: [], packageId: "pkg_bali_ubud_sidemen_4h3m", travelDates: { kind: "exact", startDate: this.d(30) }, groupSize: 2, interests: ["budaya"] })
    const u = prospect("website", -1)
    this.inquiry({ type: "general", customer: u, source: "website", createdOffset: -1, createdHour: 21, stage: "new", history: [], packageId: "pkg_blt_island_hopping_3h2m", travelDates: { kind: "flexible" }, groupSize: 12, message: "Apakah bisa booking satu grup 12 orang untuk Belitung Island Hopping?" })
    const v = prospect("whatsapp", -1)
    this.inquiry({ type: "private", customer: v, source: "whatsapp", createdOffset: -1, createdHour: 15, stage: "new", history: [], packageId: "pkg_np_private_2h1m", travelDates: { kind: "exact", startDate: this.d(21) }, groupSize: 3, interests: ["snorkeling"] })
    const w = prospect("instagram", -2)
    this.inquiry({ type: "custom", customer: w, source: "instagram", createdOffset: -2, createdHour: 19, stage: "new", history: [], destinationIds: ["dst_lombok"], travelDates: { kind: "flexible", month: this.d(45).slice(0, 7) }, durationDays: 4, groupSize: 6, budget: "3_5jt", interests: ["snorkeling", "santai"] })

    // Lost
    const x = prospect("instagram", -64)
    const inqX = this.inquiry({ type: "private", customer: x, source: "instagram", createdOffset: -64, stage: "lost", lostReason: "harga", history: [["contacted", -63], ["quotation_sent", -60], ["lost", -55]], packageId: "pkg_lbj_private_phinisi_4h3m", travelDates: { kind: "exact", startDate: this.d(-20) }, groupSize: 2, interests: ["honeymoon"] })
    this.quotation(inqX, { version: 1, status: "rejected", sentOffset: -60, validDays: 7, respondedOffset: -55, title: "Private Phinisi · 2 pax", packageId: "pkg_lbj_private_phinisi_4h3m", proposedStart: -20, durationDays: 4, lines: [{ label: "Private Phinisi Labuan Bajo · 2 pax", quantity: 2, unitPrice: 14_500_000 }] })
    const y = prospect("google_ads", -86)
    const inqY = this.inquiry({ type: "custom", customer: y, source: "google_ads", createdOffset: -86, stage: "lost", lostReason: "pilih_kompetitor", history: [["contacted", -85], ["quotation_sent", -82], ["negotiation", -79], ["lost", -76]], destinationIds: ["dst_raja_ampat"], travelDates: { kind: "flexible" }, durationDays: 6, groupSize: 4, budget: "gt_20jt", interests: ["diving"] })
    this.quotation(inqY, { version: 1, status: "rejected", sentOffset: -82, validDays: 7, respondedOffset: -76, title: "Custom Raja Ampat · 4 pax", proposedStart: -30, durationDays: 6, lines: [{ label: "Paket custom Raja Ampat 6H5M (per orang)", quantity: 4, unitPrice: 21_000_000 }], itinerarySummary: ["Sorong – Waisai", "Kri", "Piaynemo", "Wayag", "Arborek", "Kembali"] })
    const z = prospect("website", -33)
    this.inquiry({ type: "general", customer: z, source: "website", createdOffset: -33, stage: "lost", lostReason: "tidak_ada_respons", history: [["contacted", -32], ["lost", -20]], packageId: "pkg_lbk_gili_3h2m", travelDates: { kind: "flexible" }, groupSize: 2, followUps: [{ offset: -32, channel: "whatsapp", body: "Mengirim jadwal open trip terdekat." }, { offset: -26, channel: "whatsapp", body: "Follow-up kedua, belum ada balasan." }] })
  }

  // ------------------------------------------------------------------ finish

  finish(): DemoDatabase {
    const byTime = <T extends { createdAt: string }>(items: T[]) => [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const yymm = (ts: Timestamp) => toDateOnlyWIB(ts).slice(2, 7).replace("-", "")

    let n = 0
    for (const c of byTime(Object.values(this.db.customers))) c.code = `CUS-${pad(++n)}`
    this.db.meta.counters.customer = n

    n = 100
    for (const b of byTime(Object.values(this.db.bookings))) b.code = `NV-${yymm(b.createdAt)}-${pad(++n)}`
    this.db.meta.counters.booking = n

    n = 40
    for (const inv of [...Object.values(this.db.invoices)].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt))) {
      const [y, m] = toDateOnlyWIB(inv.issuedAt).split("-")
      inv.number = `${this.db.settings.invoice.prefix}/${y}/${m}/${pad(++n)}`
    }
    this.db.meta.counters.invoice = n

    n = 60
    for (const p of [...Object.values(this.db.payments)].sort((a, b) => a.paidAt.localeCompare(b.paidAt))) p.code = `PAY-${yymm(p.paidAt)}-${pad(++n)}`
    this.db.meta.counters.payment = n

    n = 150
    for (const inq of byTime(Object.values(this.db.inquiries))) inq.code = `INQ-${pad(++n)}`
    this.db.meta.counters.inquiry = n

    for (const q of Object.values(this.db.quotations)) q.code = `QUO-${this.db.inquiries[q.inquiryId].code.slice(4)}-v${q.version}`

    for (const dep of Object.values(this.db.departures)) {
      const pkgCode = this.db.packages[dep.packageId].code.replace(/^NV-/, "")
      dep.code = `${pkgCode}-${dep.startDate.slice(2).replaceAll("-", "")}`
    }

    const events = [...this.events].sort((a, b) => a.at.localeCompare(b.at))
    events.forEach((event, index) => {
      const id = `act_s${pad(index + 1, 5)}`
      this.db.activity[id] = {
        id,
        at: event.at,
        actor: event.actor,
        subject: event.subject,
        related: event.related ?? [],
        action: event.action,
        message: event.message(),
        data: event.data,
      }
    })
    this.db.meta.counters.activity = events.length
    return this.db
  }
}

/** Build the full demo dataset for the given moment (defaults to now). */
export function buildSeed(now: Date | Timestamp = new Date()): DemoDatabase {
  const builder = new SeedBuilder(typeof now === "string" ? now : now.toISOString())
  builder.catalog()
  builder.scheduledTrips()
  builder.privateTrips()
  builder.openInquiries()
  return builder.finish()
}
