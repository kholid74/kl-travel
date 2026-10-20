export type DomainErrorCode =
  | "SEATS_UNAVAILABLE"
  | "INVALID_TRANSITION"
  | "VALIDATION"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "STORAGE_UNAVAILABLE"
  | "SIMULATED_FAILURE"

/** Business error with a message that is safe to show to the user (Bahasa Indonesia). */
export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly field?: string

  constructor(code: DomainErrorCode, message: string, field?: string) {
    super(message)
    this.name = "DomainError"
    this.code = code
    this.field = field
  }
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: DomainError }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const fail = (code: DomainErrorCode, message: string, field?: string): Result<never> => ({
  ok: false,
  error: new DomainError(code, message, field),
})
