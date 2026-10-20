import { describe, expect, it } from "vitest"
import type { Booking, Inquiry } from "../entities"
import { departureDisplayStatus, minimumCapacity, seatSummary } from "./availability"
import { DEFAULT_CANCELLATION_POLICY, cancellationQuote } from "./cancellation"
import { breakEvenParticipants, costByCategory, profitAt, realizedCost } from "./costing"
import { customerStage, findCustomerMatch } from "./customer-identity"
import { canMoveInquiry, quotationDisplayStatus } from "./inquiry-pipeline"
import { buildInstallments } from "./invoice-schedule"
import { bookingFinancials } from "./payment-status"
import { pricePerPax, startingPrice } from "./pricing"
import { checklistBlocker, checklistTemplate, tripReadiness } from "./trip-readiness"

const NOW = "2026-10-20T03:00:00.000Z" // 10.00 WIB
const TODAY = "2026-10-20"
const settings = { salesCutoffDays: 2, lowSeatThreshold: 3 }

type B = Pick<Booking, "id" | "status" | "holdExpiresAt">
const booking = (id: string, status: Booking["status"], holdExpiresAt?: string): B => ({ id, status, holdExpiresAt })

describe("seat availability", () => {
  const pax: Record<string, number> = { a: 4, b: 3, c: 2, d: 2, e: 5 }
  const paxOf = (id: string) => pax[id] ?? 0

  it("subtracts allocations and live holds, ignores expired holds and cancellations", () => {
    const seats = seatSummary(
      { capacity: 14, minParticipants: 9 },
      [
        booking("a", "confirmed"),
        booking("b", "completed"),
        booking("c", "pending", "2026-10-20T10:00:00.000Z"),
        booking("d", "awaiting_payment", "2026-10-20T02:00:00.000Z"), // expired an hour ago
        booking("e", "cancelled"),
      ],
      paxOf,
      NOW,
    )
    expect(seats).toMatchObject({ allocated: 7, held: 2, available: 5, guaranteed: false })
    expect(minimumCapacity(seats)).toBe(9)
  })

  it("never reports negative availability", () => {
    const seats = seatSummary({ capacity: 4, minParticipants: 2 }, [booking("e", "confirmed")], paxOf, NOW)
    expect(seats.available).toBe(0)
  })

  it("derives display status in rule order", () => {
    const dep = { startDate: "2026-11-04", endDate: "2026-11-06", salesClosed: false }
    const status = (available: number, extra: Partial<typeof dep & { cancelledAt: string }> = {}, today = TODAY) =>
      departureDisplayStatus({ departure: { ...dep, ...extra }, seats: { available }, today, settings })
    expect(status(8)).toBe("open")
    expect(status(3)).toBe("limited")
    expect(status(0)).toBe("full")
    expect(status(8, { salesClosed: true })).toBe("closed")
    expect(status(8, {}, "2026-11-03")).toBe("closed") // inside cutoff
    expect(status(8, {}, "2026-11-05")).toBe("departed")
    expect(status(8, {}, "2026-11-07")).toBe("completed")
    expect(status(0, { cancelledAt: NOW })).toBe("cancelled")
  })
})

describe("pricing", () => {
  const tiered = {
    pricing: {
      kind: "tiered" as const,
      tiers: [
        { minPax: 2, maxPax: 3, pricePerPax: 14_500_000 },
        { minPax: 4, maxPax: 6, pricePerPax: 9_750_000 },
      ],
    },
  }
  it("resolves starting and per-pax prices", () => {
    expect(startingPrice(tiered)).toBe(9_750_000)
    expect(pricePerPax(tiered, 3)).toBe(14_500_000)
    expect(pricePerPax(tiered, 7)).toBeNull()
    expect(pricePerPax({ pricing: { kind: "per_pax", pricePerPax: 3_450_000 } }, 2, { pricePerPaxOverride: 3_750_000 })).toBe(3_750_000)
  })
})

