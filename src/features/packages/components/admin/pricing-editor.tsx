"use client"

import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { formatNumber } from "@/lib/format"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PackageFormValues } from "../../admin-schema"

function MoneyInput({ control, name, label }: { control: Control<PackageFormValues>; name: `tiers.${number}.pricePerPax` | "pricePerPax"; label: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
          <Input
            aria-label={label}
            inputMode="numeric"
            className="pl-9 tabular-nums"
            value={field.value ? formatNumber(field.value) : ""}
            onChange={(e) => field.onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
            onBlur={field.onBlur}
          />
        </div>
      )}
    />
  )
}

/** Open trip: one price per person. Private trip: price tiers by group size (§4.1). */
export function PricingEditor({
  control,
  register,
  errors,
  tripType,
}: {
  control: Control<PackageFormValues>
  register: UseFormRegister<PackageFormValues>
  errors: FieldErrors<PackageFormValues>
  tripType: PackageFormValues["tripType"]
}) {
  const tiers = useFieldArray({ control, name: "tiers" })
  const policy = useFieldArray({ control, name: "cancellationPolicy" })

  return (
    <div className="grid gap-8">
      {tripType === "open" ? (
        <Field label="Harga per orang" description="Bisa diganti per keberangkatan, misalnya untuk musim liburan." className="max-w-xs">
          {() => <MoneyInput control={control} name="pricePerPax" label="Harga per orang" />}
        </Field>
      ) : tripType === "private" ? (
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Harga per orang menurut ukuran grup</legend>
          <p className="mb-3 text-xs text-muted-foreground">Rentang tidak boleh tumpang tindih. Grup yang lebih besar biasanya lebih murah per orang.</p>
          <div className="space-y-2">
            {tiers.fields.map((tier, index) => (
              <div key={tier.id} className="grid grid-cols-[88px_88px_minmax(0,1fr)_auto] items-start gap-2">
                <Input aria-label={`Minimal peserta tingkat ${index + 1}`} type="number" min={1} {...register(`tiers.${index}.minPax`, { valueAsNumber: true })} />
                <div>
                  <Input aria-label={`Maksimal peserta tingkat ${index + 1}`} type="number" min={1} {...register(`tiers.${index}.maxPax`, { valueAsNumber: true })} />
                  {errors.tiers?.[index]?.maxPax && <p className="mt-1 text-xs text-destructive">{errors.tiers[index]?.maxPax?.message}</p>}
                </div>
                <MoneyInput control={control} name={`tiers.${index}.pricePerPax`} label={`Harga tingkat ${index + 1}`} />
                <Button type="button" variant="ghost" size="icon" onClick={() => tiers.remove(index)} disabled={tiers.fields.length === 1} aria-label={`Hapus tingkat ${index + 1}`}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-1 grid grid-cols-[88px_88px_1fr] gap-2 text-[0.6875rem] text-text-subtle">
            <span>Min. orang</span>
            <span>Maks. orang</span>
            <span>Harga per orang</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              const last = tiers.fields.at(-1)
              tiers.append({ minPax: (last?.maxPax ?? 1) + 1, maxPax: (last?.maxPax ?? 1) + 4, pricePerPax: 0 })
            }}
          >
            <Plus aria-hidden="true" /> Tambah tingkat
          </Button>
        </fieldset>
      ) : (
        <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">Paket custom memakai harga dari penawaran yang disetujui.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="DP (%)" error={errors.depositPercent?.message} description="100% = dibayar penuh di awal.">
          {(c) => <Input {...c} type="number" min={1} max={100} {...register("depositPercent", { valueAsNumber: true })} />}
        </Field>
        <Field label="Pelunasan (hari sebelum berangkat)" error={errors.balanceDueDaysBefore?.message}>
          {(c) => <Input {...c} type="number" min={0} {...register("balanceDueDaysBefore", { valueAsNumber: true })} />}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Kebijakan pembatalan</legend>
        <p className="mb-3 text-xs text-muted-foreground">Biaya berlaku bila dibatalkan setidaknya sekian hari sebelum berangkat. Tidak berlaku sebelum booking terkonfirmasi.</p>
        <div className="space-y-2">
          {policy.fields.map((tier, index) => (
            <div key={tier.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">≥</span>
              <Input aria-label={`Hari sebelum berangkat, tingkat ${index + 1}`} type="number" min={0} className="w-20" {...register(`cancellationPolicy.${index}.minDaysBefore`, { valueAsNumber: true })} />
              <span className="text-muted-foreground">hari → biaya</span>
              <Input aria-label={`Persentase biaya, tingkat ${index + 1}`} type="number" min={0} max={100} className="w-20" {...register(`cancellationPolicy.${index}.feePercent`, { valueAsNumber: true })} />
              <span className="text-muted-foreground">%</span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => policy.remove(index)} disabled={policy.fields.length === 1} aria-label={`Hapus tingkat pembatalan ${index + 1}`}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => policy.append({ minDaysBefore: 0, feePercent: 100 })}>
          <Plus aria-hidden="true" /> Tambah tingkat
        </Button>
      </fieldset>
    </div>
  )
}
