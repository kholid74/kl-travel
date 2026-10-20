"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowDown, ArrowUp, CircleAlert, ExternalLink, Heading2, Image as ImageIcon, List, Pilcrow, Quote, Save, Send, Trash2, Undo2, X } from "lucide-react"
import { slugify } from "@/lib/slug"
import { cn } from "@/lib/utils"
import type { DemoDatabase } from "@/domain/database"
import type { Article, ArticleBlock } from "@/domain/entities"
import { ARTICLE_CATEGORY_LABEL } from "@/domain/labels"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { ListTextarea } from "@/components/dashboard/list-textarea"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { PhotoField } from "@/components/dashboard/photo-field"
import { SectionCard } from "@/components/dashboard/section-card"
import { Field } from "@/components/shared/field"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { articlePublishBlockers, contentCommands, type ArticleInput } from "@/services/content-service"
import { ARTICLE_STATUS_LABEL } from "./article-list"

const NONE = "__tanpa"

const BLOCK_TYPES: { type: ArticleBlock["type"]; label: string; icon: typeof Pilcrow; blank: ArticleBlock }[] = [
  { type: "paragraph", label: "Paragraf", icon: Pilcrow, blank: { type: "paragraph", text: "" } },
  { type: "heading", label: "Subjudul", icon: Heading2, blank: { type: "heading", text: "" } },
  { type: "list", label: "Daftar", icon: List, blank: { type: "list", items: [] } },
  { type: "quote", label: "Kutipan", icon: Quote, blank: { type: "quote", text: "" } },
  { type: "image", label: "Gambar", icon: ImageIcon, blank: { type: "image", mediaId: "" } },
]

const toInput = (article?: Article, author = ""): ArticleInput => ({
  title: article?.title ?? "",
  slug: article?.slug ?? "",
  excerpt: article?.excerpt ?? "",
  category: article?.category ?? "panduan",
  destinationId: article?.destinationId,
  coverMediaId: article?.coverMediaId ?? "",
  body: article?.body ?? [{ type: "paragraph", text: "" }],
  authorName: article?.authorName ?? author,
})

/** Must sit inside <Suspense>: the id is only known at request time. */
export function ArticleEditorRoute() {
  const { id } = useParams<{ id: string }>()
  const live = useLive()
  if (!live) return <PageSkeleton variant="detail" />
  const article = live.db.articles[id]
  if (!article) {
    return (
      <NotFoundPanel
        title="Artikel tidak ditemukan"
        description="Artikel ini tidak ada di data demo browser ini. Mungkin sudah dihapus atau data demo di-reset."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/articles">Kembali ke daftar artikel</Link>
          </Button>
        }
      />
    )
  }
  return <ArticleEditor key={article.id} db={live.db} article={article} />
}

export function NewArticle() {
  const live = useLive()
  if (!live) return <PageSkeleton variant="detail" />
  return <ArticleEditor db={live.db} />
}

