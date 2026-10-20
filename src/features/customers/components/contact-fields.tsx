"use client"

import type { FieldErrors, UseFormRegisterReturn } from "react-hook-form"
import { Field } from "@/components/shared/field"
import { Input } from "@/components/ui/input"
import type { ContactValues } from "../schemas"

/** Name, WhatsApp, email, and city for the person we contact about a booking or request. */
export function ContactFields({
  register,
  errors,
}: {
  register: (field: keyof ContactValues) => UseFormRegisterReturn
  errors?: FieldErrors<ContactValues>
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Nama lengkap" error={errors?.fullName?.message} className="sm:col-span-2">
        {(control) => <Input {...control} {...register("fullName")} autoComplete="name" />}
      </Field>
      <Field label="Nomor WhatsApp" error={errors?.phone?.message} description="Konfirmasi dikirim ke nomor ini (simulasi).">
        {(control) => <Input {...control} {...register("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="0811-0000-1234" />}
      </Field>
      <Field label="Email" optional error={errors?.email?.message}>
        {(control) => <Input {...control} {...register("email")} type="email" autoComplete="email" placeholder="nama@example.com" />}
      </Field>
      <Field label="Kota asal" optional error={errors?.city?.message}>
        {(control) => <Input {...control} {...register("city")} autoComplete="address-level2" />}
      </Field>
    </div>
  )
}
