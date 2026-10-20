import { z } from "zod"
import { createId } from "@/lib/ids"
import { SLUG_PATTERN } from "@/lib/slug"
import type { TourPackage } from "@/domain/entities"
import { DEFAULT_CANCELLATION_POLICY } from "@/domain/rules/cancellation"
import type { PackageInput } from "@/services/catalog-admin-service"

const daySchema = z.object({
  id: z.string(),
  title: z.string().trim().min(3, "Isi judul hari."),
  description: z.string().trim(),
  activities: z.array(z.string()),
  meals: z.object({ breakfast: z.boolean(), lunch: z.boolean(), dinner: z.boolean() }),
  accommodation: z.string().trim(),
})

const money = z.number({ error: "Isi angka." }).int().min(0)

/** Package editor form. Lists are arrays; the conversion helpers map to PackageInput. */
export const packageFormSchema = z
  .object({
    title: z.string().trim().min(3, "Judul minimal 3 karakter."),
    slug: z.string().trim().refine((v) => v === "" || SLUG_PATTERN.test(v), "Huruf kecil, angka, dan tanda hubung saja."),
    tripType: z.enum(["open", "private", "custom"]),
    destinationId: z.string().min(1, "Pilih destinasi."),
    durationDays: z.number().int().min(1, "Minimal 1 hari.").max(30),
    durationNights: z.number().int().min(0).max(30),
    summary: z.string().trim().min(20, "Ringkasan minimal 20 karakter.").max(240, "Maksimal 240 karakter."),
    overview: z.array(z.string()),
    highlights: z.array(z.string()),
    tags: z.string(),
    isCustomizable: z.boolean(),
    itinerary: z.array(daySchema),
    inclusions: z.array(z.string()),
    exclusions: z.array(z.string()),
    meetingName: z.string().trim().min(2, "Isi titik kumpul."),
    meetingAddress: z.string().trim(),
    meetingTime: z.string().trim(),
    meetingNotes: z.string().trim(),
    fitness: z.enum(["ringan", "sedang", "menantang"]),
    minAge: z.number().int().min(0).max(80).optional(),
    requirementNotes: z.array(z.string()),
    groupMin: z.number().int().min(1),
    groupMax: z.number().int().min(1).max(60),
    pricePerPax: money,
    tiers: z.array(z.object({ minPax: z.number().int().min(1), maxPax: z.number().int().min(1), pricePerPax: money })),
    depositPercent: z.number().int().min(1).max(100),
    balanceDueDaysBefore: z.number().int().min(0).max(90),
    cancellationPolicy: z.array(z.object({ minDaysBefore: z.number().int().min(0), feePercent: z.number().int().min(0).max(100) })),
    terms: z.array(z.string()),
    faqs: z.array(z.object({ question: z.string().trim(), answer: z.string().trim() })),
    coverMediaId: z.string(),
    galleryMediaIds: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.durationNights > v.durationDays) ctx.addIssue({ code: "custom", path: ["durationNights"], message: "Malam tidak boleh lebih dari hari." })
    if (v.groupMin > v.groupMax) ctx.addIssue({ code: "custom", path: ["groupMax"], message: "Maksimal harus ≥ minimal." })
    v.tiers.forEach((tier, i) => {
      if (tier.minPax > tier.maxPax) ctx.addIssue({ code: "custom", path: ["tiers", i, "maxPax"], message: "Rentang tidak valid." })
    })
  })

export type PackageFormValues = z.input<typeof packageFormSchema>

/** Blank editor; payment terms start from the company defaults in Pengaturan. */
export function emptyPackageForm(destinationId = "", terms = { depositPercent: 30, balanceDueDaysBefore: 14 }): PackageFormValues {
  return {
    title: "",
    slug: "",
    tripType: "open",
    destinationId,
    durationDays: 3,
    durationNights: 2,
    summary: "",
    overview: [],
    highlights: [],
    tags: "",
    isCustomizable: false,
    itinerary: [],
    inclusions: [],
    exclusions: [],
    meetingName: "",
    meetingAddress: "",
    meetingTime: "",
    meetingNotes: "",
    fitness: "sedang",
    minAge: undefined,
    requirementNotes: [],
    groupMin: 1,
    groupMax: 12,
    pricePerPax: 0,
    tiers: [{ minPax: 2, maxPax: 4, pricePerPax: 0 }],
    depositPercent: terms.depositPercent,
    balanceDueDaysBefore: terms.balanceDueDaysBefore,
    cancellationPolicy: DEFAULT_CANCELLATION_POLICY.map((t) => ({ ...t })),
    terms: [],
    faqs: [],
    coverMediaId: "",
    galleryMediaIds: [],
  }
}

