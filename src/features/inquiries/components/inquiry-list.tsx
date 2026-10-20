"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Inbox, KanbanSquare, List } from "lucide-react"
import { toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatIDRCompact } from "@/lib/format"
import type { InquiryType, PipelineStage } from "@/domain/entities"
import { INQUIRY_TYPE_LABEL, PIPELINE_STAGE_LABEL, SOURCE_LABEL } from "@/domain/labels"
import { PIPELINE_STAGES } from "@/domain/rules/inquiry-pipeline"
import type { Source } from "@/domain/types/common"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { useUrlSearchInput } from "@/hooks/use-url-search-input"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { FilterBar, FilterSelect, SearchField, ViewToggle } from "@/components/dashboard/filters"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { EmptyState } from "@/components/shared/states"
import { StatusBadge } from "@/components/shared/status-badge"
import { useUiStore } from "@/stores/ui-store"
import { inquiryRows, matchesInquirySearch, type InquiryRow } from "@/services/queries/inquiries"
import { STAGE_TONE } from "../labels"
import { InquiryBoard } from "./inquiry-board"
import { ManualInquirySheet } from "./manual-inquiry-sheet"
import { useStageMover } from "./stage-mover"

const KEYS = ["view", "q", "tahap", "jenis", "sumber", "pj"] as const
const UNASSIGNED = "belum"

function columns(today: string): Column<InquiryRow>[] {
  return [
    {
      key: "lead",
      header: "Lead",
      sortValue: (r) => r.inquiry.createdAt,
      cell: (r) => (
        <div className="min-w-0">
          <Link href={`/dashboard/inquiries/${r.inquiry.id}`} className="block max-w-48 truncate font-semibold text-text-strong hover:underline">
            {r.inquiry.contactSnapshot.fullName}
          </Link>
          <p className="text-xs whitespace-nowrap text-text-subtle">
            {r.inquiry.code} · {formatDate(toDateOnlyWIB(r.inquiry.createdAt), "day-month")}
          </p>
        </div>
      ),
    },
    {
      key: "need",
      header: "Kebutuhan",
      cell: (r) => (
        <div className="max-w-64">
          <p className="truncate text-text-strong">{r.pkg?.title ?? (r.destinations.map((d) => d.name).join(", ") || "Pertanyaan umum")}</p>
          <p className="text-xs text-text-subtle">
            {INQUIRY_TYPE_LABEL[r.inquiry.type]} · {r.inquiry.groupSize} orang
          </p>
        </div>
      ),
    },
    { key: "estimate", header: "Estimasi", align: "right", sortValue: (r) => r.estimate ?? 0, cell: (r) => <span className="whitespace-nowrap">{r.estimate === null ? "—" : formatIDRCompact(r.estimate)}</span> },
    {
      key: "stage",
      header: "Tahap",
      sortValue: (r) => PIPELINE_STAGES.indexOf(r.inquiry.stage),
      cell: (r) => <StatusBadge tone={STAGE_TONE[r.inquiry.stage]}>{PIPELINE_STAGE_LABEL[r.inquiry.stage]}</StatusBadge>,
    },
    {
      key: "followup",
      header: "Follow-up",
      sortValue: (r) => r.inquiry.nextFollowUpDate ?? "9999",
      cell: (r) =>
        r.inquiry.nextFollowUpDate && r.inquiry.stage !== "won" && r.inquiry.stage !== "lost" ? (
          <span className={r.followUpOverdue ? "font-semibold whitespace-nowrap text-tone-danger" : r.inquiry.nextFollowUpDate === today ? "font-semibold whitespace-nowrap text-tone-warning" : "whitespace-nowrap"}>
            {formatDate(r.inquiry.nextFollowUpDate, "day-month")}
          </span>
        ) : (
          <span className="text-text-subtle">—</span>
        ),
    },
    { key: "assignee", header: "Penanggung jawab", wide: true, sortValue: (r) => r.assignee?.name ?? "", cell: (r) => <span className="whitespace-nowrap">{r.assignee?.name ?? <span className="text-text-subtle">Belum ada</span>}</span> },
    { key: "source", header: "Sumber", wide: true, sortValue: (r) => r.inquiry.source, cell: (r) => <span className="whitespace-nowrap text-text-muted">{SOURCE_LABEL[r.inquiry.source]}</span> },
  ]
}

