/**
 * Normalises Indonesian phone input to E.164 ("+6281100000123").
 * Accepts "0811-0000-0123", "62811…", "+62 811 …" and "811…". Returns null when
 * the result is not a plausible mobile number.
 */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "")
  if (digits.startsWith("0")) digits = "62" + digits.slice(1)
  else if (digits.startsWith("8")) digits = "62" + digits
  if (!digits.startsWith("628")) return null
  if (digits.length < 11 || digits.length > 15) return null
  return "+" + digits
}

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}
