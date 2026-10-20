"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ExternalLink, Loader2, Pencil, Plus, Quote } from "lucide-react"
import { formatDate } from "@/lib/format"
import type { Testimonial } from "@/domain/entities"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { useQueryParams } from "@/hooks/use-query-params"
import { FilterBar, FilterSelect } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { EmptyState } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { contentCommands, type TestimonialInput } from "@/services/content-service"

const NONE = "__tanpa"

export function TestimonialAdmin() {
  const live = useLive()
  const { user, denial } = usePersona()
  const [query, setQuery] = useQueryParams(["status"] as const)
  const [editing, setEditing] = useState<Testimonial | "new" | null>(null)
  const toggle = useCommand(contentCommands.setTestimonialStatus, { success: (t) => (t.status === "published" ? "Testimoni ditampilkan di website" : "Testimoni disembunyikan") })
  const list = useMemo(
    () => (live ? Object.values(live.db.testimonials).sort((a, b) => Number(b.status === "published") - Number(a.status === "published") || b.updatedAt.localeCompare(a.updatedAt)) : []),
    [live],
  )
  if (!live) return <PageSkeleton />
  const { db } = live
  const filtered = list.filter((t) => !query.status || t.status === query.status)
  const shown = list.filter((t) => t.status === "published").length
  const blocked = denial("content.manage")

  return (
    <div>
      <PageHeader
        title="Testimoni"
        description={`${shown} dari ${list.length} testimoni tampil di halaman Tentang. Semua testimoni di showcase ini adalah ilustrasi.`}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href="/tentang#testimoni" target="_blank">
                Lihat di website <ExternalLink aria-hidden="true" />
              </Link>
            </Button>
            <PermissionButton permission="content.manage" onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" /> Tambah testimoni
            </PermissionButton>
          </>
        }
      />
      <DemoNotice className="mb-4">Testimoni bertanda ilustrasi: nama dan cerita fiktif, bukan ulasan pelanggan yang terverifikasi.</DemoNotice>
      <FilterBar>
        <FilterSelect
          label="Status"
          value={query.status}
          onChange={(status) => setQuery({ status })}
          allLabel="Semua testimoni"
          options={[
            { value: "published", label: "Tampil" },
            { value: "hidden", label: "Disembunyikan" },
          ]}
        />
      </FilterBar>
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-line bg-card shadow-xs">
          <EmptyState icon={Quote} title="Tidak ada testimoni" description="Ubah filter atau tambah testimoni baru." />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const pkg = t.packageId ? db.packages[t.packageId] : undefined
            const switchId = `tampil-${t.id}`
            return (
              <li key={t.id} className="flex flex-col rounded-lg border border-line bg-card p-5 shadow-xs">
                <Quote className="size-5 text-sand-500" aria-hidden="true" />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-text-strong">{t.quote}</blockquote>
                <p className="mt-4 text-sm font-semibold text-text-strong">{t.authorName}</p>
                <p className="text-xs text-text-subtle">
                  {[pkg?.title, t.tripMonth && formatDate(`${t.tripMonth}-01`, "month-year")].filter(Boolean).join(" · ") || "Tanpa paket"}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <label htmlFor={switchId} className="flex items-center gap-2 text-sm">
                    <Switch
                      id={switchId}
                      checked={t.status === "published"}
                      disabled={!!blocked || toggle.pending}
                      onCheckedChange={(on) => toggle.run(user?.id ?? "", t.id, on ? "published" : "hidden")}
                    />
                    {t.status === "published" ? "Tampil" : "Disembunyikan"}
                  </label>
                  <PermissionButton permission="content.manage" variant="ghost" size="sm" onClick={() => setEditing(t)}>
                    <Pencil aria-hidden="true" /> Edit
                  </PermissionButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <TestimonialDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        open={editing !== null}
        testimonial={editing === "new" ? undefined : (editing ?? undefined)}
        packages={Object.values(db.packages).filter((p) => p.status !== "archived")}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  )
}

function TestimonialDialog({
  open,
  testimonial,
  packages,
  onOpenChange,
}: {
  open: boolean
  testimonial?: Testimonial
  packages: { id: string; title: string }[]
  onOpenChange: (open: boolean) => void
}) {
  const { user } = usePersona()
  const [value, setValue] = useState<TestimonialInput>({
    authorName: testimonial?.authorName ?? "",
    quote: testimonial?.quote ?? "",
    packageId: testimonial?.packageId,
    tripMonth: testimonial?.tripMonth,
  })
  const save = useCommand(contentCommands.saveTestimonial, {
    success: testimonial ? "Testimoni disimpan" : "Testimoni ditambahkan (disembunyikan sampai Anda menampilkannya)",
    onSuccess: () => onOpenChange(false),
  })
  const set = (patch: Partial<TestimonialInput>) => setValue((v) => ({ ...v, ...patch }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save.run(user?.id ?? "", value, testimonial?.id)
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{testimonial ? "Edit testimoni" : "Tambah testimoni"}</DialogTitle>
            <DialogDescription>Gunakan nama depan dan kota fiktif. Testimoni tampil berlabel ilustrasi.</DialogDescription>
          </DialogHeader>
          <Field label="Isi testimoni" description={`${value.quote.length}/400 karakter`}>
            {(c) => <Textarea {...c} rows={4} maxLength={400} value={value.quote} onChange={(e) => set({ quote: e.target.value })} />}
          </Field>
          <Field label="Nama dan kota" description='Contoh: "Dinda, Bandung"'>
            {(c) => <Input {...c} value={value.authorName} onChange={(e) => set({ authorName: e.target.value })} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paket" optional>
              {(c) => (
                <Select value={value.packageId ?? NONE} onValueChange={(id) => set({ packageId: id === NONE ? undefined : id })}>
                  <SelectTrigger {...c} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Tanpa paket</SelectItem>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Bulan trip" optional>
              {(c) => <Input {...c} type="month" value={value.tripMonth ?? ""} onChange={(e) => set({ tripMonth: e.target.value || undefined })} />}
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={save.pending}>
              Batal
            </Button>
            <Button type="submit" disabled={save.pending}>
              {save.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
