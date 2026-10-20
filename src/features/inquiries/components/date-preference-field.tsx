"use client"

import type { FieldErrors } from "react-hook-form"
import { addDays, diffDays, type DateOnly } from "@/lib/dates"
import { formatDate, formatDateRange } from "@/lib/format"
import { ChipToggle, ChoiceCard } from "@/components/shared/choice"
import { Calendar, fromPickerDate, toPickerDate } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import type { DatePreferenceValues } from "../schemas"

/** Requests need a few days for the team to prepare boats, stays, and guides. */
export const MIN_LEAD_DAYS = 7

function nextMonths(today: DateOnly, count: number): string[] {
  const months: string[] = []
  let cursor = `${today.slice(0, 7)}-01`
  for (let i = 0; i < count; i++) {
    months.push(cursor.slice(0, 7))
    cursor = `${addDays(cursor, 32).slice(0, 7)}-01`
  }
  return months
}

/**
 * "Tanggal pasti" (one day for private trips, a range for custom trips) or "Masih fleksibel"
 * with an approximate month.
 */
export function DatePreferenceField({
  value,
  onChange,
  mode,
  today,
  errors,
}: {
  value: DatePreferenceValues
  onChange: (next: DatePreferenceValues) => void
  mode: "exact" | "range"
  today: DateOnly | null
  errors?: FieldErrors<DatePreferenceValues>
}) {
  const fixed = value.kind !== "flexible"
  const earliest = today ? addDays(today, MIN_LEAD_DAYS) : null
  const error = errors?.startDate?.message ?? errors?.endDate?.message ?? errors?.month?.message

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Kepastian tanggal" className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          type="radio"
          name="jenis-tanggal"
          value="fixed"
          checked={fixed}
          onChange={() => onChange({ ...value, kind: mode })}
          title="Sudah ada tanggal"
          description={mode === "exact" ? "Pilih tanggal berangkat." : "Pilih tanggal berangkat dan pulang."}
        />
        <ChoiceCard
          type="radio"
          name="jenis-tanggal"
          value="flexible"
          checked={!fixed}
          onChange={() => onChange({ ...value, kind: "flexible" })}
          title="Masih fleksibel"
          description="Cukup perkiraan bulannya."
        />
      </div>

      {!today || !earliest ? (
        <Skeleton className="h-80 rounded-[4px]" />
      ) : fixed ? (
        <div className="rounded-[4px] border border-border bg-card p-2 sm:p-4">
          {mode === "exact" ? (
            <Calendar
              mode="single"
              selected={value.startDate ? toPickerDate(value.startDate) : undefined}
              onSelect={(date) => onChange({ ...value, kind: "exact", startDate: date ? fromPickerDate(date) : "", endDate: "" })}
              defaultMonth={toPickerDate(value.startDate || earliest)}
              disabled={{ before: toPickerDate(earliest) }}
              className="mx-auto w-fit"
            />
          ) : (
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={value.startDate ? { from: toPickerDate(value.startDate), to: value.endDate ? toPickerDate(value.endDate) : undefined } : undefined}
              onSelect={(range) =>
                onChange({
                  ...value,
                  kind: "range",
                  startDate: range?.from ? fromPickerDate(range.from) : "",
                  endDate: range?.to && range.from && range.to > range.from ? fromPickerDate(range.to) : "",
                })
              }
              defaultMonth={toPickerDate(value.startDate || earliest)}
              disabled={{ before: toPickerDate(earliest) }}
              className="mx-auto w-fit"
            />
          )}
          <p aria-live="polite" className="border-t border-border px-2 pt-3 pb-1 text-sm">
            {value.startDate ? (
              <>
                <span className="text-muted-foreground">{mode === "exact" ? "Berangkat: " : "Rencana: "}</span>
                <span className="font-semibold">
                  {mode === "exact" || !value.endDate
                    ? formatDate(value.startDate, "weekday")
                    : `${formatDateRange(value.startDate, value.endDate)} (${diffDays(value.endDate, value.startDate) + 1} hari)`}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Paling cepat {formatDate(earliest)}, agar tim kami sempat menyiapkan perjalanan.</span>
            )}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Perkiraan bulan">
          {nextMonths(today, 12).map((month) => (
            <ChipToggle key={month} pressed={value.month === month} onPressedChange={() => onChange({ ...value, kind: "flexible", month })}>
              {formatDate(`${month}-01`, "month-year")}
            </ChipToggle>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
