import { addDays, addHours, toDateOnlyWIB, type DateOnly } from "@/lib/dates"
import { formatDate, formatIDR } from "@/lib/format"
import { createId, pad } from "@/lib/ids"
import { DomainError } from "@/lib/result"
import { slugify } from "@/lib/slug"
import type { Booking, FollowUp, LostReason, PipelineStage, Quotation, TourPackage } from "@/domain/entities"
import { LOST_REASON_LABEL, PIPELINE_STAGE_LABEL } from "@/domain/labels"
import { departureDisplayStatus, isBookable, seatSummary } from "@/domain/rules/availability"
import { DEFAULT_CANCELLATION_POLICY } from "@/domain/rules/cancellation"
import { canConvertInquiry, canMoveInquiry } from "@/domain/rules/inquiry-pipeline"
import { pricePerPax, priceTotal } from "@/domain/rules/pricing"
import type { ID, IDR, Source } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { issueInvoice } from "./booking-effects"
import { createTravelers } from "./booking-service"
import { nextCode } from "./codes"
import { createDepartureRecord } from "./departure-service"
import { placeInquiry, type WebsiteInquiryInput } from "./inquiry-service"
import { runCommand } from "./runtime"

function quotationsOf(uow: UnitOfWork, inquiryId: ID): Quotation[] {
  return uow.quotations.find((q) => q.inquiryId === inquiryId).sort((a, b) => a.version - b.version)
}

/** Writes the stage and its history event (the stage history is a filter over the log). */
function setStage(uow: UnitOfWork, userId: ID, inquiryId: ID, to: PipelineStage, lostReason?: LostReason) {
  const inquiry = uow.inquiries.require(inquiryId)
  const from = inquiry.stage
  uow.inquiries.update(inquiry.id, { stage: to, lostReason: to === "lost" ? lostReason : undefined, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "inquiry", id: inquiry.id },
    action: "inquiry.stage_changed",
    message:
      `Tahap ${inquiry.code}: ${PIPELINE_STAGE_LABEL[from]} → ${PIPELINE_STAGE_LABEL[to]}` +
      (to === "lost" && lostReason ? ` (${LOST_REASON_LABEL[lostReason]})` : ""),
    data: { from, to },
  })
}

/** Pipeline move with the rules of docs/domain-model.md §5.2. */
export function moveInquiryStage(uow: UnitOfWork, userId: ID, inquiryId: ID, to: PipelineStage, lostReason?: LostReason) {
  requirePermission(uow, userId, "inquiries.manage")
  const inquiry = uow.inquiries.require(inquiryId)
  const move = canMoveInquiry({
    inquiry,
    to,
    quotations: quotationsOf(uow, inquiry.id),
    today: toDateOnlyWIB(uow.now),
    lostReasonProvided: !!lostReason,
  })
  if (!move.ok) throw new DomainError("INVALID_TRANSITION", move.reason, move.needs)
  // Reopening a lost lead or undoing a deal clears the outcome; accepted quotations stay recorded.
  setStage(uow, userId, inquiry.id, to, lostReason)
  if (!inquiry.assigneeId) uow.inquiries.update(inquiry.id, { assigneeId: userId })
}

export function assignInquiry(uow: UnitOfWork, userId: ID, inquiryId: ID, assigneeId: ID | null) {
  requirePermission(uow, userId, "inquiries.manage")
  const inquiry = uow.inquiries.require(inquiryId)
  const assignee = assigneeId ? uow.users.require(assigneeId) : undefined
  if (assignee) {
    const role = uow.roles.get(assignee.roleId)
    if (!role?.permissions.includes("inquiries.manage")) throw new DomainError("VALIDATION", `${assignee.name} tidak menangani inquiry.`, "assigneeId")
  }
  uow.inquiries.update(inquiry.id, { assigneeId: assignee?.id, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "inquiry", id: inquiry.id },
    action: "inquiry.assigned",
    message: assignee ? `${inquiry.code} ditangani ${assignee.name}` : `Penanggung jawab ${inquiry.code} dikosongkan`,
  })
}

export function setNextFollowUp(uow: UnitOfWork, userId: ID, inquiryId: ID, date: DateOnly | null) {
  requirePermission(uow, userId, "inquiries.manage")
  const inquiry = uow.inquiries.require(inquiryId)
  uow.inquiries.update(inquiry.id, { nextFollowUpDate: date ?? undefined, updatedAt: uow.now })
}

