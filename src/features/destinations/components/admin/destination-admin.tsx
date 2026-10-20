"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ExternalLink, Eye, EyeOff, Loader2, MapPin, Plus, Save } from "lucide-react"
import { SLUG_PATTERN, slugify } from "@/lib/slug"
import type { DemoDatabase } from "@/domain/database"
import type { Destination } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import { DESTINATION_CATEGORY_LABEL, PACKAGE_STATUS_LABEL, REGION_LABEL } from "@/domain/labels"
import type { DestinationCategory, RegionKey } from "@/domain/types/common"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, SearchField } from "@/components/dashboard/filters"
import { ListTextarea } from "@/components/dashboard/list-textarea"
import { MediaPicker } from "@/components/dashboard/media-picker"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { ChipToggle } from "@/components/shared/choice"
import { Field, FieldGroup } from "@/components/shared/field"
import { SmartImage } from "@/components/shared/smart-image"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PACKAGE_STATUS_TONE } from "@/features/packages/labels"
import { catalogCommands, type DestinationInput } from "@/services/catalog-admin-service"

const STATUS_LABEL: Record<Destination["status"], string> = { draft: "Draf", published: "Terbit" }
const STATUS_TONE = { draft: "neutral", published: "success" } as const

interface Row {
  destination: Destination
  packages: number
  published: number
}

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Destinasi",
    sortValue: (r) => r.destination.name,
    cell: (r) => (
      <div className="flex items-center gap-3">
        <div className="relative hidden h-10 w-14 shrink-0 overflow-hidden rounded bg-muted sm:block">
          <SmartImage mediaId={r.destination.coverMediaId} fill sizes="56px" alt="" />
        </div>
        <div className="min-w-0">
          <Link href={`/dashboard/destinations/${r.destination.id}`} className="font-semibold text-text-strong hover:underline">
            {r.destination.name}
          </Link>
          <p className="text-xs text-text-subtle">{r.destination.province}</p>
        </div>
      </div>
    ),
  },
  { key: "region", header: "Wilayah", sortValue: (r) => r.destination.region, cell: (r) => <span className="whitespace-nowrap">{REGION_LABEL[r.destination.region]}</span> },
  { key: "categories", header: "Kategori", wide: true, cell: (r) => <span className="text-text-muted">{r.destination.categories.map((c) => DESTINATION_CATEGORY_LABEL[c]).join(", ")}</span> },
  { key: "packages", header: "Paket terbit", align: "right", sortValue: (r) => r.published, cell: (r) => `${r.published} / ${r.packages}` },
  { key: "status", header: "Status", sortValue: (r) => r.destination.status, cell: (r) => <StatusBadge tone={STATUS_TONE[r.destination.status]}>{STATUS_LABEL[r.destination.status]}</StatusBadge> },
]

export function DestinationList() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(["q", "wilayah", "status"] as const)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))
  const rows = useMemo<Row[]>(() => {
    if (!live) return []
    const idx = getIndexes(live.db)
    return Object.values(live.db.destinations).map((destination) => {
      const packages = idx.packagesByDestination.get(destination.id) ?? []
      return { destination, packages: packages.length, published: packages.filter((p) => p.status === "published").length }
    })
  }, [live])
  const filtered = rows.filter((r) => {
    if (query.wilayah && r.destination.region !== query.wilayah) return false
    if (query.status && r.destination.status !== query.status) return false
    const term = search.value.trim().toLowerCase()
    return !term || `${r.destination.name} ${r.destination.province}`.toLowerCase().includes(term)
  })
  if (!live) return <PageSkeleton />
  return (
    <div>
      <PageHeader
        title="Destinasi"
        description="Destinasi terbit tampil di website beserta paket-paketnya."
        actions={
          <PermissionButton permission="packages.manage" asChild>
            <Link href="/dashboard/destinations/new">
              <Plus aria-hidden="true" /> Buat destinasi
            </Link>
          </PermissionButton>
        }
      />
      <FilterBar
        active={Boolean(query.wilayah || query.status || search.value)}
        onReset={() => {
          search.reset()
          setQuery({ q: null, wilayah: null, status: null })
        }}
      >
        <SearchField value={search.value} onChange={search.setValue} placeholder="Cari destinasi atau provinsi…" />
        <FilterSelect label="Wilayah" value={query.wilayah} onChange={(wilayah) => setQuery({ wilayah })} allLabel="Semua wilayah" options={(Object.keys(REGION_LABEL) as RegionKey[]).map((r) => ({ value: r, label: REGION_LABEL[r] }))} />
        <FilterSelect label="Status" value={query.status} onChange={(status) => setQuery({ status })} allLabel="Semua status" options={[{ value: "published", label: "Terbit" }, { value: "draft", label: "Draf" }]} />
      </FilterBar>
      <DataTable
        rows={filtered}
        columns={columns}
        caption="Daftar destinasi"
        getRowKey={(r) => r.destination.id}
        getRowHref={(r) => `/dashboard/destinations/${r.destination.id}`}
        defaultSort={{ key: "name", dir: "asc" }}
        empty={<EmptyState icon={MapPin} title="Tidak ada destinasi yang cocok" />}
        renderCard={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-text-strong">{r.destination.name}</p>
              <p className="text-xs text-text-subtle">
                {REGION_LABEL[r.destination.region]} · {r.published} paket terbit
              </p>
            </div>
            <StatusBadge tone={STATUS_TONE[r.destination.status]}>{STATUS_LABEL[r.destination.status]}</StatusBadge>
          </div>
        )}
      />
    </div>
  )
}

