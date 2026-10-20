import { addDays, diffDays, type DateOnly } from "@/lib/dates"
import type { Installment } from "../entities"
import type { IDR } from "../types/common"

export type InstallmentDraft = Omit<Installment, "id">

/**
 * Payment schedule for a new invoice (docs/domain-model.md §6.4).
 * Late bookings and 100% deposit packages get a single full payment.
 * The deposit is rounded up to the nearest Rp1.000; the balance takes the remainder,
 * so installments always sum exactly to the total.
 */
export function buildInstallments(input: {
  total: IDR
  depositPercent: number
  balanceDueDaysBefore: number
  departureStart: DateOnly
  today: DateOnly
  depositDueDate: DateOnly
}): InstallmentDraft[] {
  const { total, depositPercent, balanceDueDaysBefore, departureStart, today, depositDueDate } = input
  const daysToDeparture = diffDays(departureStart, today)

  if (depositPercent >= 100 || daysToDeparture <= balanceDueDaysBefore) {
    return [{ kind: "full", label: "Pembayaran penuh", amount: total, dueDate: depositDueDate }]
  }

  const deposit = Math.min(total, Math.ceil((total * depositPercent) / 100 / 1000) * 1000)
  return [
    { kind: "deposit", label: `DP ${depositPercent}%`, amount: deposit, dueDate: depositDueDate },
    {
      kind: "balance",
      label: "Pelunasan",
      amount: total - deposit,
      dueDate: addDays(departureStart, -balanceDueDaysBefore),
    },
  ]
}