describe("invoice schedule", () => {
  it("splits deposit (rounded up to Rp1.000) and balance due H-14", () => {
    const installments = buildInstallments({
      total: 10_350_001,
      depositPercent: 30,
      balanceDueDaysBefore: 14,
      departureStart: "2026-12-10",
      today: TODAY,
      depositDueDate: "2026-10-22",
    })
    expect(installments).toEqual([
      { kind: "deposit", label: "DP 30%", amount: 3_106_000, dueDate: "2026-10-22" },
      { kind: "balance", label: "Pelunasan", amount: 7_244_001, dueDate: "2026-11-26" },
    ])
  })

  it("uses a single full payment for late bookings and 100% deposit trips", () => {
    const late = buildInstallments({
      total: 6_900_000,
      depositPercent: 30,
      balanceDueDaysBefore: 14,
      departureStart: "2026-10-30",
      today: TODAY,
      depositDueDate: "2026-10-22",
    })
    expect(late).toEqual([{ kind: "full", label: "Pembayaran penuh", amount: 6_900_000, dueDate: "2026-10-22" }])
    const dayTrip = buildInstallments({
      total: 990_000,
      depositPercent: 100,
      balanceDueDaysBefore: 14,
      departureStart: "2026-12-10",
      today: TODAY,
      depositDueDate: "2026-10-22",
    })
    expect(dayTrip).toHaveLength(1)
  })
})

describe("payment status", () => {
  const lines = [{ id: "l1", label: "Trip", quantity: 3, unitPrice: 3_450_000 }]
  const invoice = {
    installments: [
      { id: "i1", kind: "deposit" as const, label: "DP 30%", amount: 3_105_000, dueDate: "2026-10-10" },
      { id: "i2", kind: "balance" as const, label: "Pelunasan", amount: 7_245_000, dueDate: "2026-10-18" },
    ],
  }
  const verified = (amount: number, direction: "in" | "refund" = "in") => ({ amount, direction, status: "verified" as const })

  it("is unpaid until invoiced", () => {
    const fin = bookingFinancials({ booking: { status: "pending", lines, discount: 0 }, payments: [], today: TODAY })
    expect(fin).toMatchObject({ status: "unpaid", invoiced: false, outstanding: 10_350_000 })
  })

  it("flags overdue balance and ignores unverified payments", () => {
    const fin = bookingFinancials({
      booking: { status: "confirmed", lines, discount: 0 },
      invoice,
      payments: [verified(3_105_000), { amount: 7_245_000, direction: "in", status: "pending_verification" }],
      today: TODAY,
    })
    expect(fin).toMatchObject({
      status: "overdue",
      paidNet: 3_105_000,
      outstanding: 7_245_000,
      overdueAmount: 7_245_000,
      hasPendingVerification: true,
    })
    expect(fin.nextInstallment?.installment.id).toBe("i2")
  })

  it("is paid when verified payments cover the total", () => {
    const fin = bookingFinancials({
      booking: { status: "confirmed", lines, discount: 0 },
      invoice,
      payments: [verified(3_105_000), verified(7_245_000)],
      today: TODAY,
    })
    expect(fin).toMatchObject({ status: "paid", outstanding: 0, nextInstallment: null })
  })

  it("tracks refunds for cancelled bookings", () => {
    const cancellation = { at: NOW, by: { kind: "system" as const }, reason: "customer_request" as const, feeAmount: 2_587_500, refundAmount: 517_500 }
    const pending = bookingFinancials({
      booking: { status: "cancelled", lines, discount: 0, cancellation },
      invoice,
      payments: [verified(3_105_000)],
      today: TODAY,
    })
    expect(pending).toMatchObject({ status: "refund_pending", outstanding: 0, refundRemaining: 517_500 })
    const done = bookingFinancials({
      booking: { status: "cancelled", lines, discount: 0, cancellation },
      invoice,
      payments: [verified(3_105_000), verified(517_500, "refund")],
      today: TODAY,
    })
    expect(done.status).toBe("refunded")
  })
})