const schema = z.object({
  name: z.string().trim().min(2, "Isi nama destinasi."),
  slug: z.string().trim().refine((v) => v === "" || SLUG_PATTERN.test(v), "Huruf kecil, angka, dan tanda hubung saja."),
  region: z.enum(["bali-nusa-tenggara", "jawa", "sumatra-kepulauan", "papua-maluku"]),
  province: z.string().trim().min(2, "Isi provinsi."),
  categories: z.array(z.string()).min(1, "Pilih minimal satu kategori."),
  tagline: z.string().trim().min(5, "Isi tagline."),
  summary: z.string().trim().min(20, "Minimal 20 karakter.").max(180, "Maksimal 180 karakter."),
  description: z.array(z.string()),
  highlights: z.array(z.string()),
  bestTime: z.string().trim(),
  gettingThere: z.string().trim(),
  coverMediaId: z.string(),
  galleryMediaIds: z.array(z.string()),
})
type Values = z.input<typeof schema>

function toValues(d?: Destination): Values {
  return {
    name: d?.name ?? "",
    slug: d?.slug ?? "",
    region: d?.region ?? "bali-nusa-tenggara",
    province: d?.province ?? "",
    categories: d?.categories ?? [],
    tagline: d?.tagline ?? "",
    summary: d?.summary ?? "",
    description: d?.description ?? [],
    highlights: d?.highlights ?? [],
    bestTime: d?.bestTime ?? "",
    gettingThere: d?.gettingThere ?? "",
    coverMediaId: d?.coverMediaId ?? "",
    galleryMediaIds: d?.galleryMediaIds ?? [],
  }
}

/** Must sit inside <Suspense> when editing. */
export function DestinationEditorRoute() {
  const { id } = useParams<{ id: string }>()
  return <DestinationEditorLoader id={id} />
}

export function NewDestinationEditor() {
  return <DestinationEditorLoader />
}

function DestinationEditorLoader({ id }: { id?: string }) {
  const live = useLive()
  if (!live) return <PageSkeleton variant="detail" />
  const destination = id ? live.db.destinations[id] : undefined
  if (id && !destination) {
    return (
      <NotFoundPanel
        title="Destinasi tidak ditemukan"
        description="Destinasi ini tidak ada di data demo browser ini."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/destinations">Kembali ke daftar destinasi</Link>
          </Button>
        }
      />
    )
  }
  return <DestinationEditor key={destination ? `${destination.id}-${destination.updatedAt}` : "baru"} db={live.db} destination={destination} />
}

