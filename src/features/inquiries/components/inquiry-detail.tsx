"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowRightCircle, Check, FilePlus2, Loader2, Pencil, Send, X } from "lucide-react"
import { addDays, toDateOnlyWIB } from "@/lib/dates"
import { formatDate, formatDateTime, formatIDR, formatPhone } from "@/lib/format"
import type { FollowUp, Quotation } from "@/domain/entities"
import { getIndexes } from "@/domain/indexes"
import {
  BUDGET_LABEL,
  CUSTOMER_STAGE_LABEL,
  FOLLOW_UP_CHANNEL_LABEL,
  INQUIRY_TYPE_LABEL,
  INTEREST_LABEL,
  LOST_REASON_LABEL,
  PIPELINE_STAGE_LABEL,
  QUOTATION_STATUS_LABEL,
  SOURCE_LABEL,
} from "@/domain/labels"
import { customerStage } from "@/domain/rules/customer-identity"
import { canConvertInquiry, quotationDisplayStatus } from "@/domain/rules/inquiry-pipeline"
import { priceTotal } from "@/domain/rules/pricing"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { DescriptionList, SectionCard } from "@/components/dashboard/section-card"
import { Field } from "@/components/shared/field"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CUSTOMER_STAGE_TONE } from "@/features/bookings/labels"
import { inquiryCommands } from "@/services/inquiry-admin-service"
import { formatTravelDates } from "../format"
import { QUOTATION_TONE, STAGE_TONE } from "../labels"
import { ConvertDialog } from "./convert-dialog"
import { QuotationBuilder } from "./quotation-builder"
import { StageMenu, useStageMover } from "./stage-mover"

const NOBODY = "__kosong"

/** Must sit inside <Suspense>: the id is only known at request time. */
export function InquiryDetailRoute() {
  const { id } = useParams<{ id: string }>()
  return <InquiryDetail id={id} />
}