/** Logs a contact with the lead. The first follow-up on a new lead moves it to Dihubungi. */
export function addFollowUp(
  uow: UnitOfWork,
  userId: ID,
  inquiryId: ID,
  input: { channel: FollowUp["channel"]; body: string; nextFollowUpDate?: DateOnly | null },
) {
  requirePermission(uow, userId, "inquiries.manage")
  const inquiry = uow.inquiries.require(inquiryId)
  if (!input.body.trim()) throw new DomainError("VALIDATION", "Tuliskan catatan follow-up.", "body")
  if (input.nextFollowUpDate && input.nextFollowUpDate < toDateOnlyWIB(uow.now)) {
    throw new DomainError("VALIDATION", "Tanggal follow-up berikutnya tidak boleh di masa lalu.", "nextFollowUpDate")
  }
  const followUp: FollowUp = { id: createId("fu"), channel: input.channel, body: input.body.trim(), authorId: userId, at: uow.now }
  uow.inquiries.update(inquiry.id, {
    followUps: [...inquiry.followUps, followUp],
    nextFollowUpDate: input.nextFollowUpDate === undefined ? inquiry.nextFollowUpDate : (input.nextFollowUpDate ?? undefined),
    assigneeId: inquiry.assigneeId ?? userId,
    updatedAt: uow.now,
  })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "inquiry", id: inquiry.id },
    action: "inquiry.follow_up",
    message: `Follow-up ${inquiry.code}: ${followUp.body.length > 80 ? `${followUp.body.slice(0, 80)}…` : followUp.body}`,
  })
  if (inquiry.stage === "new") setStage(uow, userId, inquiry.id, "contacted")
}

export interface QuotationInput {
  title: string
  packageId?: ID
  proposedStartDate: DateOnly
  durationDays: number
  groupSize: number
  lines: { label: string; quantity: number; unitPrice: IDR }[]
  discount: IDR
  itinerarySummary: string[]
  validDays: number
}

/**
 * Saves a quotation. Editing a draft updates it; anything already sent is kept and a new
 * version is created (§5.3). Sending moves the lead to Penawaran Dikirim.
 */
export function saveQuotation(uow: UnitOfWork, userId: ID, inquiryId: ID, input: QuotationInput, options: { draftId?: ID; send: boolean }) {
  requirePermission(uow, userId, "inquiries.manage")
  const inquiry = uow.inquiries.require(inquiryId)
  if (inquiry.convertedBookingId) throw new DomainError("INVALID_TRANSITION", "Inquiry sudah dikonversi menjadi booking.")
  if (inquiry.type === "general") throw new DomainError("VALIDATION", "Pertanyaan umum dikonversi langsung ke jadwal open trip, tanpa penawaran.")
  const today = toDateOnlyWIB(uow.now)
  if (!input.title.trim()) throw new DomainError("VALIDATION", "Isi judul penawaran.", "title")
  if (input.proposedStartDate <= today) throw new DomainError("VALIDATION", "Tanggal berangkat harus setelah hari ini.", "proposedStartDate")
  if (input.durationDays < 1 || input.groupSize < 1) throw new DomainError("VALIDATION", "Durasi dan jumlah peserta minimal 1.")
  const lines = input.lines.filter((line) => line.label.trim())
  if (lines.length === 0) throw new DomainError("VALIDATION", "Tambahkan minimal satu baris harga.", "lines")
  if (lines.some((line) => line.quantity < 1 || line.unitPrice < 0)) throw new DomainError("VALIDATION", "Jumlah minimal 1 dan harga tidak boleh negatif.", "lines")
  const itinerary = input.itinerarySummary.map((line) => line.trim()).filter(Boolean)
  if (inquiry.type === "custom" && itinerary.length === 0) {
    throw new DomainError("VALIDATION", "Custom trip membutuhkan ringkasan itinerary per hari.", "itinerarySummary")
  }
  const packageId = inquiry.type === "private" ? (input.packageId ?? inquiry.packageId) : undefined
  if (inquiry.type === "private" && (!packageId || !uow.packages.get(packageId))) throw new DomainError("VALIDATION", "Pilih paket private trip.", "packageId")
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  if (input.discount < 0 || input.discount > subtotal) throw new DomainError("VALIDATION", "Diskon tidak boleh melebihi subtotal.", "discount")

  const existing = quotationsOf(uow, inquiry.id)
  const draft = options.draftId ? existing.find((q) => q.id === options.draftId && q.status === "draft") : undefined
  const fields = {
    title: input.title.trim(),
    packageId,
    proposedStartDate: input.proposedStartDate,
    durationDays: input.durationDays,
    groupSize: input.groupSize,
    lines: lines.map((line) => ({ id: createId("pl"), label: line.label.trim(), quantity: line.quantity, unitPrice: line.unitPrice })),
    discount: input.discount,
    itinerarySummary: itinerary,
    validUntil: addDays(today, Math.max(1, input.validDays)),
    status: options.send ? ("sent" as const) : ("draft" as const),
    sentAt: options.send ? uow.now : undefined,
    updatedAt: uow.now,
  }
  let quotation: Quotation
  if (draft) {
    quotation = uow.quotations.update(draft.id, fields)
  } else {
    const version = (existing.at(-1)?.version ?? 0) + 1
    quotation = uow.quotations.insert({
      id: createId("quo"),
      code: `QUO-${inquiry.code.replace(/^INQ-/, "")}-v${version}`,
      inquiryId: inquiry.id,
      version,
      createdAt: uow.now,
      ...fields,
    })
  }
  if (options.send) {
    logActivity(uow, {
      actor: userActor(userId),
      subject: { type: "inquiry", id: inquiry.id },
      related: [{ type: "quotation", id: quotation.id }],
      action: "quotation.sent",
      message: `Penawaran ${quotation.code} sebesar ${formatIDR(priceTotal(quotation))} dikirim`,
    })
    if (inquiry.stage === "new" || inquiry.stage === "contacted" || inquiry.stage === "negotiation") {
      setStage(uow, userId, inquiry.id, "quotation_sent")
    }
    if (!inquiry.assigneeId) uow.inquiries.update(inquiry.id, { assigneeId: userId })
  }
  return quotation
}