export function InquiryList() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const savedView = useUiStore((state) => state.views.inquiries)
  const setView = useUiStore((state) => state.setView)
  const search = useUrlSearchInput(query.q, (q) => setQuery({ q }))
  const mover = useStageMover(live?.today ?? "")
  const view = (query.view || savedView || "board") === "list" ? "list" : "board"

  const rows = useMemo(() => (live ? inquiryRows(live.db, live.today) : []), [live])
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (query.tahap && r.inquiry.stage !== query.tahap) return false
        if (query.jenis && r.inquiry.type !== query.jenis) return false
        if (query.sumber && r.inquiry.source !== query.sumber) return false
        if (query.pj && (query.pj === UNASSIGNED ? !!r.inquiry.assigneeId : r.inquiry.assigneeId !== query.pj)) return false
        return matchesInquirySearch(r, search.value.trim())
      }),
    [rows, query, search.value],
  )

  if (!live) return <PageSkeleton />
  const { db, today } = live
  const sales = Object.values(db.users).filter((u) => u.status === "active" && db.roles[u.roleId]?.permissions.includes("inquiries.manage"))
  const active = Boolean(query.tahap || query.jenis || query.sumber || query.pj || search.value)

  return (
    <div>
      <PageHeader
        title="Inquiry & Leads"
        description="Permintaan private trip, custom trip, dan pertanyaan umum dari semua kanal, dari Baru sampai Berhasil atau Gagal."
        actions={
          <>
            <ViewToggle
              label="Tampilan"
              value={view}
              onChange={(next) => {
                setView("inquiries", next)
                setQuery({ view: next })
              }}
              options={[
                { value: "board", label: "Papan", icon: KanbanSquare },
                { value: "list", label: "Tabel", icon: List },
              ]}
            />
            <ManualInquirySheet db={db} today={today} />
          </>
        }
      />

      <FilterBar
        active={active}
        onReset={() => {
          search.reset()
          setQuery({ q: null, tahap: null, jenis: null, sumber: null, pj: null })
        }}
      >
        <SearchField value={search.value} onChange={search.setValue} placeholder="Cari nama, kode, paket…" />
        {view === "list" && (
          <FilterSelect
            label="Tahap"
            value={query.tahap}
            onChange={(tahap) => setQuery({ tahap })}
            allLabel="Semua tahap"
            options={PIPELINE_STAGES.map((s: PipelineStage) => ({ value: s, label: PIPELINE_STAGE_LABEL[s] }))}
          />
        )}
        <FilterSelect
          label="Jenis"
          value={query.jenis}
          onChange={(jenis) => setQuery({ jenis })}
          allLabel="Semua jenis"
          options={(Object.keys(INQUIRY_TYPE_LABEL) as InquiryType[]).map((t) => ({ value: t, label: INQUIRY_TYPE_LABEL[t] }))}
        />
        <FilterSelect
          label="Sumber"
          value={query.sumber}
          onChange={(sumber) => setQuery({ sumber })}
          allLabel="Semua sumber"
          options={(Object.keys(SOURCE_LABEL) as Source[]).map((s) => ({ value: s, label: SOURCE_LABEL[s] }))}
        />
        <FilterSelect
          label="Penanggung jawab"
          value={query.pj}
          onChange={(pj) => setQuery({ pj })}
          allLabel="Semua penanggung jawab"
          options={[{ value: UNASSIGNED, label: "Belum ditugaskan" }, ...sales.map((u) => ({ value: u.id, label: u.name }))]}
        />
      </FilterBar>

      {view === "board" ? (
        <InquiryBoard rows={filtered} today={today} onMove={(row, to) => mover.request(row.inquiry, to, row.quotations)} />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns(today)}
          caption="Daftar inquiry"
          getRowKey={(r) => r.inquiry.id}
          getRowHref={(r) => `/dashboard/inquiries/${r.inquiry.id}`}
          defaultSort={{ key: "lead", dir: "desc" }}
          empty={<EmptyState icon={Inbox} title="Tidak ada inquiry yang cocok" description="Ubah filter atau kata kunci pencarian." />}
          renderCard={(r) => (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-text-strong">{r.inquiry.contactSnapshot.fullName}</p>
                  <p className="text-xs text-text-subtle">
                    {r.inquiry.code} · {INQUIRY_TYPE_LABEL[r.inquiry.type]} · {r.inquiry.groupSize} orang
                  </p>
                </div>
                <StatusBadge tone={STAGE_TONE[r.inquiry.stage]}>{PIPELINE_STAGE_LABEL[r.inquiry.stage]}</StatusBadge>
              </div>
              <p className="mt-2 truncate text-sm">{r.pkg?.title ?? r.destinations.map((d) => d.name).join(", ")}</p>
            </div>
          )}
        />
      )}
      {mover.dialog}
    </div>
  )
}
