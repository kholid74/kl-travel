"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Pencil } from "lucide-react"
import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatDateRange, formatDateTime, formatIDR, formatPhone } from "@/lib/format"
import type { Customer } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { BOOKING_STATUS_LABEL, CUSTOMER_STAGE_LABEL, INQUIRY_TYPE_LABEL, PIPELINE_STAGE_LABEL, SOURCE_LABEL } from "@/domain/labels"
import { customerStage } from "@/domain/rules/customer-identity"
import { priceTotal } from "@/domain/rules/pricing"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { DescriptionList, SectionCard } from "@/components/dashboard/section-card"
import { Field } from "@/components/shared/field"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BOOKING_STATUS_TONE, CUSTOMER_STAGE_TONE } from "@/features/bookings/labels"
import { STAGE_TONE } from "@/features/inquiries/labels"
import { customerCommands, SYSTEM_NOTE_AUTHOR } from "@/services/customer-service"
import { optionalEmailField, phoneField } from "../schemas"

const CONTACT_LABEL: Record<Customer["preferredContact"], string> = { whatsapp: "WhatsApp", email: "Email", telepon: "Telepon" }

const editSchema = z.object({
  fullName: z.string().trim().min(3, "Isi nama lengkap."),
  phone: phoneField,
  email: optionalEmailField,
  city: z.string().trim(),
  preferredContact: z.enum(["whatsapp", "email", "telepon"]),
})

