import type { DateOnly } from "@/lib/dates"
import type { Inquiry, PipelineStage, Quotation, QuotationStatus } from "../entities"

export const PIPELINE_STAGES: PipelineStage[] = ["new", "contacted", "quotation_sent", "negotiation", "won", "lost"]

export type QuotationDisplayStatus = QuotationStatus | "expired"

export function quotationDisplayStatus(quotation: Pick<Quotation, "status" | "validUntil">, today: DateOnly): QuotationDisplayStatus {
  if (quotation.status === "sent" && quotation.validUntil < today) return "expired"
  return quotation.status
}

export type StageMove =
  | { ok: true }
  | { ok: false; reason: string; needs?: "quotation" | "accepted_quotation" | "lost_reason" }

/** Rules from docs/domain-model.md §5.2. */
export function canMoveInquiry(input: {
  inquiry: Pick<Inquiry, "stage" | "type" | "convertedBookingId">
  to: PipelineStage
  quotations: readonly Pick<Quotation, "status" | "validUntil">[]
  today: DateOnly
  lostReasonProvided?: boolean
}): StageMove {
  const { inquiry, to, quotations, today } = input
  const from = inquiry.stage

  if (inquiry.convertedBookingId) return { ok: false, reason: "Inquiry sudah dikonversi menjadi booking." }
  if (from === to) return { ok: false, reason: "Inquiry sudah berada di tahap ini." }
  if (to === "new") return { ok: false, reason: "Inquiry tidak dapat dikembalikan ke tahap Baru." }

  if (from === "lost") {
    return to === "contacted" ? { ok: true } : { ok: false, reason: "Inquiry yang gagal hanya bisa dibuka kembali ke tahap Dihubungi." }
  }
  if (from === "won") {
    return to === "negotiation" ? { ok: true } : { ok: false, reason: "Deal hanya bisa dibatalkan kembali ke tahap Negosiasi." }
  }

  const hasSent = quotations.some((q) => quotationDisplayStatus(q, today) === "sent")
  const hasAccepted = quotations.some((q) => q.status === "accepted")

  switch (to) {
    case "lost":
      return input.lostReasonProvided ? { ok: true } : { ok: false, reason: "Pilih alasan inquiry gagal.", needs: "lost_reason" }
    case "contacted":
      return from === "new" ? { ok: true } : { ok: false, reason: "Tahap Dihubungi hanya dari inquiry baru." }
    case "quotation_sent":
      return hasSent || hasAccepted
        ? { ok: true }
        : { ok: false, reason: "Kirim penawaran terlebih dahulu.", needs: "quotation" }
    case "negotiation":
      return from === "quotation_sent"
        ? { ok: true }
        : { ok: false, reason: "Negosiasi dimulai setelah penawaran dikirim.", needs: hasSent ? undefined : "quotation" }
    case "won":
      if (inquiry.type === "general") return { ok: true }
      return hasAccepted
        ? { ok: true }
        : { ok: false, reason: "Tandai penawaran sebagai disetujui pelanggan terlebih dahulu.", needs: "accepted_quotation" }
  }
}

export function canConvertInquiry(inquiry: Pick<Inquiry, "stage" | "convertedBookingId">): string | null {
  if (inquiry.convertedBookingId) return "Inquiry sudah dikonversi."
  if (inquiry.stage !== "won") return "Hanya inquiry berstatus Berhasil yang dapat dikonversi."
  return null
}
