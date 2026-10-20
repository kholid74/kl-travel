"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { AlertTriangle, Calculator, Check, Lock, NotebookPen, Plus, Printer, X } from "lucide-react"
import { rangesOverlap } from "@/lib/dates"
import { formatDateRange, formatDateTime, formatPhone, formatRelativeDay } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChecklistItem, Departure, Vendor } from "@/domain/entities"
import { READINESS_LABEL, VENDOR_ASSIGNMENT_STATUS_LABEL, VENDOR_CATEGORY_LABEL } from "@/domain/labels"
import { checklistBlocker, type ChecklistContext } from "@/domain/rules/trip-readiness"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { Field } from "@/components/shared/field"
import { StatusBadge, type Tone } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { READINESS_TONE } from "@/features/packages/labels"
import { departureCommands } from "@/services/departure-service"
import { operationsCommands } from "@/services/operations-service"
import { manifestRows, operationsRow, type OperationsRow } from "@/services/queries/operations"
import { ManifestTable } from "./manifest-table"
import { ProgressBar } from "./progress-bar"

const NONE = "__tanpa"
const VENDOR_TONE: Record<string, Tone> = { requested: "info", confirmed: "success", cancelled: "neutral" }

/** Must sit inside <Suspense>: the id is only known at request time. */
export function OperationsDetailRoute() {
  const { departureId } = useParams<{ departureId: string }>()
  return <OperationsDetail id={departureId} />
}

