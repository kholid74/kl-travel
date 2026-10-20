import type { CostCategory, CostItem } from "../entities"
import type { IDR } from "../types/common"

type CostLine = Pick<CostItem, "basis" | "unitCost" | "quantity" | "category">

export interface CostTotals {
  /** F — per departure, independent of participant count. */
  fixed: IDR
  /** v — per participant. */
  perPax: IDR
}

export function costTotals(items: readonly Pick<CostItem, "basis" | "unitCost" | "quantity">[]): CostTotals {
  let fixed = 0
  let perPax = 0
  for (const item of items) {
    const amount = item.unitCost * item.quantity
    if (item.basis === "fixed") fixed += amount
    else perPax += amount
  }
  return { fixed, perPax }
}

export interface ProfitAt {
  participants: number
  hpp: IDR
  hppPerPax: IDR | null
  revenue: IDR
  profit: IDR
  /** profit / revenue; null when revenue is 0 */
  margin: number | null
  /** profit / hpp; null when hpp is 0 */
  markup: number | null
}

/** docs/domain-model.md §6.10 */
export function profitAt(input: CostTotals & { pricePerPax: IDR; participants: number }): ProfitAt {
  const { fixed, perPax, pricePerPax, participants } = input
  const hpp = fixed + perPax * participants
  const revenue = pricePerPax * participants
  const profit = revenue - hpp
  return {
    participants,
    hpp,
    hppPerPax: participants > 0 ? Math.round(hpp / participants) : null,
    revenue,
    profit,
    margin: revenue > 0 ? profit / revenue : null,
    markup: hpp > 0 ? profit / hpp : null,
  }
}

/** Participants needed to cover cost, or null when price does not exceed variable cost. */
export function breakEvenParticipants(input: CostTotals & { pricePerPax: IDR }): number | null {
  const contribution = input.pricePerPax - input.perPax
  if (contribution <= 0) return null
  return Math.max(1, Math.ceil(input.fixed / contribution))
}

export function costByCategory(items: readonly CostLine[], participants: number): Record<CostCategory, IDR> {
  const result: Record<CostCategory, IDR> = {
    transport: 0,
    accommodation: 0,
    meals: 0,
    guide: 0,
    tickets: 0,
    activities: 0,
    documentation: 0,
    other: 0,
  }
  for (const item of items) {
    const amount = item.unitCost * item.quantity * (item.basis === "per_pax" ? participants : 1)
    result[item.category] += amount
  }
  return result
}

/** Realised cost is only known when every cost item has an actual amount. */
export function realizedCost(items: readonly Pick<CostItem, "actualAmount">[]): { total: IDR; complete: boolean } {
  const complete = items.length > 0 && items.every((item) => item.actualAmount !== undefined)
  return { total: items.reduce((sum, item) => sum + (item.actualAmount ?? 0), 0), complete }
}
