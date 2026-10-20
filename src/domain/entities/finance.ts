import type { Actor, DateOnly, EntityMeta, ID, IDR, PriceLine, Timestamp } from "../types/common"

export interface Installment {
  id: ID
  kind: "deposit" | "balance" | "full"
  label: string
  amount: IDR
  dueDate: DateOnly
}

export interface Invoice extends EntityMeta {
  number: string
  bookingId: ID
  issuedAt: Timestamp
  lines: PriceLine[]
  discount: IDR
  installments: Installment[]
  voidedAt?: Timestamp
  notes?: string
}

export type PaymentMethod = "transfer_bank" | "virtual_account" | "qris" | "kartu_kredit" | "tunai"

export type PaymentRecordStatus = "pending_verification" | "verified" | "rejected"

export interface Payment extends EntityMeta {
  code: string
  bookingId: ID
  invoiceId?: ID
  direction: "in" | "refund"
  /** Always positive; `direction` carries the sign. */
  amount: IDR
  method: PaymentMethod
  status: PaymentRecordStatus
  paidAt: Timestamp
  reference?: string
  proofMediaId?: ID
  submittedBy: Actor
  verifiedAt?: Timestamp
  verifiedBy?: ID
  rejectionReason?: string
  note?: string
}
