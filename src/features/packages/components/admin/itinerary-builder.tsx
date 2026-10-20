"use client"

import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { ListTextarea } from "@/components/dashboard/list-textarea"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { newDay, type PackageFormValues } from "../../admin-schema"

const MEALS = [
  { key: "breakfast", label: "Sarapan" },
  { key: "lunch", label: "Makan siang" },
  { key: "dinner", label: "Makan malam" },
] as const

/** Day-by-day itinerary: add, remove, and reorder days; numbering follows the order. */
export function ItineraryBuilder({
  control,
  register,
  errors,
}: {
  control: Control<PackageFormValues>
  register: UseFormRegister<PackageFormValues>
  errors?: FieldErrors<PackageFormValues>["itinerary"]
}) {
  const days = useFieldArray({ control, name: "itinerary", keyName: "key" })
  return (
    <div className="space-y-4">
      {days.fields.length === 0 && <p className="rounded-md border border-dashed border-line-strong/60 px-4 py-6 text-center text-sm text-muted-foreground">Belum ada hari. Paket membutuhkan minimal satu hari itinerary sebelum dipublikasikan.</p>}
      {days.fields.map((day, index) => (
        <fieldset key={day.key} className="rounded-lg border border-line p-4">
          <legend className="sr-only">Hari {index + 1}</legend>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-ocean-800 text-sm font-semibold text-white tabular-nums">{index + 1}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => days.move(index, index - 1)} disabled={index === 0} aria-label={`Naikkan hari ${index + 1}`}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => days.move(index, index + 1)} disabled={index === days.fields.length - 1} aria-label={`Turunkan hari ${index + 1}`}>
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => days.remove(index)} aria-label={`Hapus hari ${index + 1}`}>
                <Trash2 />
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            <Field label="Judul hari" error={errors?.[index]?.title?.message}>
              {(c) => <Input {...c} {...register(`itinerary.${index}.title`)} placeholder="Contoh: Labuan Bajo – Padar – Pink Beach" />}
            </Field>
            <Field label="Deskripsi">
              {(c) => <Textarea {...c} rows={3} {...register(`itinerary.${index}.description`)} />}
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Aktivitas" description="Satu aktivitas per baris.">
                {(c) => (
                  <Controller control={control} name={`itinerary.${index}.activities`} render={({ field }) => <ListTextarea control={c} rows={3} value={field.value} onChange={field.onChange} />} />
                )}
              </Field>
              <div className="grid content-start gap-4">
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Makan</legend>
                  <div className="flex flex-wrap gap-4">
                    {MEALS.map((meal) => (
                      <label key={meal.key} className="flex items-center gap-2 text-sm">
                        <Controller
                          control={control}
                          name={`itinerary.${index}.meals.${meal.key}`}
                          render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />}
                        />
                        {meal.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field label="Menginap" optional>
                  {(c) => <Input {...c} {...register(`itinerary.${index}.accommodation`)} placeholder="Contoh: Kabin kapal phinisi" />}
                </Field>
              </div>
            </div>
          </div>
        </fieldset>
      ))}
      <Button type="button" variant="secondary" onClick={() => days.append(newDay(days.fields.length + 1))}>
        <Plus aria-hidden="true" /> Tambah hari
      </Button>
    </div>
  )
}
