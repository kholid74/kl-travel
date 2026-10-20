const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"

/** Random runtime id with an entity prefix, e.g. `bk_8f3k2m9q4t`. */
export function createId(prefix: string, length = 10): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  let out = ""
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length]
  return `${prefix}_${out}`
}

/** Zero-padded sequence segment for human-readable codes. */
export function pad(value: number, width = 4): string {
  return String(value).padStart(width, "0")
}
