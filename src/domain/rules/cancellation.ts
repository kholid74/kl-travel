import { diffDays, type DateOnly } from "@/lib/dates"
import type { BookingStatus, CancellationReason, CancellationTier } from "../entities"
import type { IDR } from "../types/common"

export const DEFAULT_CANCELLATION_POLICY: CancellationTier[] = [
  { minDaysBefore: 30, feePercent: 25 },
  { minDaysBefore: 15, feePercent: 50 },
  { minDaysBefore: 7, feePercent: 75 },
  { minDaysBefore: 0, feePercent: 100 },
]

export function applicableTier(policy: readonly CancellationTier[], daysBefore: number): CancellationTier | null {
  const sorted = [...policy].sort((a, b) => b.minDaysBefore - a.minDaysBefore)
  return sorted.find((tier) => daysBefore >= tier.minDaysBefore) ?? sorted.at(-1) ?? null
}

export interface CancellationQuote {
  daysBefore: number
  tier: CancellationTier | null
  /** True when no fee applies (not yet confirmed, or operator cancelled). */
  waived: boolean
  feePercent: number
  fee: IDR
  refund: IDR
}

/** docs/domain-model.md §6.6 */
export function cancellationQuote(input: {
  status: BookingStatus
  reason: CancellationReason
  total: IDR
  paidNet: IDR
  departureStart: DateOnly
  today: DateOnly
  policy: readonly CancellationTier[]
}): CancellationQuote {
  const daysBefore = diffDays(input.departureStart, input.today)
  const waived =
    input.status === "pending" || input.status === "awaiting_payment" || input.reason === "departure_cancelled"
  const tier = waived ? null : applicableTier(input.policy, daysBefore)
  const feePercent = tier?.feePercent ?? 0
  const fee = Math.round((input.total * feePercent) / 100)
  return {
    daysBefore,
    tier,
    waived,
    feePercent,
    fee,
    refund: Math.max(0, input.paidNet - fee),
  }
}
