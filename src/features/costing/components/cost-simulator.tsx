"use client"

import { useId, useState } from "react"
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react"
import { formatIDR, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CostCategory, CostItem } from "@/domain/entities"
import { COST_CATEGORY_LABEL } from "@/domain/labels"
import { breakEvenParticipants, costByCategory, costTotals, profitAt } from "@/domain/rules/costing"
import { useCommand } from "@/hooks/use-command"
import { usePersona } from "@/hooks/use-persona"
import { ChartFrame, ChartTable } from "@/components/dashboard/charts/chart-frame"
import { CHART } from "@/components/dashboard/charts/chart-theme"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { SimulatedTag } from "@/components/shared/demo-notice"
import { MoneyInput } from "@/components/shared/money-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { costingCommands, type CostItemInput } from "@/services/costing-service"
import type { CostingSource } from "@/services/queries/costing"
import { CostBreakdownChart, RevenueCostChart } from "./costing-charts"

const CATEGORIES = Object.keys(COST_CATEGORY_LABEL) as CostCategory[]

type DraftLine = CostItemInput & { key: string }

const toDraft = (items: CostItem[]): DraftLine[] =>
  items.map((item) => ({ key: item.id, id: item.id, category: item.category, label: item.label, basis: item.basis, unitCost: item.unitCost, quantity: item.quantity, vendorId: item.vendorId }))

const signature = (lines: CostItemInput[]) => JSON.stringify(lines.map(({ id, category, label, basis, unitCost, quantity }) => [id, category, label.trim(), basis, unitCost, quantity]))

/**
 * What-if costing (docs/domain-model.md §6.10). Participants and price are simulation only;
 * cost lines can be saved back as the departure's (or template's) estimate.
 */
