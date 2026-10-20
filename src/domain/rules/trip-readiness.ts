import { diffDays, type DateOnly } from "@/lib/dates"
import type { ChecklistItem, ChecklistKey, Departure, TourPackage, TripChecklist, VendorCategory } from "../entities"

export const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
  transport: "Konfirmasi transportasi",
  accommodation: "Konfirmasi akomodasi",
  traveler_data: "Verifikasi data peserta",
  itinerary: "Siapkan itinerary final",
  guide: "Konfirmasi guide",
  briefing: "Kirim briefing ke peserta (simulasi)",
  equipment: "Siapkan perlengkapan & dokumentasi",
  manifest: "Finalisasi manifest peserta",
}

const ORDER: ChecklistKey[] = [
  "transport",
  "accommodation",
  "traveler_data",
  "itinerary",
  "guide",
  "briefing",
  "equipment",
  "manifest",
]

/** Day trips have no accommodation item. */
export function checklistTemplate(pkg: Pick<TourPackage, "durationNights">): ChecklistItem[] {
  return ORDER.filter((key) => key !== "accommodation" || pkg.durationNights > 0).map((key) => ({
    key,
    label: CHECKLIST_LABELS[key],
    done: false,
  }))
}

export interface ChecklistContext {
  guideAssigned: boolean
  confirmedVendorServices: ReadonlySet<VendorCategory>
  allTravelersComplete: boolean
  hasActiveHolds: boolean
  travelerDataDone: boolean
}

/** Reason an item cannot be ticked yet, or null (docs/domain-model.md §6.9). */
export function checklistBlocker(key: ChecklistKey, ctx: ChecklistContext): string | null {
  switch (key) {
    case "transport":
      return ctx.confirmedVendorServices.has("transportasi") || ctx.confirmedVendorServices.has("kapal")
        ? null
        : "Konfirmasi vendor transportasi atau kapal terlebih dahulu."
    case "accommodation":
      return ctx.confirmedVendorServices.has("akomodasi") || ctx.confirmedVendorServices.has("kapal")
        ? null
        : "Konfirmasi vendor akomodasi atau kapal terlebih dahulu."
    case "traveler_data":
      return ctx.allTravelersComplete ? null : "Masih ada data peserta yang belum lengkap."
    case "guide":
      return ctx.guideAssigned ? null : "Tugaskan guide terlebih dahulu."
    case "manifest":
      if (!ctx.travelerDataDone) return "Selesaikan verifikasi data peserta terlebih dahulu."
      return ctx.hasActiveHolds ? "Masih ada booking yang menahan kursi." : null
    default:
      return null
  }
}

export type ReadinessStatus = "not_started" | "preparing" | "ready" | "in_progress" | "completed" | "cancelled"

export interface TripReadiness {
  status: ReadinessStatus
  done: number
  total: number
  progress: number
  atRisk: boolean
  riskReasons: string[]
}

export const AT_RISK_DAYS = 7
export const GO_NO_GO_DAYS = 45

export function tripReadiness(input: {
  departure: Pick<Departure, "kind" | "startDate" | "endDate" | "cancelledAt">
  checklist?: Pick<TripChecklist, "items">
  guaranteed: boolean
  today: DateOnly
}): TripReadiness {
  const { departure, checklist, guaranteed, today } = input
  const items = checklist?.items ?? []
  const done = items.filter((item) => item.done).length
  const total = items.length
  const progress = total ? done / total : 0

  let status: ReadinessStatus
  if (departure.cancelledAt) status = "cancelled"
  else if (today > departure.endDate) status = "completed"
  else if (today >= departure.startDate) status = "in_progress"
  else if (total > 0 && done === total) status = "ready"
  else if (done > 0) status = "preparing"
  else status = "not_started"

  const riskReasons: string[] = []
  if (status === "not_started" || status === "preparing") {
    const daysToGo = diffDays(departure.startDate, today)
    if (daysToGo <= AT_RISK_DAYS && progress < 0.75) riskReasons.push("Persiapan belum 75% menjelang keberangkatan")
    if (departure.kind === "scheduled" && !guaranteed && daysToGo <= GO_NO_GO_DAYS) {
      riskReasons.push("Peserta terkonfirmasi belum mencapai minimum")
    }
  }

  return { status, done, total, progress, atRisk: riskReasons.length > 0, riskReasons }
}
