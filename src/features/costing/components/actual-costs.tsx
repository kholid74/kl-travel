"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { formatIDR, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CostItem, Departure } from "@/domain/entities"
import { COST_CATEGORY_LABEL } from "@/domain/labels"
import type { DepartureEstimate, DepartureRealized } from "@/domain/rules/metrics"
import { useCommand } from "@/hooks/use-command"
import { usePersona } from "@/hooks/use-persona"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { MoneyInput } from "@/components/shared/money-input"
import { StatusBadge } from "@/components/shared/status-badge"
import { costingCommands } from "@/services/costing-service"

/**
 * Estimated against actual spend for a trip that has run. Realised profit appears only
 * once every line has an actual amount and the trip is closed; otherwise it says why not.
 */
export function ActualCosts({ departure, items, estimate, realized }: { departure: Departure; items: CostItem[]; estimate: DepartureEstimate; realized: DepartureRealized }) {
  const { user } = usePersona()
  const savedKey = items.map((i) => `${i.id}@${i.updatedAt}`).join()
  const [draft, setDraft] = useState({ savedKey, values: Object.fromEntries(items.map((i) => [i.id, i.actualAmount ?? null])) as Record<string, number | null> })
  if (draft.savedKey !== savedKey) setDraft({ savedKey, values: Object.fromEntries(items.map((i) => [i.id, i.actualAmount ?? null])) })
  const save = useCommand(costingCommands.recordActuals, { success: (r) => `Biaya aktual disimpan (${r.filled}/${r.total} komponen)` })
  const pax = realized.pax || estimate.pax
  const planned = (item: CostItem) => item.unitCost * item.quantity * (item.basis === "per_pax" ? pax : 1)
  const dirty = items.some((i) => (i.actualAmount ?? null) !== draft.values[i.id])
  const plannedTotal = items.reduce((sum, i) => sum + planned(i), 0)
  const actualTotal = items.reduce((sum, i) => sum + (draft.values[i.id] ?? 0), 0)

  return (
    <SectionCard
      title="Estimasi vs realisasi"
      description={`Biaya rencana dihitung pada ${pax} peserta yang berangkat. Isi biaya aktual dari nota vendor setelah trip berjalan.`}
      action={<StatusBadge tone={realized.profit === null ? "neutral" : "success"}>{realized.profit === null ? "Realisasi belum lengkap" : "Realisasi"}</StatusBadge>}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-table">
          <caption className="sr-only">Biaya rencana dan aktual per komponen</caption>
          <thead className="bg-canvas/70">
            <tr className="border-b border-line text-left text-xs text-text-muted">
              <th className="px-5 py-2 font-semibold">Komponen</th>
              <th className="px-3 py-2 text-right font-semibold">Rencana</th>
              <th className="w-44 px-3 py-2 font-semibold">Aktual</th>
              <th className="px-5 py-2 text-right font-semibold">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const actual = draft.values[item.id]
              const diff = actual === null ? null : actual - planned(item)
              return (
                <tr key={item.id} className="border-b border-line">
                  <td className="px-5 py-2">
                    <p className="font-medium text-text-strong">{item.label}</p>
                    <p className="text-xs text-text-subtle">{COST_CATEGORY_LABEL[item.category]}</p>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatIDR(planned(item))}</td>
                  <td className="px-3 py-2">
                    <MoneyInput
                      aria-label={`Biaya aktual ${item.label}`}
                      value={actual ?? 0}
                      placeholder="Belum diisi"
                      onChange={(value) => setDraft((d) => ({ ...d, values: { ...d.values, [item.id]: value || null } }))}
                      className="h-8"
                    />
                  </td>
                  <td className={cn("px-5 py-2 text-right whitespace-nowrap tabular-nums", diff !== null && diff > 0 && "text-tone-danger")}>
                    {diff === null ? <span className="text-text-subtle">—</span> : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatIDR(Math.abs(diff))}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-5 py-2">Total</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatIDR(plannedTotal)}</td>
              <td className="px-3 py-2 tabular-nums">{formatIDR(actualTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid gap-4 border-t border-line px-5 py-4 md:grid-cols-2">
        <dl className="grid grid-cols-2 gap-y-1 rounded-md bg-canvas px-4 py-3 text-sm">
          <dt className="col-span-2 mb-1 text-xs font-semibold text-text-muted">Estimasi (biaya rencana)</dt>
          <dt className="text-muted-foreground">Pendapatan</dt>
          <dd className="text-right tabular-nums">{formatIDR(estimate.revenue)}</dd>
          <dt className="text-muted-foreground">HPP rencana</dt>
          <dd className="text-right tabular-nums">{formatIDR(estimate.cost)}</dd>
          <dt className="font-semibold">Laba kotor estimasi</dt>
          <dd className={cn("text-right font-semibold tabular-nums", estimate.profit < 0 && "text-tone-danger")}>{formatIDR(estimate.profit)}</dd>
        </dl>
        <dl className="grid grid-cols-2 gap-y-1 rounded-md bg-canvas px-4 py-3 text-sm">
          <dt className="col-span-2 mb-1 text-xs font-semibold text-text-muted">Realisasi (biaya aktual)</dt>
          <dt className="text-muted-foreground">Pendapatan</dt>
          <dd className="text-right tabular-nums">
            {formatIDR(realized.revenue)}
            {realized.retained > 0 && <span className="block text-[0.6875rem] text-text-subtle">termasuk biaya pembatalan {formatIDR(realized.retained)}</span>}
          </dd>
          <dt className="text-muted-foreground">HPP aktual</dt>
          <dd className="text-right tabular-nums">
            {realized.filledLines}/{realized.costLines} terisi · {formatIDR(realized.actualCost)}
          </dd>
          <dt className="font-semibold">Laba kotor realisasi</dt>
          <dd className={cn("text-right font-semibold", realized.profit !== null && realized.profit < 0 && "text-tone-danger")}>
            {realized.profit === null ? (
              <span className="text-text-muted">Belum dapat dihitung</span>
            ) : (
              <span className="tabular-nums">
                {formatIDR(realized.profit)}
                {realized.margin !== null && <span className="block text-[0.6875rem] font-normal text-text-subtle">margin {formatPercent(realized.margin)}</span>}
              </span>
            )}
          </dd>
          {realized.pendingReason && <dd className="col-span-2 mt-1 text-xs text-text-subtle">{realized.pendingReason}.</dd>}
        </dl>
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <PermissionButton
          permission="costing.manage"
          disabled={!dirty || save.pending}
          onClick={() => save.run(user?.id ?? "", departure.id, Object.entries(draft.values).map(([id, actualAmount]) => ({ id, actualAmount })))}
        >
          <Save aria-hidden="true" /> Simpan biaya aktual
        </PermissionButton>
      </div>
    </SectionCard>
  )
}