export function CostSimulator({ source }: { source: CostingSource }) {
  const { user } = usePersona()
  // The draft restarts whenever the saved lines change (after saving, or from another tab).
  const savedKey = source.items.map((item) => `${item.id}@${item.updatedAt}`).join()
  const [draft, setDraft] = useState({ savedKey, lines: toDraft(source.items) })
  if (draft.savedKey !== savedKey) setDraft({ savedKey, lines: toDraft(source.items) })
  const lines = draft.lines
  const setLines = (next: (prev: DraftLine[]) => DraftLine[]) => setDraft((d) => ({ ...d, lines: next(d.lines) }))
  const [participants, setParticipants] = useState(source.defaultParticipants)
  const [manualPrice, setManualPrice] = useState<number | null>(null)
  const save = useCommand(costingCommands.save, { success: "Komponen biaya disimpan sebagai estimasi" })
  const sliderId = useId()

  const price = manualPrice ?? source.priceFor(participants) ?? 0
  const totals = costTotals(lines)
  const result = profitAt({ ...totals, pricePerPax: price, participants })
  const breakEven = breakEvenParticipants({ ...totals, pricePerPax: price })
  const byCategory = costByCategory(lines, participants)
  const categoryRows = CATEGORIES.map((c) => ({ label: COST_CATEGORY_LABEL[c], amount: byCategory[c] })).filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount)
  const dirty = signature(lines) !== signature(toDraft(source.items))
  const max = Math.max(source.maxParticipants, participants)
  const table = Array.from({ length: max }, (_, i) => {
    const r = profitAt({ ...totals, pricePerPax: price, participants: i + 1 })
    return [i + 1, formatIDR(r.revenue), formatIDR(r.hpp), formatIDR(r.profit)]
  })

  const update = (key: string, patch: Partial<DraftLine>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const top = categoryRows[0]
  const loss = result.profit < 0

  return (
    <div className="grid gap-6">
      <SectionCard
        title={
          <span className="inline-flex items-center gap-2">
            Simulasi laba kotor <SimulatedTag />
          </span>
        }
        description="Geser jumlah peserta dan ubah harga jual untuk melihat dampaknya. Angka simulasi tidak disimpan dan tidak mengubah harga di website."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor={sliderId} className="text-sm font-medium">
                Jumlah peserta
              </label>
              <span className="text-lg font-semibold text-text-strong">{participants} pax</span>
            </div>
            <input
              id={sliderId}
              type="range"
              min={1}
              max={max}
              value={participants}
              onChange={(e) => setParticipants(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-ocean-800"
              aria-valuetext={`${participants} peserta`}
            />
            <p className="flex justify-between text-xs text-text-subtle">
              <span>1</span>
              <span>{source.departure ? `kapasitas ${source.departure.capacity}` : `grup ${source.pkg.groupSize.min}–${source.pkg.groupSize.max}`}</span>
            </p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor={`${sliderId}-price`}>
              Harga jual per peserta
            </label>
            <MoneyInput id={`${sliderId}-price`} value={price} onChange={(v) => setManualPrice(v)} />
            <p className="flex items-center justify-between gap-2 text-xs text-text-subtle">
              <span>{manualPrice === null ? (source.pkg.pricing.kind === "tiered" ? "Mengikuti harga tingkat grup" : "Harga keberangkatan saat ini") : "Harga simulasi"}</span>
              {manualPrice !== null && (
                <button type="button" className="font-semibold text-lagoon-700 hover:underline" onClick={() => setManualPrice(null)}>
                  Pakai harga paket
                </button>
              )}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "HPP total", value: formatIDR(result.hpp), hint: `tetap ${formatIDR(totals.fixed)} + ${formatIDR(totals.perPax)}/pax` },
            { label: "HPP per peserta", value: result.hppPerPax === null ? "—" : formatIDR(result.hppPerPax), hint: `harga jual ${formatIDR(price)}` },
            { label: "Pendapatan", value: formatIDR(result.revenue), hint: `${participants} × ${formatIDR(price)}` },
            {
              label: "Laba kotor (simulasi)",
              value: formatIDR(result.profit),
              hint: loss ? "Rugi pada jumlah peserta ini" : "Sebelum overhead dan pajak",
              danger: loss,
            },
            { label: "Margin", value: result.margin === null ? "—" : formatPercent(result.margin), hint: "laba ÷ pendapatan", danger: loss },
            { label: "Markup", value: result.markup === null ? "—" : formatPercent(result.markup), hint: "laba ÷ HPP", danger: loss },
            {
              label: "Titik impas",
              value: breakEven === null ? "Tidak tercapai" : `${breakEven} pax`,
              hint: breakEven === null ? "Harga jual tidak menutup biaya per peserta" : breakEven > max ? "Melebihi kapasitas" : participants >= breakEven ? "Sudah terlewati" : `Kurang ${breakEven - participants} peserta`,
              danger: breakEven === null || breakEven > max,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-md bg-canvas px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className={cn("mt-0.5 text-base font-semibold text-text-strong", item.danger && "text-tone-danger")}>{item.value}</dd>
              <dd className="text-[0.6875rem] text-text-subtle">{item.hint}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 grid gap-8 xl:grid-cols-5">
          <div className="min-w-0 xl:col-span-3">
            <h3 className="mb-2 text-sm font-semibold text-text-strong">Pendapatan dan HPP per jumlah peserta</h3>
            <ChartFrame
              legend={[
                { label: "Pendapatan", color: CHART.series[0], shape: "line" },
                { label: "HPP", color: CHART.series[1], shape: "line" },
              ]}
              summary={
                breakEven === null
                  ? `Harga ${formatIDR(price)} tidak menutup biaya per peserta ${formatIDR(totals.perPax)}, jadi garis pendapatan tidak pernah melewati HPP.`
                  : `Pendapatan melewati HPP di ${breakEven} peserta. Pada ${participants} peserta laba kotor ${formatIDR(result.profit)}${result.margin !== null ? ` (margin ${formatPercent(result.margin)})` : ""}.`
              }
              table={<ChartTable head={["Peserta", "Pendapatan", "HPP", "Laba kotor"]} align={["left", "right", "right", "right"]} rows={table} />}
            >
              <RevenueCostChart fixed={totals.fixed} perPax={totals.perPax} price={price} max={max} current={participants} breakEven={breakEven} />
            </ChartFrame>
          </div>
          <div className="min-w-0 xl:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-text-strong">Komposisi HPP pada {participants} peserta</h3>
            {categoryRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada komponen biaya.</p>
            ) : (
              <ChartFrame
                summary={top && result.hpp > 0 ? `${top.label} komponen terbesar: ${formatIDR(top.amount)} atau ${formatPercent(top.amount / result.hpp, 0)} dari HPP.` : ""}
                table={
                  <ChartTable
                    head={["Kategori", "Biaya", "Porsi"]}
                    align={["left", "right", "right"]}
                    rows={categoryRows.map((r) => [r.label, formatIDR(r.amount), result.hpp > 0 ? formatPercent(r.amount / result.hpp, 0) : "—"])}
                  />
                }
              >
                <CostBreakdownChart rows={categoryRows} />
              </ChartFrame>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Komponen biaya"
        description={
          source.owner.type === "package"
            ? "Template ini disalin ke setiap keberangkatan baru. Keberangkatan yang sudah ada tidak berubah."
            : "Estimasi biaya khusus keberangkatan ini, disalin dari template paket saat jadwal dibuat."
        }
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLines((prev) => [...prev, { key: `new-${Date.now()}`, category: "other", label: "", basis: "fixed", unitCost: 0, quantity: 1 }])}
          >
            <Plus aria-hidden="true" /> Tambah
          </Button>
        }
        bodyClassName="p-0"
      >
        <div className="hidden grid-cols-[9rem_minmax(0,1fr)_9rem_9rem_5rem_8rem_2.25rem] gap-2 border-b border-line bg-canvas/70 px-5 py-2 text-xs font-semibold text-text-muted lg:grid">
          <span>Kategori</span>
          <span>Komponen</span>
          <span>Dasar</span>
          <span>Biaya satuan</span>
          <span>Jumlah</span>
          <span className="text-right">Subtotal</span>
          <span className="sr-only">Hapus</span>
        </div>
        <ul className="divide-y divide-line">
          {lines.map((line, index) => {
            const subtotal = line.unitCost * line.quantity * (line.basis === "per_pax" ? participants : 1)
            const n = index + 1
            return (
              <li key={line.key} className="grid grid-cols-2 gap-2 px-5 py-3 lg:grid-cols-[9rem_minmax(0,1fr)_9rem_9rem_5rem_8rem_2.25rem] lg:items-center">
                <Select value={line.category} onValueChange={(category) => update(line.key, { category: category as CostCategory })}>
                  <SelectTrigger aria-label={`Kategori baris ${n}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {COST_CATEGORY_LABEL[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input aria-label={`Nama komponen baris ${n}`} value={line.label} onChange={(e) => update(line.key, { label: e.target.value })} placeholder="Contoh: Sewa kapal" className="col-span-2 lg:col-span-1 max-lg:order-first" aria-invalid={!line.label.trim() || undefined} />
                <Select value={line.basis} onValueChange={(basis) => update(line.key, { basis: basis as CostItem["basis"] })}>
                  <SelectTrigger aria-label={`Dasar biaya baris ${n}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Tetap / trip</SelectItem>
                    <SelectItem value="per_pax">Per peserta</SelectItem>
                  </SelectContent>
                </Select>
                <MoneyInput aria-label={`Biaya satuan baris ${n}`} value={line.unitCost} onChange={(unitCost) => update(line.key, { unitCost })} />
                <Input aria-label={`Jumlah baris ${n}`} type="number" min={1} value={line.quantity} onChange={(e) => update(line.key, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                <p className="self-center text-right text-sm font-medium text-text-strong tabular-nums">
                  {formatIDR(subtotal)}
                  {line.basis === "per_pax" && <span className="block text-[0.6875rem] font-normal text-text-subtle">× {participants} pax</span>}
                </p>
                <Button variant="ghost" size="icon-sm" className="justify-self-end" aria-label={`Hapus baris ${n}`} onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}>
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-sm text-text-muted">
            Biaya tetap <span className="font-semibold text-text-strong tabular-nums">{formatIDR(totals.fixed)}</span> · biaya per peserta{" "}
            <span className="font-semibold text-text-strong tabular-nums">{formatIDR(totals.perPax)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" disabled={!dirty || save.pending} onClick={() => setLines(() => toDraft(source.items))}>
              <RotateCcw aria-hidden="true" /> Kembalikan
            </Button>
            <PermissionButton permission="costing.manage" disabled={!dirty || save.pending} onClick={() => save.run(user?.id ?? "", source.owner, lines.map(({ key: _key, ...line }) => line))}>
              <Save aria-hidden="true" /> Simpan sebagai estimasi
            </PermissionButton>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
