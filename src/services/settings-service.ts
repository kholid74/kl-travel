import { DomainError } from "@/lib/result"
import type { Settings } from "@/domain/entities"
import type { ID } from "@/domain/types/common"
import type { UnitOfWork } from "@/repositories"
import { logActivity } from "./activity-log"
import { requirePermission, userActor } from "./authz"
import { runCommand } from "./runtime"

export type SettingsSection = keyof Settings

const SECTION_LABEL: Record<SettingsSection, string> = {
  company: "profil perusahaan",
  booking: "aturan booking",
  payment: "aturan pembayaran",
  invoice: "format invoice",
}

const text = (value: string, message: string, field: string) => {
  if (!value.trim()) throw new DomainError("VALIDATION", message, field)
  return value.trim()
}

const whole = (value: number, min: number, max: number, message: string, field: string) => {
  if (!Number.isInteger(value) || value < min || value > max) throw new DomainError("VALIDATION", message, field)
  return value
}

function clean<S extends SettingsSection>(section: S, input: Settings[S]): Settings[S] {
  switch (section) {
    case "company": {
      const c = input as Settings["company"]
      return {
        name: text(c.name, "Nama perusahaan wajib diisi.", "name"),
        tagline: c.tagline.trim(),
        address: text(c.address, "Alamat wajib diisi.", "address"),
        email: text(c.email, "Email wajib diisi.", "email"),
        phoneDisplay: text(c.phoneDisplay, "Telepon wajib diisi.", "phoneDisplay"),
      } as Settings[S]
    }
    case "booking": {
      const b = input as Settings["booking"]
      return {
        pendingHoldHours: whole(b.pendingHoldHours, 1, 72, "Hold verifikasi 1–72 jam.", "pendingHoldHours"),
        depositHoldHours: whole(b.depositHoldHours, 12, 168, "Batas pembayaran DP 12–168 jam.", "depositHoldHours"),
        salesCutoffDays: whole(b.salesCutoffDays, 0, 14, "Penutupan penjualan 0–14 hari sebelum berangkat.", "salesCutoffDays"),
        lowSeatThreshold: whole(b.lowSeatThreshold, 1, 10, "Ambang sisa kursi 1–10.", "lowSeatThreshold"),
        maxPaxPerBooking: whole(b.maxPaxPerBooking, 1, 30, "Maksimal peserta per booking 1–30.", "maxPaxPerBooking"),
      } as Settings[S]
    }
    case "payment": {
      const p = input as Settings["payment"]
      return {
        defaultDepositPercent: whole(p.defaultDepositPercent, 10, 100, "DP default 10–100%.", "defaultDepositPercent"),
        defaultBalanceDueDaysBefore: whole(p.defaultBalanceDueDaysBefore, 1, 60, "Pelunasan 1–60 hari sebelum berangkat.", "defaultBalanceDueDaysBefore"),
        bankAccountDisplay: {
          bank: text(p.bankAccountDisplay.bank, "Nama bank wajib diisi.", "bank"),
          number: text(p.bankAccountDisplay.number, "Nomor rekening wajib diisi.", "number"),
          holder: text(p.bankAccountDisplay.holder, "Nama pemilik rekening wajib diisi.", "holder"),
        },
      } as Settings[S]
    }
    case "invoice": {
      const i = input as Settings["invoice"]
      const prefix = text(i.prefix, "Prefiks invoice wajib diisi.", "prefix").toUpperCase()
      if (!/^[A-Z0-9]+(\/[A-Z0-9]+)*$/.test(prefix)) throw new DomainError("VALIDATION", "Prefiks hanya huruf, angka, dan garis miring, contoh INV/NV.", "prefix")
      return { prefix, footerNote: i.footerNote.trim() } as Settings[S]
    }
  }
  throw new DomainError("VALIDATION", "Bagian pengaturan tidak dikenal.")
}

/**
 * Saves one settings section. Booking rules apply to availability and holds from the next
 * read; payment defaults and the invoice prefix apply to invoices issued afterwards.
 */
export function updateSettings<S extends SettingsSection>(uow: UnitOfWork, userId: ID, section: S, input: Settings[S]): Settings {
  requirePermission(uow, userId, "settings.manage")
  const next = { ...uow.settings.get(), [section]: clean(section, input) }
  uow.settings.set(next)
  logActivity(uow, {
    actor: userActor(userId),
    subject: { type: "settings", id: "settings" },
    action: "settings.updated",
    message: `Pengaturan diperbarui: ${SECTION_LABEL[section]}`,
  })
  return next
}

export const settingsCommands = {
  update: <S extends SettingsSection>(userId: ID, section: S, input: Settings[S]) => runCommand((uow) => updateSettings(uow, userId, section, input)),
}
