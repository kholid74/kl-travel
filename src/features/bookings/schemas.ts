import { z } from "zod"
import { contactSchema, optionalPhoneField } from "@/features/customers/schemas"

const travelerSchema = z.object({
  fullName: z.string().trim(),
  gender: z.enum(["", "L", "P"]),
  dateOfBirth: z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Tanggal lahir tidak valid."),
})

/** Open Trip booking form (docs/route-map.md: /paket/[slug]/pesan). */
export const bookingFormSchema = z
  .object({
    departureId: z.string().min(1, "Pilih tanggal keberangkatan."),
    pax: z.number().int().min(1),
    contact: contactSchema,
    contactTravels: z.boolean(),
    travelers: z.array(travelerSchema),
    emergency: z.object({ name: z.string().trim(), phone: optionalPhoneField }),
    specialRequests: z.string().trim().max(500, "Maksimal 500 karakter."),
    agree: z.boolean().refine((value) => value, "Centang untuk melanjutkan."),
  })
  .superRefine((values, ctx) => {
    values.travelers.forEach((traveler, index) => {
      // The first traveler's name comes from the contact when the contact travels.
      if (index === 0 && values.contactTravels) return
      if (traveler.fullName.length < 3) {
        ctx.addIssue({ code: "custom", path: ["travelers", index, "fullName"], message: "Isi nama lengkap peserta." })
      }
    })
    if (values.emergency.phone && !values.emergency.name) {
      ctx.addIssue({ code: "custom", path: ["emergency", "name"], message: "Isi nama kontak darurat." })
    }
  })

export type BookingFormValues = z.input<typeof bookingFormSchema>

export const BOOKING_STEP_FIELDS = [["departureId"], ["pax"], ["contact", "travelers", "emergency"], ["specialRequests", "agree"]] as const
