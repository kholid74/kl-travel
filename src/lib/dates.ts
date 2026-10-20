/**
 * Calendar arithmetic for `DateOnly` strings ("YYYY-MM-DD") and WIB timestamps.
 *
 * Indonesia's WIB is a fixed UTC+7 with no daylight saving, so all conversions are
 * plain offset math. Nothing here reads the host timezone, which keeps server and
 * client renders identical.
 */

export type DateOnly = string
export type Timestamp = string

const DAY_MS = 86_400_000
const WIB_OFFSET_MS = 7 * 3_600_000
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export interface Clock {
  now(): Date
}

export const systemClock: Clock = { now: () => new Date() }

export function isDateOnly(value: string): value is DateOnly {
  return DATE_ONLY_RE.test(value)
}

function toUtcMidnight(date: DateOnly): number {
  const match = DATE_ONLY_RE.exec(date)
  if (!match) throw new Error(`Invalid DateOnly: ${date}`)
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function fromUtcMidnight(ms: number): DateOnly {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Calendar date in WIB for an instant. */
export function toDateOnlyWIB(instant: Date | Timestamp): DateOnly {
  const ms = typeof instant === "string" ? Date.parse(instant) : instant.getTime()
  return fromUtcMidnight(ms + WIB_OFFSET_MS)
}

export function todayWIB(clock: Clock = systemClock): DateOnly {
  return toDateOnlyWIB(clock.now())
}

export function addDays(date: DateOnly, days: number): DateOnly {
  return fromUtcMidnight(toUtcMidnight(date) + days * DAY_MS)
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function diffDays(to: DateOnly, from: DateOnly): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS)
}

export function compareDateOnly(a: DateOnly, b: DateOnly): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function rangesOverlap(aStart: DateOnly, aEnd: DateOnly, bStart: DateOnly, bEnd: DateOnly): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/** Instant at the given WIB wall-clock time on a calendar date. */
export function atWIB(date: DateOnly, hours = 0, minutes = 0): Timestamp {
  return new Date(toUtcMidnight(date) - WIB_OFFSET_MS + (hours * 60 + minutes) * 60_000).toISOString()
}

export function addHours(timestamp: Timestamp, hours: number): Timestamp {
  return new Date(Date.parse(timestamp) + hours * 3_600_000).toISOString()
}

export function addMinutes(timestamp: Timestamp, minutes: number): Timestamp {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString()
}

export function isBefore(a: Timestamp, b: Timestamp): boolean {
  return Date.parse(a) < Date.parse(b)
}

export function hoursBetween(from: Timestamp, to: Timestamp): number {
  return (Date.parse(to) - Date.parse(from)) / 3_600_000
}

/** Parts of a timestamp as WIB wall-clock values. */
export function wibParts(timestamp: Timestamp) {
  const shifted = new Date(Date.parse(timestamp) + WIB_OFFSET_MS)
  return {
    date: shifted.toISOString().slice(0, 10) as DateOnly,
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  }
}

/** Day of week for a calendar date, 0 = Minggu … 6 = Sabtu. */
export function dayOfWeek(date: DateOnly): number {
  return new Date(toUtcMidnight(date)).getUTCDay()
}

export function monthKey(date: DateOnly): string {
  return date.slice(0, 7)
}