function DestinationEditor({ db, destination }: { db: DemoDatabase; destination?: Destination }) {
  const router = useRouter()
  const { user } = usePersona()
  const [slugTouched, setSlugTouched] = useState(!!destination)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(destination) })
  const { control, register, formState, setValue } = form
  const errors = formState.errors
  const [categories, slug, summary] = useWatch({ control, name: ["categories", "slug", "summary"] })
  const save = useCommand(catalogCommands.saveDestination, {
    success: (d) => (destination ? `Destinasi ${d.name} disimpan` : `Destinasi ${d.name} dibuat sebagai draf`),
    onSuccess: (d) => !destination && router.replace(`/dashboard/destinations/${d.id}`),
  })
  const setStatus = useCommand(catalogCommands.setDestinationStatus, { success: (d) => `Destinasi ${STATUS_LABEL[d.status].toLowerCase()}` })
  const packages = destination ? (getIndexes(db).packagesByDestination.get(destination.id) ?? []) : []
  const unsaved = formState.isDirty ? "Simpan perubahan terlebih dahulu." : null

  return (
    <form noValidate onSubmit={form.handleSubmit((v) => user && save.run(user.id, v as DestinationInput, destination?.id))}>
      <PageHeader
        back={{ href: "/dashboard/destinations", label: "Destinasi" }}
        title={destination?.name ?? "Destinasi baru"}
        meta={destination && <StatusBadge tone={STATUS_TONE[destination.status]}>{STATUS_LABEL[destination.status]}</StatusBadge>}
        actions={
          <>
            {destination?.status === "published" && (
              <Button asChild variant="ghost">
                <Link href={`/destinasi/${destination.slug}`} target="_blank">
                  Lihat di website <ExternalLink aria-hidden="true" />
                </Link>
              </Button>
            )}
            {destination && user && (
              <PermissionButton
                permission="packages.publish"
                variant={destination.status === "draft" ? "default" : "secondary"}
                disabledReason={unsaved}
                disabled={setStatus.pending}
                onClick={() => setStatus.run(user.id, destination.id, destination.status === "draft" ? "published" : "draft")}
              >
                {destination.status === "draft" ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                {destination.status === "draft" ? "Publikasikan" : "Jadikan draf"}
              </PermissionButton>
            )}
            <PermissionButton permission="packages.manage" type="submit" disabled={save.pending || (!!destination && !formState.isDirty)}>
              {save.pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} {destination ? "Simpan perubahan" : "Buat draf"}
            </PermissionButton>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <SectionCard title="Informasi">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nama" error={errors.name?.message}>
                {(c) => <Input {...c} {...register("name", { onChange: (e) => !slugTouched && setValue("slug", slugify(e.target.value)) })} />}
              </Field>
              <Field label="Slug URL" error={errors.slug?.message} description={slug ? `/destinasi/${slug}` : undefined}>
                {(c) => <Input {...c} {...register("slug", { onChange: () => setSlugTouched(true) })} />}
              </Field>
              <Field label="Wilayah">
                {(c) => (
                  <Controller
                    control={control}
                    name="region"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={c.id} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(REGION_LABEL) as RegionKey[]).map((r) => (
                            <SelectItem key={r} value={r}>
                              {REGION_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <Field label="Provinsi" error={errors.province?.message}>
                {(c) => <Input {...c} {...register("province")} />}
              </Field>
              <FieldGroup legend="Kategori" error={errors.categories?.message} className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(DESTINATION_CATEGORY_LABEL) as DestinationCategory[]).map((cat) => (
                    <ChipToggle
                      key={cat}
                      pressed={categories.includes(cat)}
                      onPressedChange={(on) => setValue("categories", on ? [...categories, cat] : categories.filter((c) => c !== cat), { shouldDirty: true, shouldValidate: true })}
                    >
                      {DESTINATION_CATEGORY_LABEL[cat]}
                    </ChipToggle>
                  ))}
                </div>
              </FieldGroup>
              <Field label="Tagline" error={errors.tagline?.message} className="sm:col-span-2">
                {(c) => <Input {...c} {...register("tagline")} />}
              </Field>
              <Field label="Ringkasan" error={errors.summary?.message} description={`${summary.length}/180 karakter, tampil di kartu.`} className="sm:col-span-2">
                {(c) => <Textarea {...c} rows={2} {...register("summary")} />}
              </Field>
              <Field label="Deskripsi" description="Pisahkan paragraf dengan baris kosong." className="sm:col-span-2">
                {(c) => <Controller control={control} name="description" render={({ field }) => <ListTextarea control={c} separator="paragraph" rows={6} value={field.value} onChange={field.onChange} />} />}
              </Field>
              <Field label="Sorotan" description="Satu per baris." className="sm:col-span-2">
                {(c) => <Controller control={control} name="highlights" render={({ field }) => <ListTextarea control={c} rows={4} value={field.value} onChange={field.onChange} />} />}
              </Field>
              <Field label="Waktu terbaik">
                {(c) => <Input {...c} {...register("bestTime")} />}
              </Field>
              <Field label="Cara menuju">
                {(c) => <Input {...c} {...register("gettingThere")} />}
              </Field>
            </div>
          </SectionCard>
          <SectionCard title="Foto">
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
                      groups={Object.values(db.destinations).map((d) => ({ tag: d.slug, label: d.name }))}
                      initialGroup={destination?.slug}
                    />
                  )}
                />
              )}
            />
          </SectionCard>
        </div>
        <aside className="min-w-0">
          <SectionCard title={`Paket (${packages.length})`} bodyClassName="p-0">
            {packages.length === 0 ? (
              <p className="px-5 py-5 text-sm text-muted-foreground">Belum ada paket di destinasi ini.</p>
            ) : (
              <ul className="divide-y divide-line">
                {packages.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <Link href={`/dashboard/packages/${p.id}`} className="min-w-0 truncate text-sm font-medium text-text-strong hover:underline">
                      {p.title}
                    </Link>
                    <StatusBadge tone={PACKAGE_STATUS_TONE[p.status]}>{PACKAGE_STATUS_LABEL[p.status]}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </aside>
      </div>
    </form>
  )
}
