"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowRightLeft } from "lucide-react"
import type { Inquiry, LostReason, PipelineStage, Quotation } from "@/domain/entities"
import { LOST_REASON_LABEL, PIPELINE_STAGE_LABEL } from "@/domain/labels"
import { canMoveInquiry, PIPELINE_STAGES } from "@/domain/rules/inquiry-pipeline"
import { useCommand } from "@/hooks/use-command"
import { usePersona } from "@/hooks/use-persona"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { inquiryCommands } from "@/services/inquiry-admin-service"

/**
 * One entry point for pipeline moves (drag, menu, detail page). Rules come from
 * canMoveInquiry; a move that needs a quotation points the user to it, and Gagal asks
 * for a reason first.
 */
export function useStageMover(today: string) {
  const router = useRouter()
  const { user, denial } = usePersona()
  const [lostFor, setLostFor] = useState<Inquiry | null>(null)
  const [reason, setReason] = useState<LostReason>("harga")
  const move = useCommand(inquiryCommands.move)

  const request = (inquiry: Inquiry, to: PipelineStage, quotations: Pick<Quotation, "status" | "validUntil">[]) => {
    const blocked = denial("inquiries.manage")
    if (blocked) {
      toast.error(blocked)
      return
    }
    if (inquiry.stage === to || !user) return
    const check = canMoveInquiry({ inquiry, to, quotations, today, lostReasonProvided: to === "lost" })
    if (!check.ok) {
      if (check.needs === "quotation" || check.needs === "accepted_quotation") {
        toast.info(check.reason, {
          action: { label: "Buka penawaran", onClick: () => router.push(`/dashboard/inquiries/${inquiry.id}#penawaran`) },
        })
      } else {
        toast.error(check.reason)
      }
      return
    }
    if (to === "lost") {
      setReason("harga")
      setLostFor(inquiry)
      return
    }
    void move.run(user.id, inquiry.id, to).then((result) => {
      if (result.ok) toast.success(`${inquiry.code} dipindah ke ${PIPELINE_STAGE_LABEL[to]}`)
    })
  }

  const dialog = (
    <ConfirmDialog
      open={!!lostFor}
      onOpenChange={(open) => !open && setLostFor(null)}
      title={`Tandai ${lostFor?.code ?? ""} gagal?`}
      description="Alasan dipakai di laporan konversi. Inquiry bisa dibuka kembali nanti."
      confirmLabel="Tandai gagal"
      tone="destructive"
      pending={move.pending}
      onConfirm={() => {
        if (!lostFor || !user) return
        void move.run(user.id, lostFor.id, "lost", reason).then((result) => {
          if (result.ok) {
            toast.success(`${lostFor.code} ditandai gagal`)
            setLostFor(null)
          }
        })
      }}
    >
      <div className="grid gap-2">
        <Label>Alasan</Label>
        <RadioGroup value={reason} onValueChange={(value) => setReason(value as LostReason)} className="grid gap-2">
          {(Object.keys(LOST_REASON_LABEL) as LostReason[]).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={key} /> {LOST_REASON_LABEL[key]}
            </label>
          ))}
        </RadioGroup>
      </div>
    </ConfirmDialog>
  )

  return { request, dialog, pending: move.pending }
}

/** Keyboard-friendly alternative to dragging: "Pindahkan ke…" with every stage. */
export function StageMenu({
  inquiry,
  onMove,
  size = "icon-xs",
}: {
  inquiry: Inquiry
  onMove: (to: PipelineStage) => void
  size?: "icon-xs" | "sm"
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {size === "sm" ? (
          <Button variant="secondary" size="sm" disabled={!!inquiry.convertedBookingId}>
            <ArrowRightLeft aria-hidden="true" /> Pindahkan tahap
          </Button>
        ) : (
          <Button variant="ghost" size="icon-xs" aria-label={`Pindahkan ${inquiry.code} ke tahap lain`} disabled={!!inquiry.convertedBookingId}>
            <ArrowRightLeft />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Pindahkan ke…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PIPELINE_STAGES.map((stage) => (
          <DropdownMenuItem key={stage} disabled={stage === inquiry.stage} onSelect={() => onMove(stage)}>
            {PIPELINE_STAGE_LABEL[stage]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
