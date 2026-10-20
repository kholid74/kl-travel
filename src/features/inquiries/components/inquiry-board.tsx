"use client"

import Link from "next/link"
import { useState } from "react"
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { CalendarClock, Users } from "lucide-react"
import type { PipelineStage } from "@/domain/entities"
import { INQUIRY_TYPE_LABEL, PIPELINE_STAGE_LABEL } from "@/domain/labels"
import { PIPELINE_STAGES } from "@/domain/rules/inquiry-pipeline"
import { formatDate, formatIDRCompact } from "@/lib/format"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/shared/status-badge"
import type { InquiryRow } from "@/services/queries/inquiries"
import { STAGE_TONE } from "../labels"
import { StageMenu } from "./stage-mover"

const TYPE_TONE = { private: "success", custom: "accent", general: "neutral" } as const

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
}

function CardBody({ row, today, onMove }: { row: InquiryRow; today: string; onMove?: (to: PipelineStage) => void }) {
  const { inquiry } = row
  const due = inquiry.nextFollowUpDate
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/dashboard/inquiries/${inquiry.id}`}
            className="block truncate text-sm font-semibold text-text-strong hover:underline"
            onPointerDown={(event) => event.stopPropagation()}
          >
            {inquiry.contactSnapshot.fullName}
          </Link>
          <p className="text-xs text-text-subtle">{inquiry.code}</p>
        </div>
        {onMove && (
          <div onPointerDown={(event) => event.stopPropagation()}>
            <StageMenu inquiry={inquiry} onMove={onMove} />
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-text-muted">
        {row.pkg?.title ?? (row.destinations.map((d) => d.name).join(", ") || "Pertanyaan umum")}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={TYPE_TONE[inquiry.type]} dot={false} className="h-5 px-2 text-[0.6875rem]">
          {INQUIRY_TYPE_LABEL[inquiry.type]}
        </StatusBadge>
        <span className="inline-flex items-center gap-1 text-xs text-text-subtle">
          <Users className="size-3" aria-hidden="true" /> {inquiry.groupSize}
        </span>
        {row.estimate !== null && <span className="text-xs font-medium text-text-strong tabular-nums">{formatIDRCompact(row.estimate)}</span>}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2">
        {inquiry.convertedBookingId ? (
          <span className="text-xs font-medium text-tone-success">Sudah jadi booking</span>
        ) : due && inquiry.stage !== "won" && inquiry.stage !== "lost" ? (
          <span className={cn("inline-flex items-center gap-1 text-xs", due < today ? "font-semibold text-tone-danger" : due === today ? "font-semibold text-tone-warning" : "text-text-subtle")}>
            <CalendarClock className="size-3" aria-hidden="true" />
            {due === today ? "Follow-up hari ini" : formatDate(due, "day-month")}
          </span>
        ) : (
          <span className="text-xs text-text-subtle">{inquiry.stage === "new" ? "Belum dihubungi" : "—"}</span>
        )}
        {row.assignee ? (
          <span title={row.assignee.name} className="flex size-6 items-center justify-center rounded-full bg-ocean-800 text-[0.625rem] font-semibold text-white">
            {initials(row.assignee.name)}
            <span className="sr-only">Ditangani {row.assignee.name}</span>
          </span>
        ) : (
          <span className="text-[0.6875rem] text-text-subtle">Belum ditugaskan</span>
        )}
      </div>
    </>
  )
}

function DraggableCard({ row, today, onMove }: { row: InquiryRow; today: string; onMove: (to: PipelineStage) => void }) {
  const { listeners, setNodeRef, isDragging } = useDraggable({ id: row.inquiry.id, disabled: !!row.inquiry.convertedBookingId })
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      className={cn(
        "rounded-md border border-line bg-card p-3 shadow-xs",
        row.inquiry.convertedBookingId ? "cursor-default" : "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-40",
        row.followUpOverdue && "border-l-2 border-l-tone-danger",
      )}
    >
      <CardBody row={row} today={today} onMove={onMove} />
    </li>
  )
}

function Column({ stage, rows, today, onMove }: { stage: PipelineStage; rows: InquiryRow[]; today: string; onMove: (row: InquiryRow, to: PipelineStage) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  return (
    <section aria-label={PIPELINE_STAGE_LABEL[stage]} className="flex w-[280px] shrink-0 flex-col">
      <header className="mb-2 flex items-center justify-between px-1">
        <StatusBadge tone={STAGE_TONE[stage]}>{PIPELINE_STAGE_LABEL[stage]}</StatusBadge>
        <span className="text-xs font-semibold text-text-subtle tabular-nums">{rows.length}</span>
      </header>
      <ul
        ref={setNodeRef}
        className={cn(
          "flex min-h-40 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver ? "border-ocean-700 bg-tone-info-bg" : "border-transparent bg-muted/70",
        )}
      >
        {rows.map((row) => (
          <DraggableCard key={row.inquiry.id} row={row} today={today} onMove={(to) => onMove(row, to)} />
        ))}
        {rows.length === 0 && <li className="px-2 py-6 text-center text-xs text-text-subtle">Kosong</li>}
      </ul>
    </section>
  )
}

/** Pipeline board: drag with mouse or touch, or use "Pindahkan ke…" on each card. */
export function InquiryBoard({ rows, today, onMove }: { rows: InquiryRow[]; today: string; onMove: (row: InquiryRow, to: PipelineStage) => void }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }))
  const active = rows.find((r) => r.inquiry.id === activeId)

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const row = rows.find((r) => r.inquiry.id === event.active.id)
    const to = event.over?.id as PipelineStage | undefined
    if (row && to && to !== row.inquiry.stage) onMove(row, to)
  }

  const sorted = (stage: PipelineStage) =>
    rows
      .filter((r) => r.inquiry.stage === stage)
      .sort((a, b) =>
        stage === "won" || stage === "lost"
          ? b.inquiry.updatedAt.localeCompare(a.inquiry.updatedAt)
          : (a.inquiry.nextFollowUpDate ?? "9999").localeCompare(b.inquiry.nextFollowUpDate ?? "9999") || b.inquiry.createdAt.localeCompare(a.inquiry.createdAt),
      )

  return (
    <DndContext sensors={sensors} onDragStart={(event) => setActiveId(String(event.active.id))} onDragCancel={() => setActiveId(null)} onDragEnd={onDragEnd}>
      <p className="mb-3 text-xs text-muted-foreground">Seret kartu ke tahap lain, atau pakai tombol pindah di kartu.</p>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6">
        {PIPELINE_STAGES.map((stage) => (
          <Column key={stage} stage={stage} rows={sorted(stage)} today={today} onMove={onMove} />
        ))}
      </div>
      <DragOverlay>
        {active && (
          <div className="w-[264px] rotate-1 rounded-md border border-line bg-card p-3 shadow-lg">
            <CardBody row={active} today={today} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