describe("cancellation", () => {
  const base = { total: 10_350_000, paidNet: 3_105_000, today: TODAY, policy: DEFAULT_CANCELLATION_POLICY }

  it("applies the tier for confirmed bookings", () => {
    expect(cancellationQuote({ ...base, status: "confirmed", reason: "customer_request", departureStart: "2026-12-01" })).toMatchObject({
      daysBefore: 42,
      feePercent: 25,
      fee: 2_587_500,
      refund: 517_500,
    })
    expect(cancellationQuote({ ...base, status: "confirmed", reason: "customer_request", departureStart: "2026-10-25" })).toMatchObject({
      feePercent: 100,
      refund: 0,
    })
  })

  it("waives the fee before confirmation and when the operator cancels", () => {
    expect(cancellationQuote({ ...base, status: "awaiting_payment", reason: "customer_request", departureStart: "2026-10-25" })).toMatchObject({
      waived: true,
      fee: 0,
      refund: 3_105_000,
    })
    expect(cancellationQuote({ ...base, status: "confirmed", reason: "departure_cancelled", departureStart: "2026-10-25" }).refund).toBe(3_105_000)
  })
})

describe("costing (Sailing Komodo worked example)", () => {
  const totals = { fixed: 18_500_000, perPax: 1_150_000 }

  it("matches docs/domain-model.md §6.10", () => {
    const result = profitAt({ ...totals, pricePerPax: 3_450_000, participants: 12 })
    expect(result.hpp).toBe(32_300_000)
    expect(result.revenue).toBe(41_400_000)
    expect(result.profit).toBe(9_100_000)
    expect(result.margin).toBeCloseTo(0.2198, 4)
    expect(result.markup).toBeCloseTo(0.2817, 4)
    expect(breakEvenParticipants({ ...totals, pricePerPax: 3_450_000 })).toBe(9)
  })

  it("handles loss-making and degenerate cases", () => {
    const ra = profitAt({ fixed: 46_000_000, perPax: 4_100_000, pricePerPax: 12_900_000, participants: 4 })
    expect(ra.profit).toBe(-10_800_000)
    expect(profitAt({ ...totals, pricePerPax: 3_450_000, participants: 0 })).toMatchObject({ margin: null, hppPerPax: null })
    expect(breakEvenParticipants({ fixed: 1, perPax: 500, pricePerPax: 500 })).toBeNull()
  })

  it("splits cost by category and knows when actuals are complete", () => {
    const items = [
      { category: "transport" as const, basis: "fixed" as const, unitCost: 15_000_000, quantity: 1, actualAmount: 15_200_000 },
      { category: "tickets" as const, basis: "per_pax" as const, unitCost: 400_000, quantity: 1 },
    ]
    expect(costByCategory(items, 10)).toMatchObject({ transport: 15_000_000, tickets: 4_000_000 })
    expect(realizedCost(items).complete).toBe(false)
  })
})

describe("inquiry pipeline", () => {
  const inquiry = (stage: Inquiry["stage"], type: Inquiry["type"] = "private"): Pick<Inquiry, "stage" | "type" | "convertedBookingId"> => ({ stage, type })
  const sent = { status: "sent" as const, validUntil: "2026-10-30" }
  const accepted = { status: "accepted" as const, validUntil: "2026-10-30" }

  it("requires a sent quotation before Quotation Sent", () => {
    expect(canMoveInquiry({ inquiry: inquiry("contacted"), to: "quotation_sent", quotations: [], today: TODAY })).toMatchObject({ ok: false, needs: "quotation" })
    expect(canMoveInquiry({ inquiry: inquiry("contacted"), to: "quotation_sent", quotations: [sent], today: TODAY }).ok).toBe(true)
  })

  it("requires an accepted quotation to win private/custom, but not general", () => {
    expect(canMoveInquiry({ inquiry: inquiry("negotiation"), to: "won", quotations: [sent], today: TODAY }).ok).toBe(false)
    expect(canMoveInquiry({ inquiry: inquiry("negotiation"), to: "won", quotations: [accepted], today: TODAY }).ok).toBe(true)
    expect(canMoveInquiry({ inquiry: inquiry("contacted", "general"), to: "won", quotations: [], today: TODAY }).ok).toBe(true)
  })

  it("requires a reason to lose and only reopens to Contacted", () => {
    expect(canMoveInquiry({ inquiry: inquiry("contacted"), to: "lost", quotations: [], today: TODAY })).toMatchObject({ ok: false, needs: "lost_reason" })
    expect(canMoveInquiry({ inquiry: inquiry("lost"), to: "negotiation", quotations: [], today: TODAY }).ok).toBe(false)
    expect(canMoveInquiry({ inquiry: inquiry("lost"), to: "contacted", quotations: [], today: TODAY }).ok).toBe(true)
  })

  it("locks converted inquiries and derives expired quotations", () => {
    expect(canMoveInquiry({ inquiry: { stage: "won", type: "private", convertedBookingId: "bk_1" }, to: "negotiation", quotations: [], today: TODAY }).ok).toBe(false)
    expect(quotationDisplayStatus({ status: "sent", validUntil: "2026-10-19" }, TODAY)).toBe("expired")
  })
})