/** Records the customer's answer. Accepting wins the deal and closes the other versions. */
export function respondQuotation(uow: UnitOfWork, userId: ID, quotationId: ID, response: "accepted" | "rejected") {
  requirePermission(uow, userId, "inquiries.manage")
  const quotation = uow.quotations.require(quotationId)
  const inquiry = uow.inquiries.require(quotation.inquiryId)
  if (inquiry.convertedBookingId) throw new DomainError("INVALID_TRANSITION", "Inquiry sudah dikonversi menjadi booking.")
  if (quotation.status !== "sent") throw new DomainError("INVALID_TRANSITION", "Hanya penawaran terkirim yang bisa diberi respons.")
  if (inquiry.stage === "lost") throw new DomainError("INVALID_TRANSITION", "Buka kembali inquiry ini sebelum mencatat respons pelanggan.")
  uow.quotations.update(quotation.id, { status: response, respondedAt: uow.now, updatedAt: uow.now })
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "inquiry", id: inquiry.id },
    related: [{ type: "quotation", id: quotation.id }],
    action: response === "accepted" ? "quotation.accepted" : "quotation.rejected",
    message: response === "accepted" ? `Penawaran ${quotation.code} disetujui pelanggan` : `Penawaran ${quotation.code} ditolak pelanggan`,
  })
  if (response === "accepted") {
    for (const other of quotationsOf(uow, inquiry.id)) {
      if (other.id !== quotation.id && (other.status === "sent" || other.status === "draft" || other.status === "accepted")) {
        uow.quotations.update(other.id, { status: "rejected", respondedAt: other.respondedAt ?? uow.now, updatedAt: uow.now })
      }
    }
    if (inquiry.stage !== "won") setStage(uow, userId, inquiry.id, "won")
  }
}

const CUSTOM_TERMS = [
  "Harga dan itinerary mengikuti penawaran yang disetujui.",
  "Seluruh kendaraan, guide, dan aktivitas bersifat privat untuk grup Anda.",
  "Perubahan jumlah peserta setelah konfirmasi dapat mengubah harga.",
]

