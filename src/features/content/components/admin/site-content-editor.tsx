"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ExternalLink, Plus, Save, Trash2, X } from "lucide-react"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { DemoDatabase } from "@/domain/database"
import type { SiteContent } from "@/domain/entities"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { useQueryParams } from "@/hooks/use-query-params"
import { ListTextarea } from "@/components/dashboard/list-textarea"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { PhotoField } from "@/components/dashboard/photo-field"
import { SectionCard } from "@/components/dashboard/section-card"
import { Field } from "@/components/shared/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { WHY_US_ICONS } from "@/features/content/why-us-icons"
import { contentCommands, MAX_FEATURED_DESTINATIONS, MAX_FEATURED_PACKAGES, type SiteSection, type SiteSectionInput } from "@/services/content-service"

const TABS = [
  { value: "beranda", label: "Beranda", href: "/" },
  { value: "tentang", label: "Tentang", href: "/tentang" },
  { value: "kontak", label: "Kontak", href: "/kontak" },
] as const

const move = <T,>(list: T[], index: number, delta: number) => {
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(index + delta, 0, item)
  return next
}

const photoGroups = (db: DemoDatabase) => Object.values(db.destinations).map((d) => ({ tag: d.slug, label: d.name }))

/**
 * One editable section: local draft, dirty check, and a save button gated by permission.
 * The draft restarts when the saved value changes (after saving, or from another tab).
 */
function useSection<S extends SiteSection>(section: S, saved: SiteSectionInput[S]) {
  const { user } = usePersona()
  const savedKey = JSON.stringify(saved)
  const [state, setState] = useState({ savedKey, value: saved })
  if (state.savedKey !== savedKey) setState({ savedKey, value: saved })
  const command = useCommand(contentCommands.updateSection, { success: "Konten disimpan dan langsung tampil di website" })
  return {
    value: state.value,
    set: (value: SiteSectionInput[S]) => setState((s) => ({ ...s, value })),
    dirty: JSON.stringify(state.value) !== savedKey,
    reset: () => setState({ savedKey, value: saved }),
    save: () => command.run(user?.id ?? "", section, state.value as SiteSectionInput[SiteSection]),
    pending: command.pending,
  }
}

function SaveBar({ dirty, pending, onSave, onReset }: { dirty: boolean; pending: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
      {dirty && <span className="mr-auto text-xs text-tone-warning">Ada perubahan yang belum disimpan.</span>}
      <Button variant="ghost" disabled={!dirty || pending} onClick={onReset}>
        Batalkan perubahan
      </Button>
      <PermissionButton permission="content.manage" disabled={!dirty || pending} onClick={onSave}>
        <Save aria-hidden="true" /> Simpan
      </PermissionButton>
    </div>
  )
}

