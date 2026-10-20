import { DEFAULT_CANCELLATION_POLICY } from "@/domain/rules/cancellation"
import type { CostItem, ItineraryDay, TourPackage } from "@/domain/entities"
import type { Fixture } from "../types"

export type CostLine = Pick<CostItem, "category" | "label" | "basis" | "unitCost" | "quantity">

export type PackageFixture = Fixture<TourPackage> & {
  /** Planning cost template; copied to every departure by the seed builder. */
  costTemplate: CostLine[]
}

/** Meals as a compact code: "B" sarapan, "L" makan siang, "D" makan malam. */
export function day(
  packageId: string,
  n: number,
  title: string,
  description: string,
  activities: string[],
  meals: string,
  accommodation?: string,
): ItineraryDay {
  return {
    id: `${packageId}_d${n}`,
    day: n,
    title,
    description,
    activities,
    meals: { breakfast: meals.includes("B"), lunch: meals.includes("L"), dinner: meals.includes("D") },
    accommodation,
  }
}

export const fixed = (category: CostLine["category"], label: string, unitCost: number, quantity = 1): CostLine => ({
  category,
  label,
  basis: "fixed",
  unitCost,
  quantity,
})

export const perPax = (category: CostLine["category"], label: string, unitCost: number, quantity = 1): CostLine => ({
  category,
  label,
  basis: "per_pax",
  unitCost,
  quantity,
})

export const STANDARD_POLICY = DEFAULT_CANCELLATION_POLICY

export const OPEN_TRIP_TERMS = [
  "Harga berlaku per orang dalam Rupiah untuk tanggal keberangkatan yang dipilih.",
  "Kursi dianggap terkonfirmasi setelah DP diterima dan diverifikasi tim kami.",
  "Peserta bergabung dalam grup bersama peserta lain; kamar dan kabin berbagi sesuai jenis kelamin kecuali dipesan berpasangan.",
  "Itinerary dapat disesuaikan dengan kondisi cuaca, laut, dan keputusan otoritas setempat demi keselamatan.",
  "Perubahan nama peserta dapat dilakukan paling lambat H-7 tanpa biaya.",
  "Keberangkatan dijalankan bila jumlah peserta minimum tercapai; bila tidak, peserta dapat memilih jadwal lain atau pengembalian dana penuh.",
]

export const PRIVATE_TRIP_TERMS = [
  "Harga per orang bergantung pada jumlah peserta dalam grup dan berlaku untuk tanggal yang disepakati di penawaran.",
  "Penawaran berlaku sesuai tanggal yang tertera dan menjadi booking setelah DP diterima.",
  "Seluruh kendaraan, guide, dan aktivitas bersifat privat untuk grup Anda.",
  "Itinerary dapat disesuaikan bersama tim kami sebelum keberangkatan tanpa biaya tambahan selama komponen biaya tidak berubah.",
  "Perubahan jumlah peserta setelah konfirmasi dapat mengubah harga per orang.",
]

export const COMMON_EXCLUSIONS = [
  "Tiket pesawat atau kereta menuju titik kumpul",
  "Pengeluaran pribadi dan oleh-oleh",
  "Tip untuk guide dan kru (sukarela)",
]

export const OPEN_PAYMENT = { depositPercent: 30, balanceDueDaysBefore: 14 }
export const DAY_TRIP_PAYMENT = { depositPercent: 100, balanceDueDaysBefore: 14 }
