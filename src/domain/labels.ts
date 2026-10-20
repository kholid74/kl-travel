/**
 * Indonesian labels for domain vocabulary (see CONTEXT.md). Shared by the UI and by
 * activity messages written into the database. Visual tones live in features/*.
 */
import type {
  Article,
  BookingStatus,
  CancellationReason,
  CostCategory,
  FitnessLevel,
  FollowUp,
  InquiryType,
  LostReason,
  PackageStatus,
  PaymentMethod,
  PaymentRecordStatus,
  Permission,
  PipelineStage,
  VendorAssignment,
  VendorCategory,
} from "./entities"
import type { CustomerStage } from "./rules/customer-identity"
import type { DepartureDisplayStatus } from "./rules/availability"
import type { QuotationDisplayStatus } from "./rules/inquiry-pipeline"
import type { PaymentStatus } from "./rules/payment-status"
import type { ReadinessStatus } from "./rules/trip-readiness"
import type { BudgetRange, DestinationCategory, Interest, RegionKey, Source, TripType } from "./types/common"

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

export const PAYMENT_RECORD_STATUS_LABEL: Record<PaymentRecordStatus, string> = {
  pending_verification: "Menunggu verifikasi",
  verified: "Terverifikasi",
  rejected: "Ditolak",
}

export const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  transport: "Transportasi",
  accommodation: "Akomodasi",
  meals: "Konsumsi",
  guide: "Guide",
  tickets: "Tiket masuk",
  activities: "Aktivitas",
  documentation: "Dokumentasi",
  other: "Operasional lain",
}

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  transportasi: "Transportasi",
  kapal: "Kapal",
  akomodasi: "Akomodasi",
  restoran: "Restoran",
  aktivitas: "Aktivitas",
  tiket: "Tiket",
  dokumentasi: "Dokumentasi",
}

export const VENDOR_ASSIGNMENT_STATUS_LABEL: Record<VendorAssignment["status"], string> = {
  requested: "Diminta",
  confirmed: "Terkonfirmasi",
  cancelled: "Dibatalkan",
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

/** Phrased to complete "tidak memiliki izin untuk …". */
export const PERMISSION_LABEL: Record<Permission, string> = {
  "inquiries.manage": "mengelola inquiry",
  "bookings.manage": "mengelola booking",
  "bookings.cancel": "membatalkan booking",
  "payments.record": "mencatat pembayaran",
  "payments.verify": "memverifikasi pembayaran",
  "packages.manage": "mengelola paket",
  "packages.publish": "memublikasikan paket",
  "departures.manage": "mengelola keberangkatan",
  "operations.manage": "mengelola operasional trip",
  "costing.manage": "mengelola HPP",
  "content.manage": "mengelola konten website",
  "reports.view": "melihat laporan",
  "team.manage": "mengelola tim",
  "settings.manage": "mengubah pengaturan",
}

export const FOLLOW_UP_CHANNEL_LABEL: Record<FollowUp["channel"], string> = {
  whatsapp: "WhatsApp",
  telepon: "Telepon",
  email: "Email",
  meeting: "Meeting",
}

export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Diarsipkan",
}

export const CUSTOMER_STAGE_LABEL: Record<CustomerStage, string> = {
  prospect: "Prospek",
  customer: "Pelanggan",
  repeat: "Repeat",
}

export const ARTICLE_CATEGORY_LABEL: Record<Article["category"], string> = {
  panduan: "Panduan",
  inspirasi: "Inspirasi",
  tips: "Tips",
}

export const DESTINATION_CATEGORY_LABEL: Record<DestinationCategory, string> = {
  bahari: "Bahari",
  pulau: "Pulau",
  pegunungan: "Pegunungan",
  budaya: "Budaya",
  petualangan: "Petualangan",
  santai: "Santai",
}

export const FITNESS_LABEL: Record<FitnessLevel, string> = {
  ringan: "Ringan",
  sedang: "Sedang",
  menantang: "Menantang",
}

export const BUDGET_LABEL: Record<BudgetRange, string> = {
  lt_3jt: "< Rp3 jt / orang",
  "3_5jt": "Rp3–5 jt / orang",
  "5_10jt": "Rp5–10 jt / orang",
  "10_20jt": "Rp10–20 jt / orang",
  gt_20jt: "> Rp20 jt / orang",
}
