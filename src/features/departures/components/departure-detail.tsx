"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { Ban, Calculator, ClipboardCheck, ExternalLink, Lock, LockOpen, Save } from "lucide-react"
import { diffDays, rangesOverlap } from "@/lib/dates"
import { formatDateRange, formatDateTime, formatIDR, formatNumber, formatPercent, formatPhone } from "@/lib/format"
import { getIndexes } from "@/domain/indexes"
import { BOOKING_STATUS_LABEL, DEPARTURE_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/domain/labels"
import { departureDisplayStatus, minimumCapacity, seatSummary } from "@/domain/rules/availability"
import { departureEstimate } from "@/domain/rules/metrics"
import { bookingFinancials } from "@/domain/rules/payment-status"
import { pricePerPax } from "@/domain/rules/pricing"
import { missingTravelerFields } from "@/domain/rules/travelers"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { PageHeader } from "@/components/dashboard/page-header"
import { NotFoundPanel, PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { DescriptionList, SectionCard } from "@/components/dashboard/section-card"
import { Field } from "@/components/shared/field"
import { SeatMeter } from "@/components/shared/seat-meter"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { BOOKING_STATUS_TONE, PAYMENT_STATUS_TONE } from "@/features/bookings/labels"
import { DEPARTURE_STATUS_TONE } from "@/features/packages/labels"
import { departureCommands } from "@/services/departure-service"

const NONE = "__tanpa"

/** Must sit inside <Suspense>: the id is only known at request time. */
export function DepartureDetailRoute() {
  const { id } = useParams<{ id: string }>()
  return <DepartureDetail id={id} />
}

function CapacityEditor({ userId, departureId, capacity, minParticipants, floor, disabled }: { userId: string; departureId: string; capacity: number; minParticipants: number; floor: number; disabled: string | null }) {
  const [value, setValue] = useState(String(capacity))
  const [minimum, setMinimum] = useState(String(minParticipants))
  const update = useCommand(departureCommands.update, { success: "Kapasitas disimpan" })
  const next = Number(value)
  const nextMin = Number(minimum)
  const invalid = !Number.isInteger(next) || next < floor ? `Minimal ${floor} kursi (sudah terisi atau ditahan).` : nextMin < 1 || nextMin > next ? "Peserta minimum harus antara 1 dan kapasitas." : null
  const changed = next !== capacity || nextMin !== minParticipants
  return (
    <form
      className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        if (!invalid) void update.run(userId, departureId, { capacity: next, minParticipants: nextMin })
      }}
    >
      <Field label="Kapasitas" description={`Batas bawah ${floor} kursi.`} error={invalid && next < floor ? invalid : undefined}>
        {(c) => <Input {...c} type="number" min={floor} value={value} onChange={(e) => setValue(e.target.value)} disabled={!!disabled} />}
      </Field>
      <Field label="Peserta minimum" description="Syarat pasti berangkat." error={invalid && next >= floor ? invalid : undefined}>
        {(c) => <Input {...c} type="number" min={1} value={minimum} onChange={(e) => setMinimum(e.target.value)} disabled={!!disabled} />}
      </Field>
      <PermissionButton permission="departures.manage" disabledReason={disabled} type="submit" variant="secondary" disabled={!changed || !!invalid || update.pending}>
        <Save aria-hidden="true" /> Simpan
      </PermissionButton>
    </form>
  )
}

