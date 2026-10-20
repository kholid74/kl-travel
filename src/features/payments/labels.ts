import type { PaymentRecordStatus } from "@/domain/entities"
import type { Tone } from "@/components/shared/status-badge"

export const PAYMENT_RECORD_TONE: Record<PaymentRecordStatus, Tone> = {
  pending_verification: "info",
  verified: "success",
  rejected: "danger",
}
