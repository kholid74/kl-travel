"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Archive, CircleAlert, ExternalLink, Eye, EyeOff, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react"
import { slugify } from "@/lib/slug"
import { formatDateRange } from "@/lib/format"
import type { DemoDatabase } from "@/domain/database"
import type { PackageStatus, TourPackage } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { DEPARTURE_STATUS_LABEL, FITNESS_LABEL, PACKAGE_STATUS_LABEL } from "@/domain/labels"
import { departureDisplayStatus, seatSummary } from "@/domain/rules/availability"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { ListTextarea } from "@/components/dashboard/list-textarea"
import { MediaPicker } from "@/components/dashboard/media-picker"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { Field } from "@/components/shared/field"
import { SeatMeter } from "@/components/shared/seat-meter"
import { StatusBadge, TripTypeBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { DepartureFormSheet } from "@/features/departures/components/departure-form-sheet"
import { catalogCommands, publishBlockers } from "@/services/catalog-admin-service"
import { emptyPackageForm, formToPackageInput, packageFormSchema, packageToForm, type PackageFormValues } from "../../admin-schema"
import { DEPARTURE_STATUS_TONE, PACKAGE_STATUS_TONE } from "../../labels"
import { ItineraryBuilder } from "./itinerary-builder"
import { PricingEditor } from "./pricing-editor"

const TABS = [
  { value: "dasar", label: "Dasar" },
  { value: "itinerary", label: "Itinerary" },
  { value: "fasilitas", label: "Fasilitas & syarat" },
  { value: "galeri", label: "Galeri" },
  { value: "harga", label: "Harga & kebijakan" },
] as const

/** Must sit inside <Suspense> when editing: the id is only known at request time. */
export function PackageEditorRoute() {
  const { id } = useParams<{ id: string }>()
  return <PackageEditorLoader id={id} />
}

export function NewPackageEditor() {
  return <PackageEditorLoader />
}

function PackageEditorLoader({ id }: { id?: string }) {
  const live = useLive()
  if (!live) return <PageSkeleton variant="detail" />
  const pkg = id ? live.db.packages[id] : undefined
  if (id && !pkg) {
    return (
      <NotFoundPanel
        title="Paket tidak ditemukan"
        description="Paket ini tidak ada di data demo browser ini."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/packages">Kembali ke daftar paket</Link>
          </Button>
        }
      />
    )
  }
  // Remount when the stored package changes elsewhere (another tab), so the form starts clean.
  return <PackageEditor key={pkg ? `${pkg.id}-${pkg.updatedAt}` : "baru"} db={live.db} today={live.today} now={live.now} pkg={pkg} />
}

function StatusActions({ pkg, dirty, userId }: { pkg: TourPackage; dirty: boolean; userId: string }) {
  const setStatus = useCommand(catalogCommands.setPackageStatus, { success: (p) => `Status paket: ${PACKAGE_STATUS_LABEL[p.status]}` })
  const run = (status: PackageStatus) => setStatus.run(userId, pkg.id, status)
  const unsaved = dirty ? "Simpan perubahan terlebih dahulu." : null
  if (pkg.tripType === "custom") return null
  return (
    <>
      {pkg.status === "draft" && (
        <PermissionButton permission="packages.publish" disabledReason={unsaved} onClick={() => run("published")} disabled={setStatus.pending}>
          <Eye aria-hidden="true" /> Publikasikan
        </PermissionButton>
      )}
      {pkg.status === "published" && (
        <PermissionButton permission="packages.publish" variant="secondary" disabledReason={unsaved} onClick={() => run("draft")} disabled={setStatus.pending}>
          <EyeOff aria-hidden="true" /> Jadikan draf
        </PermissionButton>
      )}
      {pkg.status !== "archived" ? (
        <PermissionButton permission="packages.manage" variant="ghost" disabledReason={unsaved} onClick={() => run("archived")} disabled={setStatus.pending}>
          <Archive aria-hidden="true" /> Arsipkan
        </PermissionButton>
      ) : (
        <PermissionButton permission="packages.manage" variant="secondary" onClick={() => run("draft")} disabled={setStatus.pending}>
          <RotateCcw aria-hidden="true" /> Kembalikan ke draf
        </PermissionButton>
      )}
    </>
  )
}