function FollowUpComposer({ inquiryId, userId, today, disabled }: { inquiryId: string; userId: string; today: string; disabled: string | null }) {
  const [channel, setChannel] = useState<FollowUp["channel"]>("whatsapp")
  const [body, setBody] = useState("")
  const [next, setNext] = useState("")
  const add = useCommand(inquiryCommands.addFollowUp, {
    success: "Follow-up dicatat",
    onSuccess: () => {
      setBody("")
      setNext("")
    },
  })
  return (
    <form
      className="grid gap-3 border-t border-line pt-4"
      onSubmit={(event) => {
        event.preventDefault()
        void add.run(userId, inquiryId, { channel, body, nextFollowUpDate: next || undefined })
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
        <Select value={channel} onValueChange={(v) => setChannel(v as FollowUp["channel"])}>
          <SelectTrigger aria-label="Kanal" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FOLLOW_UP_CHANNEL_LABEL) as FollowUp["channel"][]).map((c) => (
              <SelectItem key={c} value={c}>
                {FOLLOW_UP_CHANNEL_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea aria-label="Catatan follow-up" placeholder="Apa yang dibahas dengan pelanggan?" rows={2} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Follow-up berikutnya" optional className="w-64">
          {(c) => <Input {...c} type="date" min={today} value={next} onChange={(e) => setNext(e.target.value)} />}
        </Field>
        <PermissionButton permission="inquiries.manage" disabledReason={disabled} type="submit" size="sm" disabled={add.pending || !body.trim()}>
          {add.pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Catat follow-up
        </PermissionButton>
      </div>
    </form>
  )
}

function InquiryDetail({ id }: { id: string }) {
  const live = useLive()
  const { user, denial } = usePersona()
  const userId = user?.id ?? ""
  const mover = useStageMover(live?.today ?? "")
  const [builder, setBuilder] = useState<{ base?: Quotation } | null>(null)
  const [converting, setConverting] = useState(false)
  const assign = useCommand(inquiryCommands.assign, { success: "Penanggung jawab diperbarui" })
  const schedule = useCommand(inquiryCommands.setNextFollowUp, { success: "Jadwal follow-up disimpan" })
  const respond = useCommand(inquiryCommands.respondQuotation, {
    success: "Respons pelanggan dicatat",
  })

  const view = useMemo(() => {
    if (!live) return null
    const { db, today } = live
    const inquiry = db.inquiries[id]
    if (!inquiry) return { inquiry: null } as const
    const idx = getIndexes(db)
    const quotations = [...(idx.quotationsByInquiry.get(inquiry.id) ?? [])].sort((a, b) => b.version - a.version)
    return {
      inquiry,
      customer: db.customers[inquiry.customerId],
      pkg: inquiry.packageId ? db.packages[inquiry.packageId] : undefined,
      destinations: inquiry.destinationIds.map((d) => db.destinations[d]).filter(Boolean),
      quotations,
      accepted: quotations.find((q) => q.status === "accepted"),
      booking: inquiry.convertedBookingId ? db.bookings[inquiry.convertedBookingId] : undefined,
      events: (idx.activityBySubject.get(inquiry.id) ?? []).filter((e) => e.subject.id === inquiry.id),
      stage: customerStage(idx.bookingsByCustomer.get(inquiry.customerId) ?? []),
      today,
    }
  }, [live, id])

  if (!live || !view) return <PageSkeleton variant="detail" />
  if (!view.inquiry) {
    return (
      <NotFoundPanel
        title="Inquiry tidak ditemukan"
        description="Inquiry ini tidak ada di data demo browser ini."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/inquiries">Kembali ke daftar inquiry</Link>
          </Button>
        }
      />
    )
  }

  const { db, now, today } = live
  const { inquiry, customer, pkg, destinations, quotations, accepted, booking, events, stage } = view
  const manageBlock = denial("inquiries.manage")
  const locked = inquiry.convertedBookingId ? "Inquiry sudah dikonversi menjadi booking." : null
  const convertBlock = canConvertInquiry(inquiry) ?? (inquiry.type !== "general" && !accepted ? "Belum ada penawaran yang disetujui." : null)
  const sales = Object.values(db.users).filter((u) => u.status === "active" && db.roles[u.roleId]?.permissions.includes("inquiries.manage"))
  const latestSent = quotations.find((q) => q.status === "sent" || q.status === "accepted" || q.status === "rejected")
  const draft = quotations.find((q) => q.status === "draft")
  const followUps = [...inquiry.followUps].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard/inquiries", label: "Inquiry & Leads" }}
        title={inquiry.contactSnapshot.fullName}
        meta={
          <>
            <StatusBadge tone={STAGE_TONE[inquiry.stage]}>{PIPELINE_STAGE_LABEL[inquiry.stage]}</StatusBadge>
            <span className="text-sm text-text-subtle">{inquiry.code}</span>
          </>
        }
        description={`${INQUIRY_TYPE_LABEL[inquiry.type]} dari ${SOURCE_LABEL[inquiry.source]} · masuk ${formatDateTime(inquiry.createdAt)}${inquiry.stage === "lost" && inquiry.lostReason ? ` · gagal: ${LOST_REASON_LABEL[inquiry.lostReason].toLowerCase()}` : ""}`}
        actions={
          booking ? (
            <Button asChild>
              <Link href={`/dashboard/bookings/${booking.id}`}>Lihat booking {booking.code}</Link>
            </Button>
          ) : (
            <>
              <StageMenu inquiry={inquiry} size="sm" onMove={(to) => mover.request(inquiry, to, quotations)} />
              {inquiry.stage === "won" && (
                <PermissionButton permission="bookings.manage" disabledReason={manageBlock ?? convertBlock} onClick={() => setConverting(true)}>
                  <ArrowRightCircle aria-hidden="true" /> Konversi ke booking
                </PermissionButton>
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <SectionCard title="Kebutuhan perjalanan">
            <DescriptionList
              items={[
                {
                  label: inquiry.type === "custom" ? "Paket inspirasi" : "Paket",
                  hidden: !pkg,
                  value: pkg && (
                    <Link href={`/dashboard/packages/${pkg.id}`} className="hover:underline">
                      {pkg.title}
                    </Link>
                  ),
                },
                { label: "Destinasi", hidden: destinations.length === 0, value: destinations.map((d) => d.name).join(", ") },
                { label: "Tanggal", value: formatTravelDates(inquiry.travelDates) },
                { label: "Durasi", hidden: !inquiry.durationDays, value: `${inquiry.durationDays} hari` },
                { label: "Peserta", value: `${inquiry.groupSize} orang` },
                { label: "Budget per orang", hidden: !inquiry.budgetPerPax, value: inquiry.budgetPerPax && BUDGET_LABEL[inquiry.budgetPerPax] },
                { label: "Minat", hidden: inquiry.interests.length === 0, value: inquiry.interests.map((i) => INTEREST_LABEL[i]).join(", ") },
              ]}
            />
            {inquiry.message && <p className="mt-5 rounded-md bg-canvas px-4 py-3 text-sm whitespace-pre-line text-text-strong">“{inquiry.message}”</p>}
          </SectionCard>

          {inquiry.type !== "general" && (
            <SectionCard
              id="penawaran"
              title="Penawaran"
              description="Setiap revisi menjadi versi baru; versi lama tetap tersimpan."
              action={
                !locked &&
                inquiry.stage !== "won" && (
                  <PermissionButton
                    permission="inquiries.manage"
                    disabledReason={inquiry.stage === "lost" ? "Buka kembali inquiry terlebih dahulu." : null}
                    size="sm"
                    variant={quotations.length ? "secondary" : "default"}
                    onClick={() => setBuilder({ base: draft ?? latestSent })}
                  >
                    {draft ? <Pencil aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />} {draft ? "Lanjutkan draf" : quotations.length ? "Buat revisi" : "Buat penawaran"}
                  </PermissionButton>
                )
              }
              bodyClassName="p-0"
            >
              {quotations.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">Belum ada penawaran. Buat penawaran agar inquiry bisa maju ke tahap berikutnya.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {quotations.map((q) => {
                    const display = quotationDisplayStatus(q, today)
                    return (
                      <li key={q.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text-strong">
                              {q.title} <span className="font-normal text-text-subtle">· v{q.version}</span>
                            </p>
                            <p className="text-xs text-text-subtle">
                              {q.code} · berangkat {formatDate(q.proposedStartDate)} · {q.durationDays} hari · {q.groupSize} orang
                              {q.sentAt && ` · dikirim ${formatDate(toDateOnlyWIB(q.sentAt))}, berlaku s.d. ${formatDate(q.validUntil)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold tabular-nums">{formatIDR(priceTotal(q))}</span>
                            <StatusBadge tone={QUOTATION_TONE[display]}>{QUOTATION_STATUS_LABEL[display]}</StatusBadge>
                          </div>
                        </div>
                        {q.itinerarySummary.length > 0 && (
                          <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                            {q.itinerarySummary.map((line, i) => (
                              <li key={i}>
                                <span className="font-semibold">H{i + 1}</span> {line}
                              </li>
                            ))}
                          </ol>
                        )}
                        {(q.status === "sent" || q.status === "draft") && !locked && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {q.status === "sent" && (
                              <>
                                <PermissionButton permission="inquiries.manage" size="xs" onClick={() => respond.run(userId, q.id, "accepted")} disabled={respond.pending}>
                                  <Check aria-hidden="true" /> Disetujui pelanggan
                                </PermissionButton>
                                <PermissionButton permission="inquiries.manage" size="xs" variant="secondary" onClick={() => respond.run(userId, q.id, "rejected")} disabled={respond.pending}>
                                  <X aria-hidden="true" /> Ditolak
                                </PermissionButton>
                              </>
                            )}
                            {q.status === "draft" && (
                              <PermissionButton permission="inquiries.manage" size="xs" variant="secondary" onClick={() => setBuilder({ base: q })}>
                                <Pencil aria-hidden="true" /> Edit draf
                              </PermissionButton>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </SectionCard>
          )}

          <SectionCard title="Follow-up" description={`${inquiry.followUps.length} catatan kontak dengan pelanggan.`}>
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada follow-up. Catatan pertama memindahkan inquiry baru ke tahap Dihubungi.</p>
            ) : (
              <ul className="space-y-3">
                {followUps.map((f) => (
                  <li key={f.id} className="rounded-md bg-canvas px-4 py-3">
                    <p className="text-sm text-text-strong">{f.body}</p>
                    <p className="mt-1 text-xs text-text-subtle">
                      {FOLLOW_UP_CHANNEL_LABEL[f.channel]} · {db.users[f.authorId]?.name ?? "Tim"} · {formatDateTime(f.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {!locked && <FollowUpComposer inquiryId={inquiry.id} userId={userId} today={today} disabled={null} />}
          </SectionCard>

          <SectionCard title="Riwayat">
            <ActivityTimeline events={events} users={db.users} />
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-6">
          <SectionCard
            title="Kontak"
            action={<StatusBadge tone={CUSTOMER_STAGE_TONE[stage]}>{CUSTOMER_STAGE_LABEL[stage]}</StatusBadge>}
          >
            {customer && (
              <Link href={`/dashboard/customers/${customer.id}`} className="text-sm font-semibold text-text-strong hover:underline">
                {customer.fullName}
              </Link>
            )}
            <DescriptionList
              className="mt-3"
              stacked
              items={[
                { label: "Telepon", value: formatPhone(inquiry.contactSnapshot.phone) },
                { label: "Email", value: inquiry.contactSnapshot.email ?? "—" },
                { label: "Nama di formulir", hidden: !customer || customer.fullName === inquiry.contactSnapshot.fullName, value: inquiry.contactSnapshot.fullName },
              ]}
            />
          </SectionCard>

          <SectionCard title="Penanganan">
            <div className="grid gap-4">
              <Field label="Penanggung jawab">
                {(c) => (
                  <Select
                    value={inquiry.assigneeId ?? NOBODY}
                    disabled={!!manageBlock || !!locked || assign.pending}
                    onValueChange={(value) => assign.run(userId, inquiry.id, value === NOBODY ? null : value)}
                  >
                    <SelectTrigger id={c.id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NOBODY}>Belum ditugaskan</SelectItem>
                      {sales.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field
                label="Follow-up berikutnya"
                description={
                  inquiry.nextFollowUpDate && inquiry.nextFollowUpDate < today && inquiry.stage !== "won" && inquiry.stage !== "lost"
                    ? "Sudah lewat jadwal."
                    : undefined
                }
              >
                {(c) => (
                  <Input
                    {...c}
                    type="date"
                    min={today}
                    defaultValue={inquiry.nextFollowUpDate ?? ""}
                    key={inquiry.nextFollowUpDate ?? "kosong"}
                    disabled={!!manageBlock || !!locked}
                    onBlur={(event) => {
                      const value = event.target.value || null
                      if (value !== (inquiry.nextFollowUpDate ?? null)) void schedule.run(userId, inquiry.id, value)
                    }}
                  />
                )}
              </Field>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7].map((days) => (
                  <Button key={days} type="button" variant="secondary" size="xs" disabled={!!manageBlock || !!locked} onClick={() => schedule.run(userId, inquiry.id, addDays(today, days))}>
                    +{days} hari
                  </Button>
                ))}
              </div>
            </div>
          </SectionCard>

          {booking && (
            <SectionCard title="Booking hasil konversi">
              <Link href={`/dashboard/bookings/${booking.id}`} className="text-sm font-semibold hover:underline">
                {booking.code}
              </Link>
              <p className="mt-1 text-xs text-text-subtle">Inquiry terkunci setelah dikonversi.</p>
            </SectionCard>
          )}
        </aside>
      </div>

      {builder && (
        <QuotationBuilder
          key={builder.base?.id ?? "baru"}
          open
          onOpenChange={(open) => !open && setBuilder(null)}
          db={db}
          inquiry={inquiry}
          base={builder.base}
          today={today}
        />
      )}
      <ConvertDialog open={converting} onOpenChange={setConverting} db={db} now={now} inquiry={inquiry} accepted={accepted} userId={userId} />
      {mover.dialog}
    </div>
  )
}
