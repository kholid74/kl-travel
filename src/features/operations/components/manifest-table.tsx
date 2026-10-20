import Link from "next/link"
import { diffDays, type DateOnly } from "@/lib/dates"
import { formatDate, formatPhone } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ManifestRow } from "@/services/queries/operations"

const age = (dob: DateOnly | undefined, on: DateOnly) => (dob ? Math.floor(diffDays(on, dob) / 365.25) : null)

/**
 * Participant manifest. On screen it is compact and links each row to its booking for
 * completing data; in print it lists every field a guide needs on the trip.
 */
export function ManifestTable({ rows, ageOn, variant = "screen" }: { rows: ManifestRow[]; ageOn: DateOnly; variant?: "screen" | "print" }) {
  const print = variant === "print"
  if (rows.length === 0) return <p className={cn("text-sm text-muted-foreground", !print && "px-5 py-4")}>Belum ada peserta terkonfirmasi.</p>
  const th = cn("py-2 font-medium", print ? "pr-2" : "px-3 first:pl-5 last:pr-5")
  const cell = print ? "py-1.5 pr-2 align-top" : "px-3 py-2.5 align-top first:pl-5 last:pr-5"
  return (
    <div className={cn(!print && "overflow-x-auto")}>
      <table className={cn("w-full", print ? "text-[10.5px]" : "text-table")}>
        <thead>
          <tr className={cn("border-b border-line text-left text-xs text-text-muted", !print && "bg-canvas/70")}>
            <th className={th}>No</th>
            <th className={th}>Nama</th>
            <th className={th}>{print ? "L/P" : "L/P · usia"}</th>
            {print && <th className={th}>Usia</th>}
            {print && <th className={th}>Telepon</th>}
            <th className={th}>Kontak darurat</th>
            <th className={th}>Catatan diet/medis</th>
            <th className={th}>Booking</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const t = row.traveler
            const years = age(t.dateOfBirth, ageOn)
            return (
              <tr key={t.id} className={cn("border-b border-line last:border-0", print && "break-inside-avoid")}>
                <td className={cn(cell, "text-text-muted tabular-nums")}>{index + 1}</td>
                <td className={cell}>
                  <span className={cn("font-medium", t.fullName ? "text-text-strong" : "text-tone-warning italic")}>{t.fullName ?? "Nama belum diisi"}</span>
                  {row.isLead && <span className="ml-1.5 text-[0.6875rem] text-text-subtle">pemesan</span>}
                  {!print && t.phone && <span className="block text-xs whitespace-nowrap text-text-subtle tabular-nums">{formatPhone(t.phone)}</span>}
                  {!print && row.missing.length > 0 && <span className="block text-xs text-tone-warning">Kurang: {row.missing.join(", ").toLowerCase()}</span>}
                </td>
                {print ? (
                  <>
                    <td className={cell}>{t.gender ?? "—"}</td>
                    <td className={cn(cell, "tabular-nums")}>{years ?? "—"}</td>
                    <td className={cn(cell, "whitespace-nowrap tabular-nums")}>{t.phone ? formatPhone(t.phone) : "—"}</td>
                  </>
                ) : (
                  <td className={cn(cell, "whitespace-nowrap tabular-nums")} title={t.dateOfBirth ? `Lahir ${formatDate(t.dateOfBirth)}` : undefined}>
                    {t.gender ?? "—"} · {years ?? "—"}
                  </td>
                )}
                <td className={cell}>
                  {t.emergencyContact ? (
                    <>
                      {t.emergencyContact.name}
                      <span className="block whitespace-nowrap text-text-subtle tabular-nums">{formatPhone(t.emergencyContact.phone)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={cell}>{t.dietaryNotes ?? "—"}</td>
                <td className={cn(cell, "whitespace-nowrap")}>
                  {print ? (
                    row.booking.code
                  ) : (
                    <Link href={`/dashboard/bookings/${row.booking.id}#peserta`} className="text-text-strong hover:underline">
                      {row.booking.code}
                    </Link>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