function DeparturesPanel({ db, now, today, pkg }: { db: DemoDatabase; now: string; today: string; pkg: TourPackage }) {
  const idx = getIndexes(db)
  const departures = [...(idx.departuresByPackage.get(pkg.id) ?? [])].sort((a, b) => b.startDate.localeCompare(a.startDate))
  return (
    <SectionCard
      title={`Keberangkatan (${departures.length})`}
      description={pkg.tripType === "open" ? "Jadwal tetap untuk open trip ini." : "Keberangkatan privat dibuat dari konversi inquiry."}
      action={pkg.tripType === "open" && <DepartureFormSheet db={db} today={today} packageId={pkg.id} label="Jadwalkan" />}
      bodyClassName="p-0"
    >
      {departures.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Belum ada keberangkatan.</p>
      ) : (
        <ul className="divide-y divide-line">
          {departures.map((d) => {
            const seats = seatSummary(d, idx.bookingsByDeparture.get(d.id) ?? [], idx.paxOf, now)
            const status = departureDisplayStatus({ departure: d, seats, today, settings: db.settings.booking, packageArchived: pkg.status === "archived" })
            return (
              <li key={d.id} className="grid gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-center">
                <div>
                  <Link href={`/dashboard/departures/${d.id}`} className="text-sm font-semibold text-text-strong hover:underline">
                    {formatDateRange(d.startDate, d.endDate)}
                  </Link>
                  <p className="text-xs text-text-subtle">
                    {d.code}
                    {d.kind === "private" && " · privat"}
                  </p>
                </div>
                <SeatMeter seats={seats} showLegend={false} />
                <StatusBadge tone={DEPARTURE_STATUS_TONE[status]}>{DEPARTURE_STATUS_LABEL[status]}</StatusBadge>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}

function PackageEditor({ db, today, now, pkg }: { db: DemoDatabase; today: string; now: string; pkg?: TourPackage }) {
  const router = useRouter()
  const { user, denial } = usePersona()
  const [tab, setTab] = useState<string>("dasar")
  const [slugTouched, setSlugTouched] = useState(!!pkg)
  const form = useForm<PackageFormValues>({ resolver: zodResolver(packageFormSchema), defaultValues: pkg
      ? packageToForm(pkg)
      : emptyPackageForm("", { depositPercent: db.settings.payment.defaultDepositPercent, balanceDueDaysBefore: db.settings.payment.defaultBalanceDueDaysBefore }),
  })
  const { control, register, formState, setValue } = form
  const errors = formState.errors
  const faqs = useFieldArray({ control, name: "faqs" })
  const values = useWatch({ control }) as PackageFormValues
  const save = useCommand(catalogCommands.savePackage, {
    success: (p) => (pkg ? `Paket ${p.title} disimpan` : `Paket ${p.title} dibuat sebagai draf`),
    onSuccess: (p) => {
      if (!pkg) router.replace(`/dashboard/packages/${p.id}`)
    },
  })

  const destinations = Object.values(db.destinations).sort((a, b) => a.name.localeCompare(b.name))
  const destination = db.destinations[values.destinationId]
  const blockers = useMemo(() => publishBlockers(formToPackageInput(values), destination), [values, destination])
  const blocked = denial("packages.manage")

  const onSubmit = form.handleSubmit(
    (v) => {
      if (user) void save.run(user.id, formToPackageInput(v), pkg?.id)
    },
    (invalid) => {
      // Jump to the first tab that has an error.
      const first = Object.keys(invalid)[0] ?? ""
      if (first === "itinerary") setTab("itinerary")
      else if (["inclusions", "exclusions", "meetingName", "requirementNotes", "terms", "faqs"].includes(first)) setTab("fasilitas")
      else if (["pricePerPax", "tiers", "depositPercent", "balanceDueDaysBefore", "cancellationPolicy"].includes(first)) setTab("harga")
      else setTab("dasar")
    },
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        back={{ href: "/dashboard/packages", label: "Paket Wisata" }}
        title={pkg ? pkg.title : "Paket baru"}
        meta={
          pkg && (
            <>
              <StatusBadge tone={PACKAGE_STATUS_TONE[pkg.status]}>{PACKAGE_STATUS_LABEL[pkg.status]}</StatusBadge>
              <TripTypeBadge type={pkg.tripType} />
              <span className="text-sm text-text-subtle">{pkg.code}</span>
            </>
          )
        }
        description={pkg ? (pkg.visibility === "unlisted" ? "Paket custom: tidak tampil di katalog website." : undefined) : "Paket baru disimpan sebagai draf. Publikasikan setelah itinerary, foto, dan harga lengkap."}
        actions={
          <>
            {pkg?.status === "published" && pkg.visibility === "catalog" && (
              <Button asChild variant="ghost">
                <Link href={`/paket/${pkg.slug}`} target="_blank">
                  Lihat di website <ExternalLink aria-hidden="true" />
                </Link>
              </Button>
            )}
            {pkg && user && <StatusActions pkg={pkg} dirty={formState.isDirty} userId={user.id} />}
            <PermissionButton permission="packages.manage" type="submit" disabled={save.pending || (!!pkg && !formState.isDirty)}>
              {save.pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} {pkg ? "Simpan perubahan" : "Buat draf"}
            </PermissionButton>
          </>
        }
      />

      {pkg?.status !== "published" && blockers.length > 0 && (
        <div className="mb-6 flex gap-3 rounded-lg border border-tone-warning/30 bg-tone-warning-bg px-4 py-3 text-sm text-tone-warning">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Sebelum bisa dipublikasikan:</p>
            <ul className="mt-1 list-disc pl-5">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {blocked && <p className="mb-4 text-sm text-tone-danger">{blocked} Anda bisa melihat isi paket, tetapi tidak bisa menyimpan perubahan.</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="h-9 flex-none rounded-md border border-line bg-card px-3 data-[state=active]:border-ocean-800 data-[state=active]:bg-ocean-800 data-[state=active]:text-white">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="dasar">
              <SectionCard>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Judul paket" error={errors.title?.message} className="sm:col-span-2">
                    {(c) => (
                      <Input
                        {...c}
                        {...register("title", {
                          onChange: (e) => {
                            if (!slugTouched) setValue("slug", slugify(e.target.value))
                          },
                        })}
                      />
                    )}
                  </Field>
                  <Field label="Slug URL" error={errors.slug?.message} description={values.slug ? `/paket/${values.slug}` : "Dibuat otomatis dari judul."}>
                    {(c) => <Input {...c} {...register("slug", { onChange: () => setSlugTouched(true) })} />}
                  </Field>
                  <Field label="Jenis trip" description={pkg ? "Tidak bisa diubah setelah paket dibuat." : undefined}>
                    {(c) => (
                      <Controller
                        control={control}
                        name="tripType"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={!!pkg}>
                            <SelectTrigger id={c.id} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open Trip (jadwal tetap)</SelectItem>
                              <SelectItem value="private">Private Trip (tanggal pilihan grup)</SelectItem>
                              {pkg?.tripType === "custom" && <SelectItem value="custom">Custom Trip</SelectItem>}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </Field>
                  <Field label="Destinasi" error={errors.destinationId?.message}>
                    {(c) => (
                      <Controller
                        control={control}
                        name="destinationId"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={c.id} aria-invalid={c["aria-invalid"]} className="w-full">
                              <SelectValue placeholder="Pilih destinasi" />
                            </SelectTrigger>
                            <SelectContent>
                              {destinations.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                  {d.status === "draft" && " (draf)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Hari" error={errors.durationDays?.message}>
                      {(c) => <Input {...c} type="number" min={1} {...register("durationDays", { valueAsNumber: true })} />}
                    </Field>
                    <Field label="Malam" error={errors.durationNights?.message}>
                      {(c) => <Input {...c} type="number" min={0} {...register("durationNights", { valueAsNumber: true })} />}
                    </Field>
                  </div>
                  <Field label="Ringkasan" error={errors.summary?.message} description={`${values.summary.length}/240 karakter. Tampil di kartu paket.`} className="sm:col-span-2">
                    {(c) => <Textarea {...c} rows={2} {...register("summary")} />}
                  </Field>
                  <Field label="Deskripsi" description="Pisahkan paragraf dengan baris kosong." className="sm:col-span-2">
                    {(c) => <Controller control={control} name="overview" render={({ field }) => <ListTextarea control={c} separator="paragraph" rows={5} value={field.value} onChange={field.onChange} />} />}
                  </Field>
                  <Field label="Sorotan" description="Satu sorotan per baris." className="sm:col-span-2">
                    {(c) => <Controller control={control} name="highlights" render={({ field }) => <ListTextarea control={c} rows={4} value={field.value} onChange={field.onChange} />} />}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Grup min." error={errors.groupMin?.message}>
                      {(c) => <Input {...c} type="number" min={1} {...register("groupMin", { valueAsNumber: true })} />}
                    </Field>
                    <Field label="Grup maks." error={errors.groupMax?.message}>
                      {(c) => <Input {...c} type="number" min={1} {...register("groupMax", { valueAsNumber: true })} />}
                    </Field>
                  </div>
                  <Field label="Tag" description="Pisahkan dengan koma, contoh: kapal, snorkeling.">
                    {(c) => <Input {...c} {...register("tags")} />}
                  </Field>
                  {values.tripType === "private" && (
                    <label className="flex items-center justify-between gap-4 rounded-md border border-line px-4 py-3 text-sm sm:col-span-2">
                      <span>
                        <span className="font-medium">Bisa dijadikan dasar Custom Trip</span>
                        <span className="block text-xs text-muted-foreground">Tampil di filter Custom Trip pada website.</span>
                      </span>
                      <Controller control={control} name="isCustomizable" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                    </label>
                  )}
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="itinerary">
              <SectionCard title="Itinerary per hari" description="Urutan hari mengikuti daftar; gunakan tombol panah untuk memindahkan.">
                <ItineraryBuilder control={control} register={register} errors={errors.itinerary} />
              </SectionCard>
            </TabsContent>

            <TabsContent value="fasilitas" className="space-y-6">
              <SectionCard title="Termasuk & tidak termasuk">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Sudah termasuk" description="Satu item per baris.">
                    {(c) => <Controller control={control} name="inclusions" render={({ field }) => <ListTextarea control={c} rows={8} value={field.value} onChange={field.onChange} />} />}
                  </Field>
                  <Field label="Belum termasuk" description="Satu item per baris.">
                    {(c) => <Controller control={control} name="exclusions" render={({ field }) => <ListTextarea control={c} rows={8} value={field.value} onChange={field.onChange} />} />}
                  </Field>
                </div>
              </SectionCard>
              <SectionCard title="Titik kumpul & syarat peserta">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Titik kumpul" error={errors.meetingName?.message}>
                    {(c) => <Input {...c} {...register("meetingName")} />}
                  </Field>
                  <Field label="Waktu kumpul" optional>
                    {(c) => <Input {...c} {...register("meetingTime")} placeholder="09.00 WITA" />}
                  </Field>
                  <Field label="Alamat" optional className="sm:col-span-2">
                    {(c) => <Input {...c} {...register("meetingAddress")} />}
                  </Field>
                  <Field label="Catatan titik kumpul" optional className="sm:col-span-2">
                    {(c) => <Input {...c} {...register("meetingNotes")} />}
                  </Field>
                  <Field label="Tingkat aktivitas">
                    {(c) => (
                      <Controller
                        control={control}
                        name="fitness"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id={c.id} className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(FITNESS_LABEL) as (keyof typeof FITNESS_LABEL)[]).map((f) => (
                                <SelectItem key={f} value={f}>
                                  {FITNESS_LABEL[f]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </Field>
                  <Field label="Usia minimal" optional error={errors.minAge?.message}>
                    {(c) => <Input {...c} type="number" min={0} {...register("minAge", { setValueAs: (v) => (v === "" || v === null || Number.isNaN(Number(v)) ? undefined : Number(v)) })} />}
                  </Field>
                  <Field label="Syarat lain" description="Satu syarat per baris." className="sm:col-span-2">
                    {(c) => <Controller control={control} name="requirementNotes" render={({ field }) => <ListTextarea control={c} rows={3} value={field.value} onChange={field.onChange} />} />}
                  </Field>
                </div>
              </SectionCard>
              <SectionCard title="Syarat & ketentuan">
                <Field label="Ketentuan" description="Satu ketentuan per baris.">
                  {(c) => <Controller control={control} name="terms" render={({ field }) => <ListTextarea control={c} rows={6} value={field.value} onChange={field.onChange} />} />}
                </Field>
              </SectionCard>
              <SectionCard title="FAQ paket">
                <div className="space-y-4">
                  {faqs.fields.map((faq, index) => (
                    <div key={faq.id} className="grid gap-2 rounded-md border border-line p-3">
                      <div className="flex gap-2">
                        <Input aria-label={`Pertanyaan ${index + 1}`} placeholder="Pertanyaan" {...register(`faqs.${index}.question`)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => faqs.remove(index)} aria-label={`Hapus pertanyaan ${index + 1}`}>
                          <Trash2 />
                        </Button>
                      </div>
                      <Textarea aria-label={`Jawaban ${index + 1}`} placeholder="Jawaban" rows={2} {...register(`faqs.${index}.answer`)} />
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => faqs.append({ question: "", answer: "" })}>
                    <Plus aria-hidden="true" /> Tambah pertanyaan
                  </Button>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="galeri">
              <SectionCard title="Foto" description="Dipilih dari katalog foto showcase. Sampul tampil di kartu paket dan halaman detail.">
                <Controller
                  control={control}
                  name="coverMediaId"
                  render={({ field: cover }) => (
                    <Controller
                      control={control}
                      name="galleryMediaIds"
                      render={({ field: gallery }) => (
                        <MediaPicker
                          cover={cover.value}
                          gallery={gallery.value}
                          onChange={(next) => {
                            cover.onChange(next.cover)
                            gallery.onChange(next.gallery)
                          }}
                          groups={destinations.map((d) => ({ tag: d.slug, label: d.name }))}
                          initialGroup={destination?.slug}
                        />
                      )}
                    />
                  )}
                />
              </SectionCard>
            </TabsContent>

            <TabsContent value="harga">
              <SectionCard title="Harga & pembayaran">
                <PricingEditor control={control} register={register} errors={errors} tripType={values.tripType} />
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="min-w-0 space-y-6">
          {pkg ? (
            <DeparturesPanel db={db} now={now} today={today} pkg={pkg} />
          ) : (
            <SectionCard title="Langkah berikutnya">
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>Simpan sebagai draf.</li>
                <li>Lengkapi itinerary, foto, dan harga.</li>
                <li>Publikasikan (peran Owner atau Content).</li>
                <li>Untuk open trip, jadwalkan keberangkatan agar bisa dipesan.</li>
              </ol>
            </SectionCard>
          )}
        </aside>
      </div>
    </form>
  )
}
