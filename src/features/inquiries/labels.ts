import type { PipelineStage } from "@/domain/entities"
import type { QuotationDisplayStatus } from "@/domain/rules/inquiry-pipeline"
import type { Tone } from "@/components/shared/status-badge"

export const STAGE_TONE: Record<PipelineStage, Tone> = {
  new: "info",
  contacted: "neutral",
  quotation_sent: "accent",
  negotiation: "warning",
  won: "success",
  lost: "danger",
}

export const QUOTATION_TONE: Record<QuotationDisplayStatus, Tone> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "danger",
  expired: "warning",
}