function OperationsDetail({ id }: { id: string }) {
  const live = useLive()
  const data = useMemo(() => {
    if (!live) return undefined
    const departure = live.db.departures[id]
    if (!departure) return null
    return { row: operationsRow(live.db, departure, live.now, live.today), manifest: manifestRows(live.db, id) }
  }, [live, id])

  if (!live || data === undefined) return <PageSkeleton variant="detail" />
  if (!data) {
    return (
      <NotFoundPanel
        title="Keberangkatan tidak ditemukan"
        description="Keberangkatan ini tidak ada di data demo browser ini."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/operations">Kembali ke operasional</Link>
          </Button>
        }
      />
    )
  }

  const { db, today } = live
  const { row, manifest } = data
  const { departure, pkg, readiness, seats } = row
  const locked = departure.cancelledAt ? "Keberangkatan sudah dibatalkan." : null
  const incomplete = manifest.filter((m) => m.missing.length > 0).length

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard/operations", label: "Operasional Trip" }}
        title={pkg?.title ?? departure.code}
        meta={
          <>
            <StatusBadge tone={READINESS_TONE[readiness.status]}>{READINESS_LABEL[readiness.status]}</StatusBadge>
            {readiness.atRisk && <StatusBadge tone="danger">Perlu perhatian</StatusBadge>}
          </>
        }
        description={`${formatDateRange(departure.startDate, departure.endDate)} · ${departure.code} · ${formatRelativeDay(departure.startDate, today).toLowerCase()} · ${seats.allocated} peserta terkonfirmasi`}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href={`/dashboard/departures/${departure.id}`}>Detail keberangkatan</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/dashboard/costing?departure=${departure.id}`}>
                <Calculator aria-hidden="true" /> HPP
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/print/manifest/${departure.id}`} target="_blank">
                <Printer aria-hidden="true" /> Cetak manifest
              </Link>
            </Button>
          </>
        }
      />

      {readiness.atRisk && (
        <div role="status" className="mb-6 flex gap-3 rounded-lg border border-tone-danger/30 bg-tone-danger-bg px-4 py-3 text-sm text-tone-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Trip ini perlu perhatian</p>
            <ul className="mt-0.5 list-disc pl-5">
              {readiness.riskReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <ChecklistPanel row={row} locked={locked} users={db.users} />
          <SectionCard
            title={`Manifest (${manifest.length} peserta)`}
            description={
              incomplete > 0
                ? `${incomplete} peserta belum lengkap. Lengkapi dari halaman booking.`
                : seats.held > 0
                  ? `${seats.held} kursi masih ditahan booking yang belum terkonfirmasi; belum masuk manifest.`
                  : "Hanya peserta dari booking terkonfirmasi."
            }
            bodyClassName="p-0"
          >
            <ManifestTable rows={manifest} ageOn={departure.startDate} />
          </SectionCard>
        </div>
        <aside className="min-w-0 space-y-6">
          <GuidePanel departure={departure} destinationId={pkg?.destinationId} locked={locked} />
          <VendorPanel row={row} locked={locked} />
          <NotesPanel key={departure.notes ?? ""} departure={departure} locked={locked} />
        </aside>
      </div>
    </div>
  )
}

function ChecklistPanel({ row, locked, users }: { row: OperationsRow; locked: string | null; users: Record<string, { name: string }> }) {
  const { user } = usePersona()
  const [noteFor, setNoteFor] = useState<ChecklistItem["key"] | null>(null)
  const toggle = useCommand(operationsCommands.setChecklistItem, {
    success: (r) => (r.reopened.length ? `Checklist diperbarui; ${r.reopened.join(", ")} ikut dibuka kembali` : "Checklist diperbarui"),
  })
  const { departure, checklist, readiness, context } = row
  const items = checklist?.items ?? []

  return (
    <SectionCard
      title="Checklist operasional"
      description="Beberapa item baru bisa dicentang setelah syaratnya terpenuhi, misalnya vendor terkonfirmasi atau data peserta lengkap."
      action={
        <span className="text-sm font-semibold text-text-strong tabular-nums">
          {readiness.done}/{readiness.total}
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="px-5 pt-4">
        <ProgressBar value={readiness.progress} label="Progres checklist" tone={readiness.atRisk ? "danger" : readiness.status === "ready" ? "success" : "default"} />
      </div>
      <ul className="mt-2 divide-y divide-line">
        {items.map((item) => (
          <ChecklistRow
            key={`${item.key}:${item.note ?? ""}`}
            item={item}
            context={context}
            locked={locked}
            pending={toggle.pending}
            doneBy={item.doneBy ? users[item.doneBy]?.name : undefined}
            editingNote={noteFor === item.key}
            onEditNote={(open) => setNoteFor(open ? item.key : null)}
            onToggle={(done) => toggle.run(user?.id ?? "", departure.id, item.key, done)}
            departureId={departure.id}
          />
        ))}
      </ul>
    </SectionCard>
  )
}

function ChecklistRow({
  item,
  context,
  locked,
  pending,
  doneBy,
  editingNote,
  onEditNote,
  onToggle,
  departureId,
}: {
  item: ChecklistItem
  context: ChecklistContext
  locked: string | null
  pending: boolean
  doneBy?: string
  editingNote: boolean
  onEditNote: (open: boolean) => void
  onToggle: (done: boolean) => void
  departureId: string
}) {
  const { user, denial } = usePersona()
  const blocker = checklistBlocker(item.key, context)
  const reason = denial("operations.manage") ?? locked ?? (!item.done ? blocker : null)
  const stale = item.done && blocker
  const [note, setNote] = useState(item.note ?? "")
  const saveNote = useCommand(operationsCommands.setChecklistNote, { success: "Catatan disimpan", onSuccess: () => onEditNote(false) })
  const checkboxId = `check-${item.key}`

  const box = (
    <Checkbox
      id={checkboxId}
      checked={item.done}
      disabled={!!reason || pending}
      onCheckedChange={(checked) => onToggle(checked === true)}
      aria-describedby={blocker && !item.done ? `${checkboxId}-blocker` : undefined}
      className="mt-0.5"
    />
  )

  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        {reason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {box}
              </span>
            </TooltipTrigger>
            <TooltipContent>{reason}</TooltipContent>
          </Tooltip>
        ) : (
          box
        )}
        <div className="min-w-0 flex-1">
          <label htmlFor={checkboxId} className={cn("text-sm font-medium", item.done ? "text-text-strong" : reason ? "text-text-muted" : "text-text-strong")}>
            {item.label}
          </label>
          {item.done && item.doneAt && (
            <p className="text-xs text-text-subtle">
              Selesai {formatDateTime(item.doneAt)}
              {doneBy && ` oleh ${doneBy}`}
            </p>
          )}
          {!item.done && blocker && (
            <p id={`${checkboxId}-blocker`} className="mt-0.5 flex items-center gap-1 text-xs text-text-subtle">
              <Lock className="size-3" aria-hidden="true" /> {blocker}
            </p>
          )}
          {stale && <p className="mt-0.5 text-xs font-medium text-tone-warning">Perlu dicek ulang: {blocker}</p>}
          {item.note && !editingNote && <p className="mt-1 rounded bg-canvas px-2 py-1 text-xs text-text-muted">{item.note}</p>}
          {editingNote && (
            <form
              className="mt-2 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void saveNote.run(user?.id ?? "", departureId, item.key, note)
              }}
            >
              <Textarea aria-label={`Catatan ${item.label}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saveNote.pending}>
                  Simpan
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => onEditNote(false)}>
                  Batal
                </Button>
              </div>
            </form>
          )}
        </div>
        {!editingNote && !locked && (
          <PermissionButton permission="operations.manage" variant="ghost" size="icon-sm" aria-label={`Catatan untuk ${item.label}`} onClick={() => onEditNote(true)}>
            <NotebookPen />
          </PermissionButton>
        )}
      </div>
    </li>
  )
}

function GuidePanel({ departure, destinationId, locked }: { departure: Departure; destinationId?: string; locked: string | null }) {
  const live = useLive()
  const { user, denial } = usePersona()
  const assign = useCommand(departureCommands.assignGuide, { success: "Guide diperbarui" })
  if (!live) return null
  const { db } = live
  const guides = Object.values(db.guides)
    .filter((g) => g.status === "active")
    .sort((a, b) => Number(!!destinationId && b.destinationIds.includes(destinationId)) - Number(!!destinationId && a.destinationIds.includes(destinationId)) || a.name.localeCompare(b.name))
  const busy = (guideId: string) =>
    Object.values(db.departures).find((d) => d.id !== departure.id && d.guideId === guideId && !d.cancelledAt && rangesOverlap(d.startDate, d.endDate, departure.startDate, departure.endDate))
  const assigned = departure.guideId ? db.guides[departure.guideId] : undefined

  return (
    <SectionCard title="Guide">
      <Select
        value={departure.guideId ?? NONE}
        disabled={!!locked || !!denial("departures.manage") || assign.pending}
        onValueChange={(value) => assign.run(user?.id ?? "", departure.id, value === NONE ? null : value)}
      >
        <SelectTrigger aria-label="Guide" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Belum ditugaskan</SelectItem>
          {guides.map((g) => {
            const clash = busy(g.id)
            return (
              <SelectItem key={g.id} value={g.id} disabled={!!clash}>
                {g.name}
                {clash ? ` · bertugas di ${clash.code}` : destinationId && !g.destinationIds.includes(destinationId) ? " · di luar wilayah" : ""}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      {assigned ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {formatPhone(assigned.phone)} · {assigned.languages.join(", ")}
        </p>
      ) : (
        <p className="mt-3 text-xs text-tone-warning">Item &ldquo;Konfirmasi guide&rdquo; terkunci sampai guide ditugaskan.</p>
      )}
      {denial("departures.manage") && <p className="mt-2 text-xs text-muted-foreground">{denial("departures.manage")}</p>}
    </SectionCard>
  )
}

function VendorPanel({ row, locked }: { row: OperationsRow; locked: string | null }) {
  const live = useLive()
  const { user } = usePersona()
  const [adding, setAdding] = useState(false)
  const [vendorId, setVendorId] = useState("")
  const [cancelId, setCancelId] = useState<string | null>(null)
  const add = useCommand(operationsCommands.assignVendor, {
    success: "Vendor diminta (simulasi)",
    onSuccess: () => {
      setAdding(false)
      setVendorId("")
    },
  })
  const setStatus = useCommand(operationsCommands.setVendorStatus, { success: (a) => `Vendor ${VENDOR_ASSIGNMENT_STATUS_LABEL[a.status].toLowerCase()}`, onSuccess: () => setCancelId(null) })
  if (!live) return null
  const { db } = live
  const { departure, pkg, vendors } = row
  const active = new Set(vendors.filter((v) => v.status !== "cancelled").map((v) => v.vendorId))
  const options = Object.values(db.vendors)
    .filter((v) => !active.has(v.id))
    .sort((a, b) => Number(!!pkg && b.destinationIds.includes(pkg.destinationId)) - Number(!!pkg && a.destinationIds.includes(pkg.destinationId)) || a.category.localeCompare(b.category))
  const local = (v: Vendor) => !!pkg && v.destinationIds.includes(pkg.destinationId)
  const sorted = [...vendors].sort((a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled"))
  const cancelling = vendors.find((v) => v.id === cancelId)

  return (
    <SectionCard
      title="Vendor"
      description="Transportasi, kapal, dan akomodasi terkonfirmasi membuka item checklist terkait."
      action={
        !adding &&
        !locked && (
          <PermissionButton permission="operations.manage" size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" /> Tambah
          </PermissionButton>
        )
      }
      bodyClassName="p-0"
    >
      {adding && (
        <form
          className="grid gap-3 border-b border-line px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (vendorId) void add.run(user?.id ?? "", departure.id, { vendorId })
          }}
        >
          <Field label="Vendor" description="Permintaan dicatat; tidak ada pesan yang dikirim ke vendor (simulasi).">
            {(c) => (
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger {...c} className="w-full">
                  <SelectValue placeholder="Pilih vendor" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} · {VENDOR_CATEGORY_LABEL[v.category]}
                      {!local(v) && " · di luar wilayah"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!vendorId || add.pending}>
              Minta vendor
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Batal
            </Button>
          </div>
        </form>
      )}
      {sorted.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Belum ada vendor untuk trip ini.</p>
      ) : (
        <ul className="divide-y divide-line">
          {sorted.map((assignment) => {
            const vendor = db.vendors[assignment.vendorId]
            return (
              <li key={assignment.id} className={cn("px-5 py-3", assignment.status === "cancelled" && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-strong">{vendor?.name}</p>
                    <p className="text-xs text-text-subtle">
                      {VENDOR_CATEGORY_LABEL[assignment.service]}
                      {vendor && (
                        <>
                          {" "}
                          · {vendor.contactName} · <span className="whitespace-nowrap">{formatPhone(vendor.phone)}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <StatusBadge tone={VENDOR_TONE[assignment.status]}>{VENDOR_ASSIGNMENT_STATUS_LABEL[assignment.status]}</StatusBadge>
                </div>
                {assignment.status !== "cancelled" && !locked && (
                  <div className="mt-2 flex gap-2">
                    {assignment.status === "requested" && (
                      <PermissionButton permission="operations.manage" size="sm" variant="secondary" disabled={setStatus.pending} onClick={() => setStatus.run(user?.id ?? "", assignment.id, "confirmed")}>
                        <Check aria-hidden="true" /> Konfirmasi
                      </PermissionButton>
                    )}
                    <PermissionButton permission="operations.manage" size="sm" variant="ghost" disabled={setStatus.pending} onClick={() => setCancelId(assignment.id)}>
                      <X aria-hidden="true" /> Batalkan
                    </PermissionButton>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelId(null)}
        title="Batalkan penugasan vendor?"
        description={
          cancelling?.status === "confirmed"
            ? "Vendor ini sudah terkonfirmasi. Item checklist yang bergantung padanya akan ditandai perlu dicek ulang."
            : "Permintaan ke vendor ini dibatalkan."
        }
        confirmLabel="Batalkan vendor"
        tone="destructive"
        pending={setStatus.pending}
        onConfirm={() => cancelling && setStatus.run(user?.id ?? "", cancelling.id, "cancelled")}
      />
    </SectionCard>
  )
}

function NotesPanel({ departure, locked }: { departure: Departure; locked: string | null }) {
  const { user, denial } = usePersona()
  const [notes, setNotes] = useState(departure.notes ?? "")
  const save = useCommand(departureCommands.update, { success: "Catatan operasional disimpan" })
  const disabled = !!locked || !!denial("departures.manage")
  return (
    <SectionCard title="Catatan operasional">
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void save.run(user?.id ?? "", departure.id, { notes })
        }}
      >
        <Textarea aria-label="Catatan operasional" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled} placeholder="Contoh: kapal cadangan siaga di Labuan Bajo" />
        <div>
          <PermissionButton permission="departures.manage" disabledReason={locked} type="submit" size="sm" variant="secondary" disabled={save.pending || notes === (departure.notes ?? "")}>
            Simpan catatan
          </PermissionButton>
        </div>
      </form>
    </SectionCard>
  )
}