function ArticleEditor({ db, article }: { db: DemoDatabase; article?: Article }) {
  const router = useRouter()
  const { user } = usePersona()
  const savedKey = article ? `${article.id}@${article.updatedAt}` : "new"
  const [draft, setDraft] = useState({ savedKey, value: toInput(article, user?.name) })
  if (draft.savedKey !== savedKey) setDraft({ savedKey, value: toInput(article) })
  const [slugTouched, setSlugTouched] = useState(!!article)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const v = draft.value
  const set = (patch: Partial<ArticleInput>) => setDraft((d) => ({ ...d, value: { ...d.value, ...patch } }))
  const setBlocks = (body: ArticleBlock[]) => set({ body })

  const save = useCommand(contentCommands.saveArticle, {
    success: (a) => (article ? "Artikel disimpan" : `Draf "${a.title}" dibuat`),
    onSuccess: (a) => !article && router.replace(`/dashboard/articles/${a.id}`),
  })
  const status = useCommand(contentCommands.setArticleStatus, { success: (a) => (a.status === "published" ? "Artikel dipublikasikan di jurnal" : "Artikel dijadikan draf") })
  const remove = useCommand(contentCommands.deleteArticle, { success: "Draf artikel dihapus", onSuccess: () => router.replace("/dashboard/articles") })

  const dirty = JSON.stringify(v) !== JSON.stringify(toInput(article, article ? undefined : user?.name))
  const blockers = articlePublishBlockers({ ...v, body: v.body })
  const pending = save.pending || status.pending || remove.pending
  const photoGroups = Object.values(db.destinations).map((d) => ({ tag: d.slug, label: d.name }))
  const published = article?.status === "published"

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard/articles", label: "Artikel" }}
        title={v.title.trim() || (article ? article.title : "Artikel baru")}
        meta={article && <StatusBadge tone={published ? "success" : "neutral"}>{ARTICLE_STATUS_LABEL[article.status]}</StatusBadge>}
        description={article ? `/jurnal/${article.slug}` : "Draf baru, belum tampil di website."}
        actions={
          <>
            {published && (
              <Button asChild variant="ghost">
                <Link href={`/jurnal/${article.slug}`} target="_blank">
                  Lihat di website <ExternalLink aria-hidden="true" />
                </Link>
              </Button>
            )}
            {article && !published && (
              <PermissionButton permission="content.manage" variant="ghost" className="text-tone-danger hover:bg-tone-danger-bg" onClick={() => setConfirmDelete(true)} disabled={pending}>
                <Trash2 aria-hidden="true" /> Hapus draf
              </PermissionButton>
            )}
            {article && (
              <PermissionButton
                permission="content.manage"
                variant="secondary"
                disabled={pending}
                disabledReason={!published && dirty ? "Simpan perubahan terlebih dahulu." : !published && blockers.length ? blockers[0] : null}
                onClick={() => status.run(user?.id ?? "", article.id, published ? "draft" : "published")}
              >
                {published ? (
                  <>
                    <Undo2 aria-hidden="true" /> Jadikan draf
                  </>
                ) : (
                  <>
                    <Send aria-hidden="true" /> Publikasikan
                  </>
                )}
              </PermissionButton>
            )}
            <PermissionButton permission="content.manage" disabled={pending || (!!article && !dirty)} onClick={() => save.run(user?.id ?? "", v, article?.id)}>
              <Save aria-hidden="true" /> {article ? "Simpan" : "Simpan draf"}
            </PermissionButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <SectionCard>
            <div className="grid gap-4">
              <Field label="Judul">
                {(c) => (
                  <Input
                    {...c}
                    value={v.title}
                    onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
                    className="text-base font-semibold"
                  />
                )}
              </Field>
              <Field label="Ringkasan" description="Tampil di kartu jurnal dan di bawah judul artikel.">
                {(c) => <Textarea {...c} rows={2} value={v.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />}
              </Field>
            </div>
          </SectionCard>
          <SectionCard title="Isi artikel" description="Susun dari blok: paragraf, subjudul, daftar, kutipan, dan gambar.">
            <BlockEditor blocks={v.body} onChange={setBlocks} photoGroups={photoGroups} />
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-6">
          {(!published || blockers.length > 0) && (
            <SectionCard title="Syarat publikasi">
              {blockers.length === 0 ? (
                <p className="text-sm text-tone-success">Artikel siap dipublikasikan{dirty ? " setelah disimpan" : ""}.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {blockers.map((b) => (
                    <li key={b} className="flex gap-2 text-text-muted">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-tone-warning" aria-hidden="true" /> {b}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
          <SectionCard title="Detail">
            <div className="grid gap-4">
              <Field label="Kategori">
                {(c) => (
                  <Select value={v.category} onValueChange={(category) => set({ category: category as Article["category"] })}>
                    <SelectTrigger {...c} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ARTICLE_CATEGORY_LABEL) as Article["category"][]).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {ARTICLE_CATEGORY_LABEL[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field label="Destinasi terkait" optional description="Artikel tampil juga di halaman destinasi.">
                {(c) => (
                  <Select value={v.destinationId ?? NONE} onValueChange={(id) => set({ destinationId: id === NONE ? undefined : id })}>
                    <SelectTrigger {...c} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Tidak ada</SelectItem>
                      {Object.values(db.destinations).map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field label="Penulis">{(c) => <Input {...c} value={v.authorName} onChange={(e) => set({ authorName: e.target.value })} />}</Field>
              <Field label="Slug" description={`Alamat: /jurnal/${v.slug || "…"}`}>
                {(c) => (
                  <Input
                    {...c}
                    value={v.slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      set({ slug: e.target.value })
                    }}
                  />
                )}
              </Field>
              <Field label="Foto sampul">{() => <PhotoField label="Foto sampul artikel" value={v.coverMediaId} onChange={(coverMediaId) => set({ coverMediaId })} groups={photoGroups} />}</Field>
            </div>
          </SectionCard>
        </aside>
      </div>

      {article && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Hapus draf artikel?"
          description={`"${article.title}" akan dihapus dari data demo browser ini.`}
          confirmLabel="Hapus draf"
          tone="destructive"
          pending={remove.pending}
          onConfirm={() => remove.run(user?.id ?? "", article.id)}
        />
      )}
    </div>
  )
}

function BlockEditor({ blocks, onChange, photoGroups }: { blocks: ArticleBlock[]; onChange: (blocks: ArticleBlock[]) => void; photoGroups: { tag: string; label: string }[] }) {
  const update = (index: number, block: ArticleBlock) => onChange(blocks.map((b, i) => (i === index ? block : b)))
  const move = (index: number, delta: number) => {
    const next = [...blocks]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    onChange(next)
  }
  return (
    <div className="grid gap-3">
      {blocks.length === 0 && <p className="text-sm text-muted-foreground">Belum ada isi. Tambahkan blok di bawah.</p>}
      {blocks.map((block, index) => {
        const meta = BLOCK_TYPES.find((t) => t.type === block.type)!
        const label = `${meta.label.toLowerCase()} ${index + 1}`
        return (
          <div key={index} className="group rounded-md border border-line p-3 focus-within:border-ocean-800/40">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                <meta.icon className="size-3.5" aria-hidden="true" /> {meta.label}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Naikkan ${label}`}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon-sm" disabled={index === blocks.length - 1} onClick={() => move(index, 1)} aria-label={`Turunkan ${label}`}>
                  <ArrowDown />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onChange(blocks.filter((_, i) => i !== index))} aria-label={`Hapus ${label}`}>
                  <X />
                </Button>
              </div>
            </div>
            {block.type === "paragraph" && (
              <Textarea aria-label={`Isi ${label}`} rows={4} value={block.text} onChange={(e) => update(index, { ...block, text: e.target.value })} className="leading-relaxed" />
            )}
            {block.type === "heading" && <Input aria-label={`Isi ${label}`} value={block.text} onChange={(e) => update(index, { ...block, text: e.target.value })} className="font-semibold" />}
            {block.type === "quote" && (
              <Textarea aria-label={`Isi ${label}`} rows={2} value={block.text} onChange={(e) => update(index, { ...block, text: e.target.value })} className="italic" />
            )}
            {block.type === "list" && (
              <ListTextarea value={block.items} onChange={(items) => update(index, { ...block, items })} rows={4} placeholder="Satu butir per baris" control={{ id: `blok-${index}`, "aria-invalid": undefined, "aria-describedby": undefined }} />
            )}
            {block.type === "image" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <PhotoField label={`Foto untuk ${label}`} value={block.mediaId} onChange={(mediaId) => update(index, { ...block, mediaId })} groups={photoGroups} aspect="aspect-[3/2]" />
                <Input aria-label={`Keterangan ${label}`} value={block.caption ?? ""} onChange={(e) => update(index, { ...block, caption: e.target.value })} placeholder="Keterangan foto (opsional)" />
              </div>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Tambah blok">
        {BLOCK_TYPES.map(({ type, label, icon: Icon, blank }) => (
          <Button key={type} variant="secondary" size="sm" onClick={() => onChange([...blocks, structuredClone(blank)])} className={cn(type === "paragraph" && "font-semibold")}>
            <Icon aria-hidden="true" /> {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