/** Unlisted package holding a custom trip's agreed itinerary (ADR-0004). */
function createCustomPackage(uow: UnitOfWork, quotation: Quotation, destinationId: ID): TourPackage {
  const destination = uow.destinations.require(destinationId)
  const sequence = uow.packages.find((p) => p.code.startsWith("NV-CUS-")).length + 1
  const code = `NV-CUS-${pad(sequence)}`
  const base = slugify(quotation.title, 48)
  const settings = uow.settings.get().payment
  const pkg: TourPackage = {
    id: createId("pkg"),
    slug: `${base || "custom-trip"}-${code.toLowerCase()}`,
    code,
    title: quotation.title,
    tripType: "custom",
    visibility: "unlisted",
    status: "published",
    publishedAt: uow.now,
    destinationId: destination.id,
    durationDays: quotation.durationDays,
    durationNights: Math.max(0, quotation.durationDays - 1),
    summary: `Perjalanan custom ${quotation.durationDays} hari untuk ${quotation.groupSize} orang, disusun dari penawaran ${quotation.code}.`,
    overview: [],
    highlights: [],
    itinerary: quotation.itinerarySummary.map((line, i, all) => ({
      id: createId("day"),
      day: i + 1,
      title: line,
      description: "Detail kegiatan mengikuti penawaran yang disetujui.",
      activities: [],
      meals: { breakfast: i > 0, lunch: true, dinner: i < all.length - 1 },
    })),
    inclusions: ["Sesuai rincian penawaran"],
    exclusions: ["Tiket pesawat menuju titik kumpul"],
    meetingPoint: { name: "Disepakati bersama pelanggan", address: "-" },
    requirements: { fitness: "sedang", notes: [] },
    terms: CUSTOM_TERMS,
    cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
    paymentTerms: { depositPercent: settings.defaultDepositPercent, balanceDueDaysBefore: settings.defaultBalanceDueDaysBefore },
    pricing: { kind: "quoted" },
    groupSize: { min: 1, max: Math.max(1, quotation.groupSize) },
    faqs: [],
    coverMediaId: destination.coverMediaId,
    galleryMediaIds: destination.galleryMediaIds.slice(0, 3),
    tags: ["custom"],
    isCustomizable: false,
    sourceQuotationId: quotation.id,
    createdAt: uow.now,
    updatedAt: uow.now,
  }
  return uow.packages.insert(pkg)
}

/**
 * Won inquiry → booking awaiting payment with an invoice (§6.7). Private and custom
 * trips get their own private departure; general questions join a scheduled departure.
 * The inquiry's customer is reused, never duplicated.
 */
export function convertInquiry(uow: UnitOfWork, userId: ID, inquiryId: ID, options: { departureId?: ID } = {}) {
  requirePermission(uow, userId, "inquiries.manage")
  requirePermission(uow, userId, "bookings.manage")
  const inquiry = uow.inquiries.require(inquiryId)
  const blocked = canConvertInquiry(inquiry)
  if (blocked) throw new DomainError("INVALID_TRANSITION", blocked)
  const customer = uow.customers.require(inquiry.customerId)
  const actor = userActor(userId)
  const settings = uow.settings.get().booking
  const today = toDateOnlyWIB(uow.now)

  let departureId: ID
  let pkg: TourPackage
  let lines: Booking["lines"]
  let discount = 0
  let quotationId: ID | undefined
  let pax = inquiry.groupSize

  if (inquiry.type === "general") {
    if (!options.departureId) throw new DomainError("VALIDATION", "Pilih jadwal open trip untuk booking ini.", "departureId")
    const departure = uow.departures.require(options.departureId)
    pkg = uow.packages.require(departure.packageId)
    const bookings = uow.bookings.find((b) => b.departureId === departure.id)
    const paxOf = (id: ID) => uow.bookingTravelers.find((bt) => bt.bookingId === id).length
    const seats = seatSummary(departure, bookings, paxOf, uow.now)
    const status = departureDisplayStatus({ departure, seats, today, settings, packageArchived: pkg.status === "archived" })
    if (departure.kind !== "scheduled" || !isBookable(status)) throw new DomainError("SEATS_UNAVAILABLE", "Jadwal ini tidak bisa dipesan.", "departureId")
    if (pax > seats.available) throw new DomainError("SEATS_UNAVAILABLE", `Sisa kursi tinggal ${seats.available}, kurang untuk ${pax} orang.`, "departureId")
    departureId = departure.id
    lines = [{ id: createId("pl"), label: `${pkg.title} · ${formatDate(departure.startDate)}`, quantity: pax, unitPrice: pricePerPax(pkg, pax, departure) ?? 0 }]
  } else {
    const quotation = quotationsOf(uow, inquiry.id).filter((q) => q.status === "accepted").at(-1)
    if (!quotation) throw new DomainError("INVALID_TRANSITION", "Belum ada penawaran yang disetujui.")
    if (quotation.proposedStartDate <= today) throw new DomainError("VALIDATION", "Tanggal berangkat di penawaran sudah lewat. Buat revisi penawaran.")
    quotationId = quotation.id
    pax = quotation.groupSize
    if (inquiry.type === "private") {
      pkg = uow.packages.require(quotation.packageId ?? inquiry.packageId ?? "")
    } else {
      const destinationId = inquiry.destinationIds[0]
      if (!destinationId) throw new DomainError("VALIDATION", "Inquiry custom belum memiliki destinasi.")
      pkg = createCustomPackage(uow, quotation, destinationId)
      logActivity(uow, {
        actor,
        subject: { type: "package", id: pkg.id },
        related: [{ type: "quotation", id: quotation.id }],
        action: "package.created_from_quotation",
        message: `Paket custom "${pkg.title}" dibuat dari penawaran ${quotation.code}`,
      })
    }
    const departure = createDepartureRecord(uow, { pkg, kind: "private", startDate: quotation.proposedStartDate, capacity: pax, minParticipants: 1 })
    departureId = departure.id
    lines = quotation.lines.map((line) => ({ ...line, id: createId("pl") }))
    discount = quotation.discount
  }

  const bookingId = createId("bk")
  const code = nextCode(uow, "booking")
  const travelerIds = createTravelers(
    uow,
    customer,
    Array.from({ length: pax }, (_, i) => ({ fullName: i === 0 ? customer.fullName : "" })),
    { contactTravels: true },
  )
  const booking = uow.bookings.insert({
    id: bookingId,
    code,
    customerId: customer.id,
    packageId: pkg.id,
    departureId,
    tripType: pkg.tripType,
    source: inquiry.source,
    inquiryId: inquiry.id,
    quotationId,
    status: "awaiting_payment",
    lines,
    discount,
    holdExpiresAt: addHours(uow.now, settings.depositHoldHours),
    createdAt: uow.now,
    updatedAt: uow.now,
  })
  travelerIds.forEach((travelerId, index) => uow.bookingTravelers.insert({ id: createId("bt"), bookingId, travelerId, isLead: index === 0 }))
  const invoice = issueInvoice(uow, booking)
  uow.inquiries.update(inquiry.id, { convertedBookingId: bookingId, updatedAt: uow.now })

  logActivity(uow, {
    actor,
    subject: { type: "booking", id: bookingId },
    related: [
      { type: "departure", id: departureId },
      { type: "customer", id: customer.id },
      { type: "inquiry", id: inquiry.id },
    ],
    action: "booking.created",
    message: `Booking ${code} dibuat dari konversi inquiry ${inquiry.code}`,
  })
  logActivity(uow, {
    actor,
    subject: { type: "booking", id: bookingId },
    related: [{ type: "invoice", id: invoice.id }],
    action: "invoice.issued",
    message: `Invoice ${invoice.number} diterbitkan untuk booking ${code}`,
  })
  logActivity(uow, {
    actor,
    subject: { type: "inquiry", id: inquiry.id },
    related: [{ type: "booking", id: bookingId }],
    action: "inquiry.converted",
    message: `Inquiry ${inquiry.code} dikonversi menjadi booking ${code}`,
  })
  return { bookingId, code }
}