function EditContactDialog({ customer, userId }: { customer: Customer; userId: string }) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.input<typeof editSchema>>({ resolver: zodResolver(editSchema) })
  const update = useCommand(customerCommands.update, { success: "Data kontak disimpan", onSuccess: () => setOpen(false) })
  const errors = form.formState.errors
  return (
    <>
      <PermissionButton
        permission="inquiries.manage"
        variant="secondary"
        onClick={() => {
          form.reset({ fullName: customer.fullName, phone: formatPhone(customer.phone), email: customer.email ?? "", city: customer.city ?? "", preferredContact: customer.preferredContact })
          setOpen(true)
        }}
      >
        <Pencil aria-hidden="true" /> Edit kontak
      </PermissionButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={form.handleSubmit((v) => update.run(userId, customer.id, v))} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Edit kontak</DialogTitle>
              <DialogDescription>Nomor telepon dan email harus unik di seluruh data pelanggan.</DialogDescription>
            </DialogHeader>
            <Field label="Nama lengkap" error={errors.fullName?.message}>
              {(c) => <Input {...c} {...form.register("fullName")} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telepon" error={errors.phone?.message}>
                {(c) => <Input {...c} type="tel" {...form.register("phone")} />}
              </Field>
              <Field label="Email" optional error={errors.email?.message}>
                {(c) => <Input {...c} type="email" {...form.register("email")} />}
              </Field>
              <Field label="Kota" optional>
                {(c) => <Input {...c} {...form.register("city")} />}
              </Field>
              <Field label="Kontak lewat">
                {(c) => (
                  <Controller
                    control={form.control}
                    name="preferredContact"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={c.id} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(CONTACT_LABEL) as Customer["preferredContact"][]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {CONTACT_LABEL[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={update.pending}>
                {update.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Must sit inside <Suspense>: the id is only known at request time. */
export function CustomerProfileRoute() {
  const { id } = useParams<{ id: string }>()
  return <CustomerProfile id={id} />
}

function CustomerProfile({ id }: { id: string }) {
  const live = useLive()
  const { user } = usePersona()
  const [note, setNote] = useState("")
  const addNote = useCommand(customerCommands.addNote, { success: "Catatan disimpan", onSuccess: () => setNote("") })

  const view = useMemo(() => {
    if (!live) return null
    const { db } = live
    const customer = db.customers[id]
    if (!customer) return { customer: null } as const
    const idx = getIndexes(db)
    const bookings = [...(idx.bookingsByCustomer.get(customer.id) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const inquiries = [...(idx.inquiriesByCustomer.get(customer.id) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return {
      customer,
      bookings,
      inquiries,
      stage: customerStage(bookings),
      value: bookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((sum, b) => sum + priceTotal(b), 0),
      travelers: Object.values(db.travelers).filter((t) => t.customerId === customer.id).length,
    }
  }, [live, id])

  if (!live || !view) return <PageSkeleton variant="detail" />
  if (!view.customer) {
    return (
      <NotFoundPanel
        title="Pelanggan tidak ditemukan"
        description="Data pelanggan ini tidak ada di browser ini."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/customers">Kembali ke daftar pelanggan</Link>
          </Button>
        }
      />
    )
  }
  const { db } = live
  const { customer, bookings, inquiries, stage, value } = view
  const notes = [...customer.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard/customers", label: "Pelanggan" }}
        title={customer.fullName}
        meta={
          <>
            <StatusBadge tone={CUSTOMER_STAGE_TONE[stage]}>{CUSTOMER_STAGE_LABEL[stage]}</StatusBadge>
            <span className="text-sm text-text-subtle">{customer.code}</span>
          </>
        }
        description={`Pelanggan sejak ${formatDate(toDateOnlyWIB(customer.createdAt))}, pertama datang dari ${SOURCE_LABEL[customer.acquisitionSource]}.`}
        actions={user && <EditContactDialog customer={customer} userId={user.id} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <SectionCard title={`Riwayat booking (${bookings.length})`} bodyClassName="p-0">
            {bookings.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Belum pernah booking.</p>
            ) : (
              <ul className="divide-y divide-line">
                {bookings.map((b) => {
                  const departure = db.departures[b.departureId]
                  return (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <Link href={`/dashboard/bookings/${b.id}`} className="text-sm font-semibold text-text-strong hover:underline">
                          {b.code}
                        </Link>
                        <p className="truncate text-xs text-text-subtle">
                          {db.packages[b.packageId]?.title} · {departure ? formatDateRange(departure.startDate, departure.endDate) : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm tabular-nums">{formatIDR(priceTotal(b))}</span>
                        <StatusBadge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</StatusBadge>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard title={`Riwayat inquiry (${inquiries.length})`} bodyClassName="p-0">
            {inquiries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Belum ada inquiry.</p>
            ) : (
              <ul className="divide-y divide-line">
                {inquiries.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <Link href={`/dashboard/inquiries/${i.id}`} className="text-sm font-semibold text-text-strong hover:underline">
                        {i.code}
                      </Link>
                      <p className="truncate text-xs text-text-subtle">
                        {INQUIRY_TYPE_LABEL[i.type]} · {i.packageId ? db.packages[i.packageId]?.title : i.destinationIds.map((d) => db.destinations[d]?.name).join(", ")} ·{" "}
                        {formatDate(toDateOnlyWIB(i.createdAt))}
                      </p>
                    </div>
                    <StatusBadge tone={STAGE_TONE[i.stage]}>{PIPELINE_STAGE_LABEL[i.stage]}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Catatan">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada catatan.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-md bg-canvas px-4 py-3">
                    <p className="text-sm text-text-strong">{n.body}</p>
                    <p className="mt-1 text-xs text-text-subtle">
                      {n.authorId === SYSTEM_NOTE_AUTHOR ? "Sistem" : (db.users[n.authorId]?.name ?? "Tim")} · {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-4 grid gap-2 border-t border-line pt-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (user) void addNote.run(user.id, customer.id, note)
              }}
            >
              <Textarea aria-label="Catatan baru" placeholder="Preferensi, riwayat keluhan, atau hal penting lain…" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex justify-end">
                <PermissionButton permission="inquiries.manage" size="sm" type="submit" disabled={!note.trim() || addNote.pending}>
                  Simpan catatan
                </PermissionButton>
              </div>
            </form>
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-6">
          <SectionCard title="Kontak">
            <DescriptionList
              stacked
              items={[
                { label: "Telepon", value: formatPhone(customer.phone) },
                { label: "Email", value: customer.email ?? "—" },
                { label: "Kota", value: customer.city ?? "—" },
                { label: "Kontak lewat", value: CONTACT_LABEL[customer.preferredContact] },
              ]}
            />
          </SectionCard>
          <SectionCard title="Ringkasan">
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "Booking aktif & selesai", value: String(bookings.filter((b) => b.status !== "cancelled").length) },
                { label: "Selesai", value: String(bookings.filter((b) => b.status === "completed").length) },
                { label: "Nilai booking", value: formatIDR(value) },
                { label: "Peserta terdaftar", value: String(view.travelers) },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-canvas px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-text-strong tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Repeat = minimal dua booking selesai.</p>
          </SectionCard>
        </aside>
      </div>
    </div>
  )
}