export function packageToForm(pkg: TourPackage): PackageFormValues {
  return {
    title: pkg.title,
    slug: pkg.slug,
    tripType: pkg.tripType,
    destinationId: pkg.destinationId,
    durationDays: pkg.durationDays,
    durationNights: pkg.durationNights,
    summary: pkg.summary,
    overview: pkg.overview,
    highlights: pkg.highlights,
    tags: pkg.tags.join(", "),
    isCustomizable: pkg.isCustomizable,
    itinerary: pkg.itinerary.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      activities: d.activities,
      meals: { ...d.meals },
      accommodation: d.accommodation ?? "",
    })),
    inclusions: pkg.inclusions,
    exclusions: pkg.exclusions,
    meetingName: pkg.meetingPoint.name,
    meetingAddress: pkg.meetingPoint.address,
    meetingTime: pkg.meetingPoint.time ?? "",
    meetingNotes: pkg.meetingPoint.notes ?? "",
    fitness: pkg.requirements.fitness,
    minAge: pkg.requirements.minAge,
    requirementNotes: pkg.requirements.notes,
    groupMin: pkg.groupSize.min,
    groupMax: pkg.groupSize.max,
    pricePerPax: pkg.pricing.kind === "per_pax" ? pkg.pricing.pricePerPax : 0,
    tiers: pkg.pricing.kind === "tiered" ? pkg.pricing.tiers.map((t) => ({ ...t })) : [{ minPax: pkg.groupSize.min, maxPax: pkg.groupSize.max, pricePerPax: 0 }],
    depositPercent: pkg.paymentTerms.depositPercent,
    balanceDueDaysBefore: pkg.paymentTerms.balanceDueDaysBefore,
    cancellationPolicy: pkg.cancellationPolicy.map((t) => ({ ...t })),
    terms: pkg.terms,
    faqs: pkg.faqs.map((f) => ({ ...f })),
    coverMediaId: pkg.coverMediaId,
    galleryMediaIds: pkg.galleryMediaIds,
  }
}

export function formToPackageInput(v: PackageFormValues): PackageInput {
  const pricing: TourPackage["pricing"] =
    v.tripType === "open" ? { kind: "per_pax", pricePerPax: v.pricePerPax } : v.tripType === "private" ? { kind: "tiered", tiers: [...v.tiers].sort((a, b) => a.minPax - b.minPax) } : { kind: "quoted" }
  return {
    title: v.title,
    slug: v.slug,
    tripType: v.tripType,
    destinationId: v.destinationId,
    durationDays: v.durationDays,
    durationNights: v.durationNights,
    summary: v.summary,
    overview: v.overview,
    highlights: v.highlights,
    itinerary: v.itinerary.map((d, i) => ({
      id: d.id,
      day: i + 1,
      title: d.title,
      description: d.description,
      activities: d.activities,
      meals: d.meals,
      accommodation: d.accommodation || undefined,
    })),
    inclusions: v.inclusions,
    exclusions: v.exclusions,
    meetingPoint: { name: v.meetingName, address: v.meetingAddress, time: v.meetingTime || undefined, notes: v.meetingNotes || undefined },
    requirements: { fitness: v.fitness, minAge: v.minAge, notes: v.requirementNotes },
    terms: v.terms,
    cancellationPolicy: [...v.cancellationPolicy].sort((a, b) => b.minDaysBefore - a.minDaysBefore),
    paymentTerms: { depositPercent: v.depositPercent, balanceDueDaysBefore: v.balanceDueDaysBefore },
    pricing,
    groupSize: { min: v.groupMin, max: v.groupMax },
    faqs: v.faqs.filter((f) => f.question && f.answer),
    coverMediaId: v.coverMediaId,
    galleryMediaIds: v.galleryMediaIds,
    tags: v.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    isCustomizable: v.isCustomizable,
  }
}

export const newDay = (n: number) => ({
  id: createId("day"),
  title: `Hari ${n}`,
  description: "",
  activities: [] as string[],
  meals: { breakfast: n > 1, lunch: true, dinner: false },
  accommodation: "",
})