export interface ManualInquiryInput extends WebsiteInquiryInput {
  source: Exclude<Source, "website">
}

/** Lead received over WhatsApp, Instagram, a referral, or at the office. */
export function createManualInquiry(uow: UnitOfWork, userId: ID, input: ManualInquiryInput) {
  requirePermission(uow, userId, "inquiries.manage")
  return placeInquiry(uow, input, { source: input.source, userId })
}

export const inquiryCommands = {
  move: (userId: ID, inquiryId: ID, to: PipelineStage, lostReason?: LostReason) =>
    runCommand((uow) => moveInquiryStage(uow, userId, inquiryId, to, lostReason)),
  assign: (userId: ID, inquiryId: ID, assigneeId: ID | null) => runCommand((uow) => assignInquiry(uow, userId, inquiryId, assigneeId)),
  setNextFollowUp: (userId: ID, inquiryId: ID, date: DateOnly | null) => runCommand((uow) => setNextFollowUp(uow, userId, inquiryId, date)),
  addFollowUp: (userId: ID, inquiryId: ID, input: { channel: FollowUp["channel"]; body: string; nextFollowUpDate?: DateOnly | null }) =>
    runCommand((uow) => addFollowUp(uow, userId, inquiryId, input)),
  saveQuotation: (userId: ID, inquiryId: ID, input: QuotationInput, options: { draftId?: ID; send: boolean }) =>
    runCommand((uow) => saveQuotation(uow, userId, inquiryId, input, options)),
  respondQuotation: (userId: ID, quotationId: ID, response: "accepted" | "rejected") =>
    runCommand((uow) => respondQuotation(uow, userId, quotationId, response)),
  convert: (userId: ID, inquiryId: ID, options: { departureId?: ID } = {}) => runCommand((uow) => convertInquiry(uow, userId, inquiryId, options)),
  createManual: (userId: ID, input: ManualInquiryInput) => runCommand((uow) => createManualInquiry(uow, userId, input)),
}
