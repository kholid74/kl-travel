import type { PackageStatus } from "@/domain/entities"
import type { DepartureDisplayStatus } from "@/domain/rules/availability"
import type { ReadinessStatus } from "@/domain/rules/trip-readiness"
import type { Tone } from "@/components/shared/status-badge"
import type { DepartureOption } from "@/services/queries/catalog"

export const PACKAGE_STATUS_TONE: Record<PackageStatus, Tone> = {
  draft: "neutral",
  published: "success",
  archived: "warning",
}

export const READINESS_TONE: Record<ReadinessStatus, Tone> = {
  not_started: "neutral",
  preparing: "info",
  ready: "success",
  in_progress: "accent",
  completed: "neutral",
  cancelled: "danger",
}

export const DEPARTURE_STATUS_TONE: Record<DepartureDisplayStatus, Tone> = {
  open: "success",
  limited: "warning",
  full: "danger",
  closed: "neutral",
  departed: "info",
  completed: "neutral",
  cancelled: "danger",
}

/** Public wording for a departure's seats, e.g. "Sisa 2 kursi", "Penuh". */
export function departureSeatLabel(option: Pick<DepartureOption, "status" | "seats">): string {
  switch (option.status) {
    case "open":
      return `${option.seats.available} kursi tersedia`
    case "limited":
      return `Sisa ${option.seats.available} kursi`
    case "full":
      return "Penuh"
    case "closed":
      return "Penjualan ditutup"
    default:
      return "Tidak tersedia"
  }
}
