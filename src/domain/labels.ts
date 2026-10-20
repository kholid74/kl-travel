/**
 * Indonesian labels for domain vocabulary (see CONTEXT.md). Shared by the UI and by
 * activity messages written into the database. Visual tones live in features/*.
 */
import type { BookingStatus, CancellationReason, InquiryType, LostReason, PaymentMethod, PipelineStage } from "./entities"
import type { DepartureDisplayStatus } from "./rules/availability"
import type { QuotationDisplayStatus } from "./rules/inquiry-pipeline"
import type { PaymentStatus } from "./rules/payment-status"
import type { ReadinessStatus } from "./rules/trip-readiness"
import type { BudgetRange, Interest, RegionKey, Source, TripType } from "./types/common"

export const TRIP_TYPE_LABEL: Record<TripType, string> = {
  open: "Open Trip",
  private: "Private Trip",
  custom: "Custom Trip",
}

export const REGION_LABEL: Record<RegionKey, string> = {
  "bali-nusa-tenggara": "Bali & Nusa Tenggara",
  jawa: "Jawa",
  "sumatra-kepulauan": "Sumatra & Kepulauan",
  "papua-maluku": "Papua & Maluku",
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Menunggu Verifikasi",
  awaiting_payment: "Menunggu Pembayaran",
  confirmed: "Terkonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Belum dibayar",
  partially_paid: "Dibayar sebagian",
  paid: "Lunas",
  overdue: "Lewat jatuh tempo",
  refund_pending: "Refund diproses",
  refunded: "Refund selesai",
  closed: "Tanpa refund",
}

export const DEPARTURE_STATUS_LABEL: Record<DepartureDisplayStatus, string> = {
  open: "Tersedia",
  limited: "Kursi terbatas",
  full: "Penuh",
  closed: "Penjualan ditutup",
  departed: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
}

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  new: "Baru",
  contacted: "Dihubungi",
  quotation_sent: "Penawaran Dikirim",
  negotiation: "Negosiasi",
  won: "Berhasil",
  lost: "Gagal",
}

export const QUOTATION_STATUS_LABEL: Record<QuotationDisplayStatus, string> = {
  draft: "Draf",
  sent: "Terkirim",
  accepted: "Disetujui",
  rejected: "Ditolak",
  expired: "Kedaluwarsa",
}

export const INQUIRY_TYPE_LABEL: Record<InquiryType, string> = {
  private: "Private Trip",
  custom: "Custom Trip",
  general: "Pertanyaan umum",
}

export const LOST_REASON_LABEL: Record<LostReason, string> = {
  harga: "Harga tidak sesuai",
  tanggal_tidak_cocok: "Tanggal tidak cocok",
  pilih_kompetitor: "Memilih operator lain",
  tidak_ada_respons: "Tidak ada respons",
  rencana_batal: "Rencana perjalanan batal",
}

export const CANCELLATION_REASON_LABEL: Record<CancellationReason, string> = {
  customer_request: "Permintaan pelanggan",
  hold_expired: "Batas waktu pembayaran terlewati",
  departure_cancelled: "Keberangkatan dibatalkan",
  other: "Lainnya",
}

export const SOURCE_LABEL: Record<Source, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  referral: "Referral",
  google_ads: "Google Ads",
  repeat: "Pelanggan lama",
  walk_in: "Datang langsung",
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer_bank: "Transfer bank",
  virtual_account: "Virtual account",
  qris: "QRIS",
  kartu_kredit: "Kartu kredit",
  tunai: "Tunai",
}

export const READINESS_LABEL: Record<ReadinessStatus, string> = {
  not_started: "Belum disiapkan",
  preparing: "Dalam persiapan",
  ready: "Siap berangkat",
  in_progress: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
}

export const INTEREST_LABEL: Record<Interest, string> = {
  snorkeling: "Snorkeling",
  diving: "Diving",
  hiking: "Mendaki",
  budaya: "Budaya",
  kuliner: "Kuliner",
  fotografi: "Fotografi",
  santai: "Santai",
  honeymoon: "Bulan madu",
  keluarga: "Keluarga",
  petualangan: "Petualangan",
}

export const BUDGET_LABEL: Record<BudgetRange, string> = {
  lt_3jt: "< Rp3 jt / orang",
  "3_5jt": "Rp3–5 jt / orang",
  "5_10jt": "Rp5–10 jt / orang",
  "10_20jt": "Rp10–20 jt / orang",
  gt_20jt: "> Rp20 jt / orang",
}
