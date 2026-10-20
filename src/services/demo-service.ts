import { diffDays, toDateOnlyWIB, type Timestamp } from "@/lib/dates"
import type { DemoDatabase } from "@/domain/database"
import { SEED_VERSION } from "@/data/seed/build-seed"
import { getDataSource } from "@/repositories"

export const SEED_STALE_AFTER_DAYS = 14

export interface DemoStatus {
  seedAnchor: string
  ageDays: number
  stale: boolean
  outdated: boolean
}

export function demoStatus(db: DemoDatabase, now: Timestamp): DemoStatus {
  const ageDays = diffDays(toDateOnlyWIB(now), db.meta.seedAnchor)
  return {
    seedAnchor: db.meta.seedAnchor,
    ageDays,
    stale: ageDays > SEED_STALE_AFTER_DAYS,
    outdated: db.meta.seedVersion !== SEED_VERSION,
  }
}

/** Rebuilds the demo dataset relative to today. Irreversible for this browser. */
export function resetDemoData() {
  return getDataSource().reset()
}

/** Pages whose visit completes a journey step that leaves no trace in the data. */
export type JourneyVisit = "package" | "dashboard" | "overview" | "departure" | "reports"

export interface JourneyStep {
  key: "explore" | "book" | "dashboard" | "review" | "payment" | "departure" | "stats"
  title: string
  body: string
  href: string
  cta: string
}

/** The suggested demo journey (requirement §10), in order. */
export const JOURNEY_STEPS: JourneyStep[] = [
  { key: "explore", title: "Jelajahi paket", body: "Cari dan filter paket, lalu buka salah satu detailnya.", href: "/paket", cta: "Buka daftar paket" },
  { key: "book", title: "Buat booking", body: "Pilih jadwal open trip, isi data contoh, dan kirim. Kursi langsung ditahan 24 jam.", href: "/paket/sailing-komodo-phinisi-3h2m/pesan", cta: "Pesan open trip" },
  { key: "dashboard", title: "Buka dashboard", body: "Booking baru muncul di ringkasan dan aktivitas terbaru.", href: "/dashboard", cta: "Buka dashboard" },
  { key: "review", title: "Tinjau booking", body: "Verifikasi booking agar invoice dengan jadwal DP terbit.", href: "/dashboard/bookings?status=pending", cta: "Booking menunggu verifikasi" },
  { key: "payment", title: "Perbarui pembayaran", body: "Catat atau verifikasi pembayaran DP; status booking ikut berubah.", href: "/dashboard/payments", cta: "Pembayaran" },
  { key: "departure", title: "Tinjau keberangkatan", body: "Cek sisa kursi, manifest, dan kesiapan trip.", href: "/dashboard/departures", cta: "Keberangkatan" },
  { key: "stats", title: "Lihat statistik", body: "KPI dan laporan dihitung ulang dari data yang baru Anda ubah.", href: "/dashboard/reports", cta: "Laporan" },
]

/**
 * Which journey steps are done. Steps tick themselves from the data where possible (a
 * website booking made after the seed, a recorded payment) and from page visits otherwise.
 * Visits older than the current seed are ignored, so a reset restarts the guide.
 */
export function demoJourney(db: DemoDatabase, visits: Partial<Record<JourneyVisit, Timestamp>>): (JourneyStep & { done: boolean })[] {
  const since = db.meta.seededAt
  const visited = (key: JourneyVisit, after = since) => !!visits[key] && visits[key]! > after
  const events = Object.values(db.activity).filter((e) => e.at > since && e.actor.kind === "user")
  const paymentAt = events
    .filter((e) => e.action === "payment.verified" || e.action === "payment.recorded")
    .map((e) => e.at)
    .sort()
    .at(-1)
  const done: Record<JourneyStep["key"], boolean> = {
    explore: visited("package"),
    book: Object.values(db.bookings).some((b) => b.source === "website" && b.createdAt > since),
    dashboard: visited("dashboard") || visited("overview"),
    review: events.some((e) => e.action === "booking.approved" || e.action === "booking.cancelled"),
    payment: !!paymentAt,
    departure: visited("departure"),
    stats: visited("reports") || (!!paymentAt && visited("overview", paymentAt)),
  }
  return JOURNEY_STEPS.map((step) => ({ ...step, done: done[step.key] }))
}

/** Maps a pathname to the journey visit it counts as, if any. */
export function journeyVisitFor(pathname: string): JourneyVisit | null {
  if (/^\/paket\/[^/]+$/.test(pathname)) return "package"
  if (pathname === "/dashboard") return "overview"
  if (/^\/dashboard\/(departures|operations)\/[^/]+$/.test(pathname)) return "departure"
  if (pathname === "/dashboard/reports") return "reports"
  if (pathname.startsWith("/dashboard")) return "dashboard"
  return null
}
