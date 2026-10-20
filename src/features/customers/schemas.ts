import { z } from "zod"
import { normalizeEmail, normalizePhone } from "@/lib/phone"

export const phoneField = z
  .string()
  .trim()
  .min(1, "Isi nomor WhatsApp.")
  .refine((value) => normalizePhone(value) !== null, "Nomor WhatsApp tidak valid. Contoh: 0811-0000-1234.")

export const optionalPhoneField = z
  .string()
  .trim()
  .refine((value) => value === "" || normalizePhone(value) !== null, "Nomor telepon tidak valid.")

export const optionalEmailField = z
  .string()
  .trim()
  .refine((value) => value === "" || normalizeEmail(value) !== null, "Alamat email tidak valid.")

/** Contact person for a booking or request. Email and city are optional. */
export const contactSchema = z.object({
  fullName: z.string().trim().min(3, "Isi nama lengkap."),
  phone: phoneField,
  email: optionalEmailField,
  city: z.string().trim(),
})

export type ContactValues = z.input<typeof contactSchema>

export const EMPTY_CONTACT: ContactValues = { fullName: "", phone: "", email: "", city: "" }

/** Fictional sample data for the "Isi data contoh" demo helper. */
const SAMPLE_NAMES = [
  ["Nadia Putri", "nadia.putri"],
  ["Raka Pratama", "raka.pratama"],
  ["Sinta Maharani", "sinta.maharani"],
  ["Bayu Santoso", "bayu.santoso"],
] as const

export const SAMPLE_COMPANIONS = ["Dimas Ardiansyah", "Laras Wulandari", "Fajar Nugroho", "Intan Permata", "Gilang Saputra", "Wulan Sari"]

export function sampleContact(): ContactValues {
  const [fullName, handle] = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)]
  const suffix = String(Math.floor(Math.random() * 9000) + 1000)
  return { fullName, phone: `0811-0000-${suffix}`, email: `${handle}@example.com`, city: "Bandung" }
}
