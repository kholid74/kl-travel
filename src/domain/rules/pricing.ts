import type { Departure, PriceTier, TourPackage } from "../entities"
import type { IDR, PriceLine } from "../types/common"

export function linesSubtotal(lines: readonly Pick<PriceLine, "quantity" | "unitPrice">[]): IDR {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
}

/** Total after discount, never negative. */
export function priceTotal(input: { lines: readonly Pick<PriceLine, "quantity" | "unitPrice">[]; discount: IDR }): IDR {
  return Math.max(0, linesSubtotal(input.lines) - input.discount)
}

export function tierFor(tiers: readonly PriceTier[], pax: number): PriceTier | undefined {
  return tiers.find((tier) => pax >= tier.minPax && pax <= tier.maxPax)
}

/** Lowest per-person price for "mulai dari" labels. Null for quoted (custom) packages. */
export function startingPrice(pkg: Pick<TourPackage, "pricing">): IDR | null {
  switch (pkg.pricing.kind) {
    case "per_pax":
      return pkg.pricing.pricePerPax
    case "tiered":
      return pkg.pricing.tiers.length ? Math.min(...pkg.pricing.tiers.map((tier) => tier.pricePerPax)) : null
    case "quoted":
      return null
  }
}

/** Per-person price for a pax count: departure override, package price, or the matching tier. */
export function pricePerPax(
  pkg: Pick<TourPackage, "pricing">,
  pax: number,
  departure?: Pick<Departure, "pricePerPaxOverride">,
): IDR | null {
  if (departure?.pricePerPaxOverride) return departure.pricePerPaxOverride
  switch (pkg.pricing.kind) {
    case "per_pax":
      return pkg.pricing.pricePerPax
    case "tiered":
      return tierFor(pkg.pricing.tiers, pax)?.pricePerPax ?? null
    case "quoted":
      return null
  }
}