function ItemActions({ index, count, onMove, onRemove, label }: { index: number; count: number; onMove: (delta: number) => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Naikkan ${label}`}>
        <ArrowUp />
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Turunkan ${label}`}>
        <ArrowDown />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Hapus ${label}`}>
        <Trash2 />
      </Button>
    </div>
  )
}

export function SiteContentEditor() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(["tab"] as const)
  const tab = TABS.find((t) => t.value === query.tab) ?? TABS[0]
  if (!live) return <PageSkeleton />
  const { db } = live
  const content = db.siteContent
  const editor = content.updatedBy ? db.users[content.updatedBy]?.name : undefined

  return (
    <div>
      <PageHeader
        title="Konten Website"
        description={`Teks dan pilihan yang tampil di website publik. Perubahan langsung terlihat di website, termasuk di tab lain browser ini. Terakhir diubah ${formatDateTime(content.updatedAt)}${editor ? ` oleh ${editor}` : ""}.`}
        actions={
          <Button asChild variant="secondary">
            <Link href={tab.href} target="_blank">
              Lihat di website <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <div role="tablist" aria-label="Halaman" className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab.value === t.value}
            onClick={() => setQuery({ tab: t.value === "beranda" ? null : t.value })}
            className={cn(
              "-mb-px h-10 border-b-2 px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab.value === t.value ? "border-ocean-800 text-text-strong" : "border-transparent text-text-muted hover:text-text-strong",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab.value === "beranda" && (
        <div className="grid gap-6">
          <HeroEditor db={db} saved={content.hero} />
          <PromoEditor saved={content.promoBanner} />
          <FeaturedEditor db={db} saved={{ featuredPackageIds: content.featuredPackageIds, featuredDestinationIds: content.featuredDestinationIds }} />
          <WhyUsEditor saved={content.whyUs} />
          <FaqEditor saved={content.homepageFaqs} />
        </div>
      )}
      {tab.value === "tentang" && <AboutEditor db={db} saved={content.about} />}
      {tab.value === "kontak" && <ContactEditor saved={content.contact} />}
    </div>
  )
}

function HeroEditor({ db, saved }: { db: DemoDatabase; saved: SiteContent["hero"] }) {
  const s = useSection("hero", saved)
  const v = s.value
  const set = (patch: Partial<SiteContent["hero"]>) => s.set({ ...v, ...patch })
  return (
    <SectionCard title="Hero" description="Bagian pertama beranda: judul besar, foto, dan tombol utama.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-4">
          <Field label="Label kecil di atas judul" optional>
            {(c) => <Input {...c} value={v.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} />}
          </Field>
          <Field label="Judul">{(c) => <Input {...c} value={v.title} onChange={(e) => set({ title: e.target.value })} />}</Field>
          <Field label="Subjudul">{(c) => <Textarea {...c} rows={3} value={v.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />}</Field>
          <Field label="Label tombol" description="Tombol mengarah ke jadwal trip.">
            {(c) => <Input {...c} value={v.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} className="max-w-xs" />}
          </Field>
        </div>
        <Field label="Foto hero">{() => <PhotoField label="Foto hero" value={v.mediaId} onChange={(mediaId) => set({ mediaId })} groups={photoGroups(db)} />}</Field>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function PromoEditor({ saved }: { saved: SiteContent["promoBanner"] }) {
  const s = useSection("promoBanner", saved)
  const v = s.value
  const set = (patch: Partial<SiteContent["promoBanner"]>) => s.set({ ...v, ...patch })
  return (
    <SectionCard
      title="Banner promo"
      description="Pita pengumuman di atas header semua halaman publik."
      action={
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={v.enabled} onCheckedChange={(enabled) => set({ enabled })} /> {v.enabled ? "Tampil" : "Disembunyikan"}
        </label>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_12rem_14rem]">
        <Field label="Pesan">{(c) => <Input {...c} value={v.message} onChange={(e) => set({ message: e.target.value })} />}</Field>
        <Field label="Label tautan" optional>
          {(c) => <Input {...c} value={v.linkLabel ?? ""} onChange={(e) => set({ linkLabel: e.target.value })} />}
        </Field>
        <Field label="Tujuan tautan" optional description="Halaman di website ini, mis. /paket">
          {(c) => <Input {...c} value={v.linkHref ?? ""} onChange={(e) => set({ linkHref: e.target.value })} placeholder="/paket" />}
        </Field>
      </div>
      {v.enabled && v.message.trim() && (
        <div className="mt-4 rounded-md bg-ocean-950 px-4 py-2 text-center text-[0.8125rem] text-ivory-50">
          {v.message} {v.linkLabel && <span className="font-semibold text-sand-300 underline underline-offset-4">{v.linkLabel}</span>}
        </div>
      )}
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function PickList({
  title,
  description,
  max,
  ids,
  options,
  onChange,
}: {
  title: string
  description: string
  max: number
  ids: string[]
  options: { id: string; label: string; hint?: string }[]
  onChange: (ids: string[]) => void
}) {
  const byId = new Map(options.map((o) => [o.id, o]))
  const available = options.filter((o) => !ids.includes(o.id))
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
        <span className="text-xs text-text-subtle tabular-nums">
          {ids.length}/{max}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <ol className="mt-3 divide-y divide-line rounded-md border border-line">
        {ids.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Belum ada yang dipilih.</li>}
        {ids.map((id, index) => {
          const option = byId.get(id)
          return (
            <li key={id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-5 text-xs text-text-subtle tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm", option ? "text-text-strong" : "text-tone-warning")}>{option?.label ?? "Tidak tampil di bagian ini (belum terbit atau bukan open trip)"}</span>
                {option?.hint && <span className="block truncate text-xs text-text-subtle">{option.hint}</span>}
              </span>
              <ItemActions index={index} count={ids.length} label={option?.label ?? id} onMove={(d) => onChange(move(ids, index, d))} onRemove={() => onChange(ids.filter((x) => x !== id))} />
            </li>
          )
        })}
      </ol>
      <Select value="" onValueChange={(id) => onChange([...ids, id])} disabled={ids.length >= max || available.length === 0}>
        <SelectTrigger className="mt-2 w-full" aria-label={`Tambah ke ${title.toLowerCase()}`}>
          <SelectValue placeholder={ids.length >= max ? `Maksimal ${max}` : "Tambah…"} />
        </SelectTrigger>
        <SelectContent>
          {available.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function FeaturedEditor({ db, saved }: { db: DemoDatabase; saved: SiteSectionInput["featured"] }) {
  const s = useSection("featured", saved)
  const v = s.value
  const packages = Object.values(db.packages)
    .filter((p) => p.status === "published" && p.visibility === "catalog" && p.tripType === "open")
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((p) => ({ id: p.id, label: p.title, hint: db.destinations[p.destinationId]?.name }))
  const destinations = Object.values(db.destinations)
    .filter((d) => d.status === "published")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => ({ id: d.id, label: d.name, hint: d.tagline }))
  return (
    <SectionCard title="Paket dan destinasi unggulan" description="Urutan di sini adalah urutan tampil di beranda.">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <PickList
          title="Open trip pilihan"
          description="Kartu pertama tampil paling besar. Hanya paket open trip yang terbit."
          max={MAX_FEATURED_PACKAGES}
          ids={v.featuredPackageIds}
          options={packages}
          onChange={(featuredPackageIds) => s.set({ ...v, featuredPackageIds })}
        />
        <PickList
          title="Destinasi unggulan"
          description="Mosaik destinasi di beranda."
          max={MAX_FEATURED_DESTINATIONS}
          ids={v.featuredDestinationIds}
          options={destinations}
          onChange={(featuredDestinationIds) => s.set({ ...v, featuredDestinationIds })}
        />
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function RepeatList<T>({
  items,
  onChange,
  blank,
  max,
  min = 0,
  addLabel,
  itemLabel,
  render,
}: {
  items: T[]
  onChange: (items: T[]) => void
  blank: T
  max: number
  min?: number
  addLabel: string
  itemLabel: (index: number) => string
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode
}) {
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-3 rounded-md border border-line p-3">
          <div className="grid min-w-0 flex-1 gap-3">{render(item, (patch) => onChange(items.map((x, i) => (i === index ? { ...x, ...patch } : x))), index)}</div>
          <div className="flex flex-col">
            <Button variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => onChange(move(items, index, -1))} aria-label={`Naikkan ${itemLabel(index)}`}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-sm" disabled={index === items.length - 1} onClick={() => onChange(move(items, index, 1))} aria-label={`Turunkan ${itemLabel(index)}`}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon-sm" disabled={items.length <= min} onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label={`Hapus ${itemLabel(index)}`}>
              <X />
            </Button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" className="justify-self-start" disabled={items.length >= max} onClick={() => onChange([...items, blank])}>
        <Plus aria-hidden="true" /> {addLabel}
      </Button>
    </div>
  )
}

function WhyUsEditor({ saved }: { saved: SiteContent["whyUs"] }) {
  const s = useSection("whyUs", saved)
  return (
    <SectionCard title="Kenapa bersama kami" description="2 sampai 6 keunggulan, tampil sebagai kolom bernomor.">
      <RepeatList
        items={s.value}
        onChange={s.set}
        blank={{ icon: "compass", title: "", body: "" }}
        min={2}
        max={6}
        addLabel="Tambah keunggulan"
        itemLabel={(i) => `keunggulan ${i + 1}`}
        render={(item, update, index) => (
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
            <Select value={item.icon} onValueChange={(icon) => update({ icon })}>
              <SelectTrigger aria-label={`Ikon keunggulan ${index + 1}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(WHY_US_ICONS).map(([key, { icon: Icon, label }]) => (
                  <SelectItem key={key} value={key}>
                    <Icon aria-hidden="true" /> {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input aria-label={`Judul keunggulan ${index + 1}`} value={item.title} onChange={(e) => update({ title: e.target.value })} placeholder="Judul" />
            <Textarea aria-label={`Deskripsi keunggulan ${index + 1}`} rows={2} value={item.body} onChange={(e) => update({ body: e.target.value })} placeholder="Deskripsi singkat" className="sm:col-span-2" />
          </div>
        )}
      />
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function FaqEditor({ saved }: { saved: SiteContent["homepageFaqs"] }) {
  const s = useSection("homepageFaqs", saved)
  return (
    <SectionCard title="FAQ beranda" description="Kosongkan semua untuk menyembunyikan bagian FAQ.">
      <RepeatList
        items={s.value}
        onChange={s.set}
        blank={{ question: "", answer: "" }}
        max={10}
        addLabel="Tambah pertanyaan"
        itemLabel={(i) => `FAQ ${i + 1}`}
        render={(faq, update, index) => (
          <>
            <Input aria-label={`Pertanyaan ${index + 1}`} value={faq.question} onChange={(e) => update({ question: e.target.value })} placeholder="Pertanyaan" />
            <Textarea aria-label={`Jawaban ${index + 1}`} rows={3} value={faq.answer} onChange={(e) => update({ answer: e.target.value })} placeholder="Jawaban" />
          </>
        )}
      />
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function AboutEditor({ db, saved }: { db: DemoDatabase; saved: SiteContent["about"] }) {
  const s = useSection("about", saved)
  const v = s.value
  const set = (patch: Partial<SiteContent["about"]>) => s.set({ ...v, ...patch })
  return (
    <SectionCard title="Halaman Tentang" description="Cerita brand fiktif. Hindari klaim yang tidak bisa dibuktikan (izin, penghargaan, tahun berdiri).">
      <div className="grid gap-5">
        <Field label="Judul">{(c) => <Input {...c} value={v.headline} onChange={(e) => set({ headline: e.target.value })} />}</Field>
        <Field label="Pengantar">{(c) => <Textarea {...c} rows={3} value={v.intro} onChange={(e) => set({ intro: e.target.value })} />}</Field>
        <Field label="Cerita" description="Pisahkan paragraf dengan satu baris kosong.">
          {(c) => <ListTextarea control={c} value={v.story} onChange={(story) => set({ story })} rows={8} separator="paragraph" />}
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">Nilai yang kami pegang</p>
          <RepeatList
            items={v.values}
            onChange={(values) => set({ values })}
            blank={{ title: "", body: "" }}
            max={6}
            addLabel="Tambah nilai"
            itemLabel={(i) => `nilai ${i + 1}`}
            render={(item, update, index) => (
              <>
                <Input aria-label={`Judul nilai ${index + 1}`} value={item.title} onChange={(e) => update({ title: e.target.value })} placeholder="Judul" />
                <Textarea aria-label={`Deskripsi nilai ${index + 1}`} rows={2} value={item.body} onChange={(e) => update({ body: e.target.value })} placeholder="Deskripsi" />
              </>
            )}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {v.mediaIds.map((mediaId, index) => (
            <Field key={index} label={`Foto ${index + 1}`}>
              {() => (
                <PhotoField
                  label={`Foto ${index + 1} halaman Tentang`}
                  value={mediaId}
                  onChange={(next) => set({ mediaIds: v.mediaIds.map((m, i) => (i === index ? next : m)) })}
                  groups={photoGroups(db)}
                  aspect="aspect-[4/3]"
                />
              )}
            </Field>
          ))}
        </div>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}

function ContactEditor({ saved }: { saved: SiteContent["contact"] }) {
  const s = useSection("contact", saved)
  const v = s.value
  const set = (patch: Partial<SiteContent["contact"]>) => s.set({ ...v, ...patch })
  return (
    <SectionCard title="Info kontak" description="Tampil di halaman Kontak dan footer. Gunakan data fiktif.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Alamat" className="md:col-span-2">
          {(c) => <Textarea {...c} rows={2} value={v.address} onChange={(e) => set({ address: e.target.value })} />}
        </Field>
        <Field label="Email">{(c) => <Input {...c} type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} />}</Field>
        <Field label="WhatsApp" description="Tombol WhatsApp di website tetap simulasi.">
          {(c) => <Input {...c} value={v.whatsappDisplay} onChange={(e) => set({ whatsappDisplay: e.target.value })} />}
        </Field>
        <Field label="Jam operasional" className="md:col-span-2">
          {(c) => <Input {...c} value={v.officeHours} onChange={(e) => set({ officeHours: e.target.value })} />}
        </Field>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  )
}