function DepartureDetail({ id }: { id: string }) {
  const live = useLive()
  const { user, denial } = usePersona()
  const userId = user?.id ?? ""
  const [dialog, setDialog] = useState<"close" | "cancel" | null>(null)
  const [reason, setReason] = useState("")
  const salesClosed = useCommand(departureCommands.setSalesClosed, { success: (d) => (d.salesClosed ? "Penjualan ditutup" : "Penjualan dibuka kembali"), onSuccess: () => setDialog(null) })
  const cancel = useCommand(departureCommands.cancel, { success: (r) => `Keberangkatan dibatalkan${r.cancelledBookings ? `, ${r.cancelledBookings} booking ikut dibatalkan` : ""}`, onSuccess: () => setDialog(null) })
  const guide = useCommand(departureCommands.assignGuide, { success: "Guide diperbarui" })

  const view = useMemo(() => {
    if (!live) return null
    const { db, now, today } = live
    const departure = db.departures[id]
    if (!departure) return { departure: null } as const
    const idx = getIndexes(db)
    const pkg = db.packages[departure.packageId]
    const bookings = [...(idx.bookingsByDeparture.get(departure.id) ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const seats = seatSummary(departure, bookings, idx.paxOf, now)
    const status = departureDisplayStatus({ departure, seats, today, settings: db.settings.booking, packageArchived: pkg?.status === "archived" })
    const manifest = bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed" || b.status === "pending" || b.status === "awaiting_payment")
      .flatMap((b) =>
        (idx.bookingTravelersByBooking.get(b.id) ?? []).map((bt) => ({ booking: b, traveler: db.travelers[bt.travelerId], lead: bt.isLead })).filter((row) => row.traveler),
      )
    return {
      departure,
      pkg,
      bookings: bookings.map((b) => ({
        booking: b,
        customer: db.customers[b.customerId],
        pax: idx.paxOf(b.id),
        fin: bookingFinancials({ booking: b, invoice: idx.invoiceByBooking.get(b.id), payments: idx.paymentsByBooking.get(b.id) ?? [], today }),
      })),
      seats,
      status,
      manifest,
      estimate: departureEstimate(db, departure),
      events: idx.activityBySubject.get(departure.id) ?? [],
    }
  }, [live, id])

  if (!live || !view) return <PageSkeleton variant="detail" />
  if (!view.departure) {
    return (
      <NotFoundPanel
        title="Keberangkatan tidak ditemukan"
        description="Keberangkatan ini tidak ada di data demo browser ini."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard/departures">Kembali ke daftar keberangkatan</Link>
          </Button>
        }
      />
    )
  }

  const { db, today } = live
  const { departure, pkg, bookings, seats, status, manifest, estimate, events } = view
  const ended = today >= departure.startDate
  const editBlock = departure.cancelledAt ? "Keberangkatan sudah dibatalkan." : ended ? "Keberangkatan sudah berjalan." : null
  const capacityBlock = editBlock ?? (departure.kind === "private" ? "Kapasitas keberangkatan privat mengikuti jumlah peserta booking." : null)
  const price = pkg ? (pricePerPax(pkg, 1, departure) ?? 0) : 0
  const activeBookings = bookings.filter((b) => b.booking.status !== "cancelled" && b.booking.status !== "completed")
  const guides = Object.values(db.guides).filter((g) => g.status === "active")
  const assigned = departure.guideId ? db.guides[departure.guideId] : undefined
  const busy = (guideId: string) =>
    Object.values(db.departures).find((d) => d.id !== departure.id && d.guideId === guideId && !d.cancelledAt && rangesOverlap(d.startDate, d.endDate, departure.startDate, departure.endDate))
  const incomplete = manifest.filter((m) => missingTravelerFields(m.traveler).length > 0).length

  return (
    <div>
      <PageHeader
        back={{ href: "/dashboard/departures", label: "Keberangkatan" }}
        title={pkg?.title ?? departure.code}
        meta={
          <>
            <StatusBadge tone={DEPARTURE_STATUS_TONE[status]}>{status === "limited" ? `Sisa ${seats.available} kursi` : DEPARTURE_STATUS_LABEL[status]}</StatusBadge>
            {seats.guaranteed && !departure.cancelledAt && <StatusBadge tone="success" dot={false}>Pasti berangkat</StatusBadge>}
          </>
        }
        description={`${formatDateRange(departure.startDate, departure.endDate)} · ${departure.code} · ${departure.kind === "private" ? "keberangkatan privat" : "jadwal open trip"}${departure.salesClosed && departure.salesClosedReason ? ` · penjualan ditutup: ${departure.salesClosedReason}` : ""}${departure.cancelledAt ? ` · dibatalkan: ${departure.cancellationReason}` : ""}`}
        actions={
          departure.kind === "scheduled" &&
          !departure.cancelledAt &&
          !ended && (
            <>
              {pkg?.status === "published" && pkg.visibility === "catalog" && (
                <Button asChild variant="ghost">
                  <Link href={`/paket/${pkg.slug}?keberangkatan=${departure.code}#jadwal`} target="_blank">
                    Lihat di website <ExternalLink aria-hidden="true" />
                  </Link>
                </Button>
              )}
              {departure.salesClosed ? (
                <PermissionButton permission="departures.manage" variant="secondary" disabled={salesClosed.pending} onClick={() => salesClosed.run(userId, departure.id, false)}>
                  <LockOpen aria-hidden="true" /> Buka penjualan
                </PermissionButton>
              ) : (
                <PermissionButton
                  permission="departures.manage"
                  variant="secondary"
                  onClick={() => {
                    setReason("")
                    setDialog("close")
                  }}
                >
                  <Lock aria-hidden="true" /> Tutup penjualan
                </PermissionButton>
              )}
              <PermissionButton
                permission="departures.manage"
                variant="ghost"
                className="text-tone-danger hover:bg-tone-danger-bg"
                onClick={() => {
                  setReason("")
                  setDialog("cancel")
                }}
              >
                <Ban aria-hidden="true" /> Batalkan
              </PermissionButton>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <SectionCard title="Kursi" description="Sisa = kapasitas − terkonfirmasi − ditahan. Kursi ditahan selama booking menunggu verifikasi atau pembayaran.">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Kapasitas", value: seats.capacity },
                { label: "Terkonfirmasi", value: seats.allocated },
                { label: "Ditahan", value: seats.held },
                { label: "Sisa", value: seats.available },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-canvas px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="mt-0.5 text-kpi font-semibold text-text-strong tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
            <SeatMeter seats={seats} className="mt-4" />
            <p className="mt-2 text-xs text-muted-foreground">
              Okupansi {formatPercent(seats.occupancy, 0)} · minimum {departure.minParticipants} peserta untuk pasti berangkat.
            </p>
            <CapacityEditor
              key={`${departure.capacity}-${departure.minParticipants}`}
              userId={userId}
              departureId={departure.id}
              capacity={departure.capacity}
              minParticipants={departure.minParticipants}
              floor={minimumCapacity(seats)}
              disabled={capacityBlock}
            />
          </SectionCard>

          <SectionCard title={`Booking (${bookings.length})`} bodyClassName="p-0">
            {bookings.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Belum ada booking.</p>
            ) : (
              <ul className="divide-y divide-line">
                {bookings.map(({ booking, customer, pax, fin }) => (
                  <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <Link href={`/dashboard/bookings/${booking.id}`} className="text-sm font-semibold text-text-strong hover:underline">
                        {customer?.fullName}
                      </Link>
                      <p className="text-xs text-text-subtle">
                        {booking.code} · {pax} pax · {formatIDR(fin.total)}
                        {booking.holdExpiresAt && ` · ditahan s.d. ${formatDateTime(booking.holdExpiresAt)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge tone={BOOKING_STATUS_TONE[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</StatusBadge>
                      <StatusBadge tone={PAYMENT_STATUS_TONE[fin.status]}>{PAYMENT_STATUS_LABEL[fin.status]}</StatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={`Manifest (${manifest.length} peserta)`}
            description={incomplete > 0 ? `${incomplete} peserta belum lengkap. Termasuk booking yang belum terkonfirmasi.` : "Data semua peserta lengkap."}
            action={
              !departure.cancelledAt && (
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/dashboard/operations/${departure.id}`}>
                    <ClipboardCheck aria-hidden="true" /> Operasional trip
                  </Link>
                </Button>
              )
            }
            bodyClassName="p-0"
          >
            {manifest.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Belum ada peserta.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-table">
                  <caption className="sr-only">Manifest peserta</caption>
                  <thead className="bg-canvas/70">
                    <tr className="border-b border-line text-left text-xs text-text-muted">
                      <th className="px-5 py-2 font-semibold">Nama</th>
                      <th className="px-3 py-2 font-semibold">L/P</th>
                      <th className="px-3 py-2 font-semibold">Usia</th>
                      <th className="px-3 py-2 font-semibold">Kontak darurat</th>
                      <th className="px-3 py-2 font-semibold">Booking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manifest.map(({ booking, traveler }) => {
                      const missing = missingTravelerFields(traveler)
                      return (
                        <tr key={traveler.id + booking.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-2">
                            {traveler.fullName ?? <span className="text-text-subtle italic">Belum diisi</span>}
                            {missing.length > 0 && <span className="ml-2 text-[0.6875rem] text-tone-warning">kurang {missing.length}</span>}
                            {traveler.dietaryNotes && <span className="block text-[0.6875rem] text-text-subtle">{traveler.dietaryNotes}</span>}
                          </td>
                          <td className="px-3 py-2">{traveler.gender ?? "—"}</td>
                          <td className="px-3 py-2 tabular-nums">{traveler.dateOfBirth ? Math.floor(diffDays(today, traveler.dateOfBirth) / 365.25) : "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{traveler.emergencyContact ? `${traveler.emergencyContact.name} · ${formatPhone(traveler.emergencyContact.phone)}` : "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <Link href={`/dashboard/bookings/${booking.id}#peserta`} className="hover:underline">
                              {booking.code}
                            </Link>
                            {booking.status !== "confirmed" && booking.status !== "completed" && <span className="ml-1 text-[0.6875rem] text-text-subtle">({BOOKING_STATUS_LABEL[booking.status].toLowerCase()})</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Riwayat">
            <ActivityTimeline events={events} users={db.users} />
          </SectionCard>
        </div>

        <aside className="min-w-0 space-y-6">
          <SectionCard title="Detail">
            <DescriptionList
              stacked
              items={[
                {
                  label: "Paket",
                  value: pkg ? (
                    <Link href={`/dashboard/packages/${pkg.id}`} className="hover:underline">
                      {pkg.title}
                    </Link>
                  ) : (
                    "—"
                  ),
                },
                { label: "Harga per orang", value: `${formatIDR(price)}${departure.pricePerPaxOverride ? " (harga khusus)" : ""}`, hidden: departure.kind === "private" },
                { label: "Hari menuju berangkat", value: `${diffDays(departure.startDate, today)} hari`, hidden: ended || !!departure.cancelledAt },
                { label: "Catatan", value: departure.notes, hidden: !departure.notes },
              ]}
            />
          </SectionCard>

          <SectionCard title="Guide">
            <Select
              value={departure.guideId ?? NONE}
              disabled={!!editBlock || !!denial("departures.manage") || guide.pending}
              onValueChange={(value) => guide.run(userId, departure.id, value === NONE ? null : value)}
            >
              <SelectTrigger aria-label="Guide" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Belum ditugaskan</SelectItem>
                {guides.map((g) => {
                  const clash = busy(g.id)
                  return (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                      {clash ? ` · bertugas di ${clash.code}` : pkg && !g.destinationIds.includes(pkg.destinationId) ? " · di luar wilayah" : ""}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {assigned && (
              <p className="mt-3 text-xs text-muted-foreground">
                {formatPhone(assigned.phone)} · {assigned.languages.join(", ")}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Guide yang sudah bertugas di tanggal yang tumpang tindih akan ditolak.</p>
          </SectionCard>

          <SectionCard title="Estimasi laba kotor" action={<StatusBadge tone="accent" dot={false}>Estimasi</StatusBadge>}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Pendapatan terkonfirmasi</dt>
                <dd className="tabular-nums">{formatIDR(estimate.revenue)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Biaya rencana ({estimate.pax} pax)</dt>
                <dd className="tabular-nums">{formatIDR(estimate.cost)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold">
                <dt>Laba kotor</dt>
                <dd className={estimate.profit < 0 ? "text-tone-danger tabular-nums" : "tabular-nums"}>{formatIDR(estimate.profit)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Dari template biaya keberangkatan dan booking terkonfirmasi, sebelum overhead dan pajak.</p>
            <Link href={`/dashboard/costing?departure=${departure.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-lagoon-700 hover:underline">
              <Calculator className="size-3.5" aria-hidden="true" /> Buka di HPP & Costing
            </Link>
          </SectionCard>
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === "close"}
        onOpenChange={(open) => setDialog(open ? "close" : null)}
        title="Tutup penjualan keberangkatan ini?"
        description="Keberangkatan tidak bisa dipesan dari website. Booking yang sudah ada tidak berubah."
        confirmLabel="Tutup penjualan"
        pending={salesClosed.pending}
        confirmDisabled={!reason.trim()}
        onConfirm={() => salesClosed.run(userId, departure.id, true, reason)}
      >
        <Field label="Alasan" description="Ditampilkan di website, contoh: Kapal sedang perawatan.">
          {(c) => <Input {...c} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        title="Batalkan keberangkatan?"
        description={`${activeBookings.length} booking aktif (${formatNumber(activeBookings.reduce((n, b) => n + b.pax, 0))} peserta) ikut dibatalkan tanpa biaya pembatalan. Dana yang sudah dibayar menjadi refund.`}
        confirmLabel="Batalkan keberangkatan"
        tone="destructive"
        pending={cancel.pending}
        confirmDisabled={!reason.trim()}
        onConfirm={() => cancel.run(userId, departure.id, reason)}
      >
        <Field label="Alasan pembatalan">
          {(c) => <Textarea {...c} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: peserta minimum tidak tercapai" />}
        </Field>
      </ConfirmDialog>
    </div>
  )
}