describe("customer identity", () => {
  const customers = [
    { id: "c1", phone: "+6281100000123", email: "dinda@example.com" },
    { id: "c2", phone: "+6281100000456" },
  ]
  it("matches by phone first, then email", () => {
    expect(findCustomerMatch(customers, { phone: "0811-0000-0123" })?.id).toBe("c1")
    expect(findCustomerMatch(customers, { phone: "0811-9999-9999", email: "DINDA@example.com" })?.id).toBe("c1")
    expect(findCustomerMatch(customers, { phone: "0811-9999-9999" })).toBeUndefined()
  })
  it("derives the customer stage", () => {
    expect(customerStage([])).toBe("prospect")
    expect(customerStage([{ status: "cancelled" }])).toBe("prospect")
    expect(customerStage([{ status: "awaiting_payment" }])).toBe("customer")
    expect(customerStage([{ status: "completed" }, { status: "completed" }])).toBe("repeat")
  })
})

describe("trip readiness", () => {
  it("omits accommodation for day trips", () => {
    expect(checklistTemplate({ durationNights: 0 }).map((i) => i.key)).not.toContain("accommodation")
    expect(checklistTemplate({ durationNights: 2 })).toHaveLength(8)
  })

  it("enforces checklist dependencies", () => {
    const ctx = { guideAssigned: false, confirmedVendorServices: new Set<never>(), confirmedPax: 3, incompleteTravelers: 1, hasActiveHolds: true, travelerDataDone: false }
    expect(checklistBlocker("guide", ctx)).not.toBeNull()
    expect(checklistBlocker("manifest", ctx)).not.toBeNull()
    expect(checklistBlocker("itinerary", ctx)).toBeNull()
    expect(checklistBlocker("traveler_data", ctx)).toBe("1 peserta belum lengkap datanya.")
    expect(checklistBlocker("traveler_data", { ...ctx, confirmedPax: 0, incompleteTravelers: 0 })).toBe("Belum ada peserta terkonfirmasi.")
    expect(checklistBlocker("transport", { ...ctx, confirmedVendorServices: new Set(["kapal"] as const) })).toBeNull()
  })

  it("flags risk near departure and below minimum", () => {
    const items = checklistTemplate({ durationNights: 2 }).map((item, i) => ({ ...item, done: i < 2 }))
    const result = tripReadiness({
      departure: { kind: "scheduled", startDate: "2026-10-25", endDate: "2026-10-27" },
      checklist: { items },
      guaranteed: false,
      today: TODAY,
    })
    expect(result.status).toBe("preparing")
    expect(result.riskReasons).toHaveLength(2)
    const done = tripReadiness({
      departure: { kind: "scheduled", startDate: "2026-10-01", endDate: "2026-10-03" },
      checklist: { items },
      guaranteed: true,
      today: TODAY,
    })
    expect(done).toMatchObject({ status: "completed", atRisk: false })
  })
})
