/**
 * Deterministic Indonesian formatters. No `Intl`/`toLocaleString`, so output is
 * identical on the server and in every browser (see ADR-0003).
 */

import { diffDays, wibParts, type DateOnly, type Timestamp } from "./dates"

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]
const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

function groupThousands(value: number): string {
  return Math.trunc(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function formatNumber(value: number): string {
  return (value < 0 ? "-" : "") + groupThousands(value)
}

/** "Rp3.450.000" — EYD style, no space after "Rp". */
export function formatIDR(value: number): string {
  return (value < 0 ? "-" : "") + "Rp" + groupThousands(Math.round(value))
}

function trimDecimal(value: number, digits: number): string {
  return value
    .toFixed(digits)
    .replace(/\.?0+$/, "")
    .replace(".", ",")
}

/** "Rp3,45 jt", "Rp1,2 M", "Rp850 rb" — for charts and tight KPI subtexts. */
export function formatIDRCompact(value: number): string {
  const sign = value < 0 ? "-" : ""
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${sign}Rp${trimDecimal(abs / 1_000_000_000, 2)} M`
  if (abs >= 1_000_000) return `${sign}Rp${trimDecimal(abs / 1_000_000, 2)} jt`
  if (abs >= 1_000) return `${sign}Rp${trimDecimal(abs / 1_000, 1)} rb`
  return `${sign}Rp${groupThousands(abs)}`
}

/** 0.2198 → "22,0%" */
export function formatPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return "—"
  return (ratio * 100).toFixed(digits).replace(".", ",") + "%"
}

function dateParts(date: DateOnly) {
  const [y, m, d] = date.split("-").map(Number)
  return { y, m: m - 1, d }
}

export type DateStyle = "short" | "long" | "weekday" | "day-month" | "month-year"

/**
 * short: "4 Nov 2026" · long: "4 November 2026" · weekday: "Rabu, 4 Nov 2026"
 * day-month: "4 Nov" · month-year: "November 2026"
 */
export function formatDate(date: DateOnly, style: DateStyle = "short"): string {
  const { y, m, d } = dateParts(date)
  switch (style) {
    case "long":
      return `${d} ${MONTHS_LONG[m]} ${y}`
    case "weekday": {
      const weekday = WEEKDAYS[new Date(Date.UTC(y, m, d)).getUTCDay()]
      return `${weekday}, ${d} ${MONTHS_SHORT[m]} ${y}`
    }
    case "day-month":
      return `${d} ${MONTHS_SHORT[m]}`
    case "month-year":
      return `${MONTHS_LONG[m]} ${y}`
    default:
      return `${d} ${MONTHS_SHORT[m]} ${y}`
  }
}

/** "4–6 Nov 2026", "30 Nov – 2 Des 2026", "30 Des 2026 – 2 Jan 2027" */
export function formatDateRange(start: DateOnly, end: DateOnly): string {
  if (start === end) return formatDate(start)
  const a = dateParts(start)
  const b = dateParts(end)
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS_SHORT[b.m]} ${b.y}`
  if (a.y === b.y) return `${a.d} ${MONTHS_SHORT[a.m]} – ${b.d} ${MONTHS_SHORT[b.m]} ${b.y}`
  return `${formatDate(start)} – ${formatDate(end)}`
}

/** "14.30" (EYD uses a period as the time separator) */
export function formatTime(timestamp: Timestamp): string {
  const { hours, minutes } = wibParts(timestamp)
  return `${String(hours).padStart(2, "0")}.${String(minutes).padStart(2, "0")}`
}

/** "4 Nov 2026, 14.30 WIB" */
export function formatDateTime(timestamp: Timestamp): string {
  return `${formatDate(wibParts(timestamp).date)}, ${formatTime(timestamp)} WIB`
}

/** Relative calendar distance: "Hari ini", "Besok", "3 hari lagi", "2 hari lalu". */
export function formatRelativeDay(target: DateOnly, today: DateOnly): string {
  const days = diffDays(target, today)
  if (days === 0) return "Hari ini"
  if (days === 1) return "Besok"
  if (days === -1) return "Kemarin"
  return days > 0 ? `${days} hari lagi` : `${-days} hari lalu`
}

/** Remaining time for holds: "5 jam 20 menit", "45 menit", "Berakhir". */
export function formatRemaining(hours: number): string {
  if (hours <= 0) return "Berakhir"
  const totalMinutes = Math.floor(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h >= 24) {
    const d = Math.floor(h / 24)
    const rest = h % 24
    return rest ? `${d} hari ${rest} jam` : `${d} hari`
  }
  if (h === 0) return `${m} menit`
  return m ? `${h} jam ${m} menit` : `${h} jam`
}

/** short: "3H2M" / "1H" · long: "3 hari 2 malam" / "1 hari" */
export function formatDuration(days: number, nights: number, style: "short" | "long" = "short"): string {
  if (style === "long") return nights > 0 ? `${days} hari ${nights} malam` : `${days} hari`
  return nights > 0 ? `${days}H${nights}M` : `${days}H`
}

/** "+6281100000123" → "+62 811-0000-0123" */
export function formatPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "")
  if (!digits.startsWith("62")) return e164
  const local = digits.slice(2)
  const groups = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean)
  return `+62 ${groups.join("-")}`
}

export function formatPax(count: number): string {
  return `${count} pax`
}

export function pluralize(count: number, noun: string): string {
  return `${formatNumber(count)} ${noun}`
}
