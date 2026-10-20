"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Newspaper, Plus } from "lucide-react"
import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import type { Article } from "@/domain/entities"
import { ARTICLE_CATEGORY_LABEL } from "@/domain/labels"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, SearchField } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SmartImage } from "@/components/shared/smart-image"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"

const KEYS = ["q", "status", "kategori"] as const
export const ARTICLE_STATUS_LABEL: Record<Article["status"], string> = { published: "Terbit", draft: "Draf" }

interface Row {
  article: Article
  destination?: string
}

const columns: Column<Row>[] = [
  {
    key: "title",
    header: "Artikel",
    sortValue: (r) => r.article.title,
    cell: (r) => (
      <div className="flex items-center gap-3">
        <div className="relative hidden h-10 w-14 shrink-0 overflow-hidden rounded bg-muted sm:block">{r.article.coverMediaId && <SmartImage mediaId={r.article.coverMediaId} fill sizes="56px" alt="" />}</div>
        <div className="min-w-0 max-w-96">
          <Link href={`/dashboard/articles/${r.article.id}`} className="block truncate font-semibold text-text-strong hover:underline">
            {r.article.title}
          </Link>
          <p className="truncate text-xs text-text-subtle">/jurnal/{r.article.slug}</p>
        </div>
      </div>
    ),
  },
  { key: "category", header: "Kategori", sortValue: (r) => r.article.category, cell: (r) => ARTICLE_CATEGORY_LABEL[r.article.category] },
  { key: "destination", header: "Destinasi", wide: true, sortValue: (r) => r.destination ?? "", cell: (r) => <span className="text-text-muted">{r.destination ?? "—"}</span> },
  {
    key: "status",
    header: "Status",
    sortValue: (r) => r.article.status,
    cell: (r) => <StatusBadge tone={r.article.status === "published" ? "success" : "neutral"}>{ARTICLE_STATUS_LABEL[r.article.status]}</StatusBadge>,
  },
  {
    key: "updated",
    header: "Diperbarui",
    sortValue: (r) => r.article.updatedAt,
    cell: (r) => <span className="whitespace-nowrap text-text-muted">{formatDate(toDateOnlyWIB(r.article.updatedAt))}</span>,
  },
]

export function ArticleList() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))
  const rows = useMemo(
    () => (live ? Object.values(live.db.articles).map((article) => ({ article, destination: article.destinationId ? live.db.destinations[article.destinationId]?.name : undefined })) : []),
    [live],
  )
  const filtered = useMemo(() => {
    const term = search.value.trim().toLowerCase()
    return rows.filter((r) => {
      if (query.status && r.article.status !== query.status) return false
      if (query.kategori && r.article.category !== query.kategori) return false
      return !term || `${r.article.title} ${r.article.excerpt} ${r.destination ?? ""}`.toLowerCase().includes(term)
    })
  }, [rows, query.status, query.kategori, search.value])

  if (!live) return <PageSkeleton />

  return (
    <div>
      <PageHeader
        title="Artikel"
        description="Jurnal di website publik. Artikel baru dibuat sebagai draf dan tampil setelah dipublikasikan."
        actions={
          <PermissionButton permission="content.manage" asChild>
            <Link href="/dashboard/articles/new">
              <Plus aria-hidden="true" /> Artikel baru
            </Link>
          </PermissionButton>
        }
      />
      <FilterBar
        active={Boolean(query.status || query.kategori || search.value)}
        onReset={() => {
          search.reset()
          setQuery({ q: null, status: null, kategori: null })
        }}
      >
        <SearchField value={search.value} onChange={search.setValue} placeholder="Cari judul, ringkasan, destinasi…" />
        <FilterSelect
          label="Status"
          value={query.status}
          onChange={(status) => setQuery({ status })}
          allLabel="Semua status"
          options={(Object.keys(ARTICLE_STATUS_LABEL) as Article["status"][]).map((s) => ({ value: s, label: ARTICLE_STATUS_LABEL[s] }))}
        />
        <FilterSelect
          label="Kategori"
          value={query.kategori}
          onChange={(kategori) => setQuery({ kategori })}
          allLabel="Semua kategori"
          options={(Object.keys(ARTICLE_CATEGORY_LABEL) as Article["category"][]).map((c) => ({ value: c, label: ARTICLE_CATEGORY_LABEL[c] }))}
        />
      </FilterBar>
      <DataTable
        rows={filtered}
        columns={columns}
        caption="Daftar artikel"
        getRowKey={(r) => r.article.id}
        getRowHref={(r) => `/dashboard/articles/${r.article.id}`}
        defaultSort={{ key: "updated", dir: "desc" }}
        empty={<EmptyState icon={Newspaper} title="Tidak ada artikel yang cocok" description="Ubah filter atau tulis artikel baru." />}
        renderCard={(r) => (
          <div>
            <p className="font-semibold text-text-strong">{r.article.title}</p>
            <p className="mt-1 text-xs text-text-subtle">
              {ARTICLE_CATEGORY_LABEL[r.article.category]}
              {r.destination && ` · ${r.destination}`}
            </p>
            <StatusBadge className="mt-2" tone={r.article.status === "published" ? "success" : "neutral"}>
              {ARTICLE_STATUS_LABEL[r.article.status]}
            </StatusBadge>
          </div>
        )}
      />
    </div>
  )
}
