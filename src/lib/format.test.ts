import { describe, expect, it } from "vitest"
import { addDays, atWIB, diffDays, toDateOnlyWIB } from "./dates"
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDuration,
  formatIDR,
  formatIDRCompact,
  formatPercent,
  formatPhone,
  formatRelativeDay,
  formatRemaining,
} from "./format"
import { normalizeEmail, normalizePhone } from "./phone"

describe("currency", () => {
  it("formats rupiah EYD style", () => {
    expect(formatIDR(3_450_000)).toBe("Rp3.450.000")
    expect(formatIDR(0)).toBe("Rp0")
    expect(formatIDR(-10_800_000)).toBe("-Rp10.800.000")
  })

  it("formats compact amounts", () => {
    expect(formatIDRCompact(3_450_000)).toBe("Rp3,45 jt")
    expect(formatIDRCompact(41_400_000)).toBe("Rp41,4 jt")
    expect(formatIDRCompact(1_200_000_000)).toBe("Rp1,2 M")
    expect(formatIDRCompact(850_000)).toBe("Rp850 rb")
    expect(formatIDRCompact(30_000_000)).toBe("Rp30 jt")
  })

  it("formats percentages with a decimal comma", () => {
    expect(formatPercent(0.21981)).toBe("22,0%")
    expect(formatPercent(-0.209)).toBe("-20,9%")
  })
})

describe("dates", () => {
  it("converts instants to WIB calendar dates", () => {
    expect(toDateOnlyWIB("2026-10-19T16:59:00.000Z")).toBe("2026-10-19")
    expect(toDateOnlyWIB("2026-10-19T17:00:00.000Z")).toBe("2026-10-20")
    expect(atWIB("2026-10-20", 8, 30)).toBe("2026-10-20T01:30:00.000Z")
  })

  it("does calendar arithmetic across month and year ends", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02")
    expect(diffDays("2026-11-04", "2026-10-20")).toBe(15)
  })

  it("formats dates and ranges in Indonesian", () => {
    expect(formatDate("2026-11-04")).toBe("4 Nov 2026")
    expect(formatDate("2026-11-04", "weekday")).toBe("Rabu, 4 Nov 2026")
    expect(formatDate("2026-08-17", "long")).toBe("17 Agustus 2026")
    expect(formatDateRange("2026-11-04", "2026-11-06")).toBe("4–6 Nov 2026")
    expect(formatDateRange("2026-11-30", "2026-12-02")).toBe("30 Nov – 2 Des 2026")
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe("30 Des 2026 – 2 Jan 2027")
    expect(formatDateTime("2026-10-20T07:30:00.000Z")).toBe("20 Okt 2026, 14.30 WIB")
  })

  it("formats relative days and remaining time", () => {
    expect(formatRelativeDay("2026-10-20", "2026-10-20")).toBe("Hari ini")
    expect(formatRelativeDay("2026-10-23", "2026-10-20")).toBe("3 hari lagi")
    expect(formatRelativeDay("2026-10-18", "2026-10-20")).toBe("2 hari lalu")
    expect(formatRemaining(5.34)).toBe("5 jam 20 menit")
    expect(formatRemaining(0.75)).toBe("45 menit")
    expect(formatRemaining(-1)).toBe("Berakhir")
  })

  it("formats durations", () => {
    expect(formatDuration(3, 2)).toBe("3H2M")
    expect(formatDuration(1, 0)).toBe("1H")
    expect(formatDuration(3, 2, "long")).toBe("3 hari 2 malam")
  })
})

describe("contact normalisation", () => {
  it("normalises Indonesian mobile numbers to E.164", () => {
    expect(normalizePhone("0811-0000-0123")).toBe("+6281100000123")
    expect(normalizePhone("+62 811 0000 0123")).toBe("+6281100000123")
    expect(normalizePhone("811 0000 0123")).toBe("+6281100000123")
    expect(normalizePhone("021-555-0101")).toBeNull()
    expect(formatPhone("+6281100000123")).toBe("+62 811-0000-0123")
  })

  it("normalises email", () => {
    expect(normalizeEmail("  Dinda.Pratiwi@Example.com ")).toBe("dinda.pratiwi@example.com")
    expect(normalizeEmail("bukan-email")).toBeNull()
  })
})
