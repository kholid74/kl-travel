import type { PipelineStage, TravelDates } from "@/domain/entities"
import { formatDate, formatDateRange } from "@/lib/format"

/** "Rabu, 4 Nov 2026", "4–10 Nov 2026", "Fleksibel, Februari 2027". */
export function formatTravelDates(dates: TravelDates): string {
  switch (dates.kind) {
    case "exact":
      return formatDate(dates.startDate, "weekday")
    case "range":
      return formatDateRange(dates.from, dates.to)
    case "flexible":
      return dates.month ? `Fleksibel, ${formatDate(`${dates.month}-01`, "month-year")}` : "Tanggal fleksibel"
  }
}

/** What the customer sees for each pipeline stage (the team sees PIPELINE_STAGE_LABEL). */
export const CUSTOMER_STAGE_TEXT: Record<PipelineStage, { title: string; body: string }> = {
  new: { title: "Permintaan diterima", body: "Tim kami akan menghubungi Anda dalam 1 hari kerja untuk membahas detailnya." },
  contacted: { title: "Sedang dibahas", body: "Tim kami sudah menghubungi Anda dan sedang menyiapkan penawaran." },
  quotation_sent: { title: "Penawaran dikirim", body: "Penawaran berisi itinerary dan harga sudah dikirim. Silakan periksa WhatsApp atau email Anda (simulasi)." },
  negotiation: { title: "Penawaran sedang disesuaikan", body: "Kami sedang menyesuaikan penawaran sesuai masukan Anda." },
  won: { title: "Penawaran disetujui", body: "Terima kasih. Booking dan invoice disiapkan oleh tim kami." },
  lost: { title: "Permintaan ditutup", body: "Permintaan ini sudah ditutup. Anda selalu bisa mengirim permintaan baru." },
}
