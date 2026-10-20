import { formatDate } from "@/lib/format"
import type { TourPackage } from "@/domain/entities"
import type { PackageAvailability } from "@/services/queries/catalog"

export interface AvailabilityLine {
  text: string
  tone: "default" | "warning" | "muted"
}

/** One honest line under a package card, e.g. "Berangkat 4 Nov · sisa 3 kursi". */
export function availabilityLine(
  pkg: Pick<TourPackage, "tripType" | "groupSize">,
  availability: PackageAvailability | null | undefined,
): AvailabilityLine | null {
  if (pkg.tripType !== "open") {
    const { min, max } = pkg.groupSize
    return { text: `Tanggal pilihan Anda · ${min === max ? `${min} orang` : `${min}–${max} orang`}`, tone: "default" }
  }
  if (!availability) return null
  const { next, bookableCount, options } = availability
  if (!next) {
    return { text: options.length ? "Jadwal terdekat sudah penuh" : "Jadwal berikutnya segera diumumkan", tone: "muted" }
  }
  const limited = next.status === "limited"
  const seats = limited ? `sisa ${next.seats.available} kursi` : `${next.seats.available} kursi tersedia`
  const more = bookableCount > 1 ? ` · +${bookableCount - 1} jadwal` : ""
  return { text: `Berangkat ${formatDate(next.departure.startDate, "day-month")} · ${seats}${more}`, tone: limited ? "warning" : "default" }
}
