import { z } from "zod"
import type { TravelDates } from "@/domain/entities"
import type { BudgetRange, Interest } from "@/domain/types/common"
import { BUDGET_LABEL, INTEREST_LABEL } from "@/domain/labels"
import { contactSchema, EMPTY_CONTACT } from "@/features/customers/schemas"

export const INTERESTS = Object.keys(INTEREST_LABEL) as Interest[]
export const BUDGETS = Object.keys(BUDGET_LABEL) as BudgetRange[]

const dateOnly = z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Tanggal tidak valid.")

/** Exact date / date range / flexible month. Which keys are required depends on `kind`. */
export const datePreferenceSchema = z
  .object({
    kind: z.enum(["exact", "range", "flexible"]),
    startDate: dateOnly,
    endDate: dateOnly,
    month: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "exact" && !value.startDate) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Pilih tanggal berangkat." })
    if (value.kind === "range") {
      if (!value.startDate) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Pilih tanggal berangkat dan pulang." })
      else if (!value.endDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Pilih juga tanggal pulang." })
    }
    if (value.kind === "flexible" && !value.month) ctx.addIssue({ code: "custom", path: ["month"], message: "Pilih perkiraan bulan." })
  })

export type DatePreferenceValues = z.input<typeof datePreferenceSchema>

export const EMPTY_DATES: DatePreferenceValues = { kind: "exact", startDate: "", endDate: "", month: "" }

export function toTravelDates(value: DatePreferenceValues): TravelDates {
  if (value.kind === "exact") return { kind: "exact", startDate: value.startDate }
  if (value.kind === "range") return { kind: "range", from: value.startDate, to: value.endDate }
  return { kind: "flexible", month: value.month || undefined }
}

const agreeField = z.boolean().refine((value) => value, "Centang untuk melanjutkan.")

/** Private Trip request: date → group size → special requirements → contact. */
export const privateRequestSchema = z.object({
  dates: datePreferenceSchema,
  groupSize: z.number().int().min(1),
  interests: z.array(z.string()),
  message: z.string().trim().max(1000, "Maksimal 1.000 karakter."),
  contact: contactSchema,
  agree: agreeField,
})

export type PrivateRequestValues = z.input<typeof privateRequestSchema>

export const PRIVATE_STEP_FIELDS = [["dates"], ["groupSize"], ["interests", "message"], ["contact", "agree"]] as const

/** Custom Trip: destinations → dates → group → budget → interests → summary & contact. */
export const customTripSchema = z.object({
  destinationIds: z.array(z.string()).min(1, "Pilih minimal satu destinasi."),
  dates: datePreferenceSchema,
  durationDays: z.number().int().min(1).max(21),
  groupSize: z.number().int().min(1).max(40),
  budget: z.string().min(1, "Pilih kisaran budget."),
  interests: z.array(z.string()).min(1, "Pilih minimal satu minat."),
  message: z.string().trim().max(1000, "Maksimal 1.000 karakter."),
  contact: contactSchema,
  agree: agreeField,
})

export type CustomTripValues = z.input<typeof customTripSchema>

export const CUSTOM_STEP_FIELDS = [["destinationIds"], ["dates", "durationDays"], ["groupSize"], ["budget"], ["interests"], ["message", "contact", "agree"]] as const

/** General question from /kontak. */
export const contactQuestionSchema = z.object({
  contact: contactSchema,
  packageId: z.string(),
  message: z.string().trim().min(10, "Tuliskan pertanyaan Anda (minimal 10 karakter).").max(1000, "Maksimal 1.000 karakter."),
})

export type ContactQuestionValues = z.input<typeof contactQuestionSchema>

export { EMPTY_CONTACT }
