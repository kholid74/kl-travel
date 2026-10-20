"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo } from "react"
import { Check, LayoutDashboard, MessageCircle } from "lucide-react"
import { formatDateTime, formatPhone } from "@/lib/format"
import { cn } from "@/lib/utils"
import { BUDGET_LABEL, INQUIRY_TYPE_LABEL, INTEREST_LABEL } from "@/domain/labels"
import type { PipelineStage } from "@/domain/entities"
import { NotFoundState } from "@/components/public/not-found-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmationSkeleton } from "@/components/public/flow-shell"
import { useDatabase } from "@/stores/db-store"
import { CUSTOMER_STAGE_TEXT, formatTravelDates } from "../format"

const PROGRESS: { stage: PipelineStage; label: string }[] = [
  { stage: "new", label: "Permintaan diterima" },
  { stage: "contacted", label: "Tim menghubungi Anda" },
  { stage: "quotation_sent", label: "Penawaran dikirim" },
  { stage: "won", label: "Disetujui & booking dibuat" },
]
const STAGE_ORDER: PipelineStage[] = ["new", "contacted", "quotation_sent", "negotiation", "won"]

/** Must sit inside <Suspense>: the code is only known at request time. */
export function InquiryConfirmationRoute() {
  const { code } = useParams<{ code: string }>()
  return <InquiryConfirmation code={decodeURIComponent(code)} />
}

function InquiryConfirmation({ code }: { code: string }) {
  const { db, ready } = useDatabase()
  const view = useMemo(() => {
    if (!db) return null
    const inquiry = Object.values(db.inquiries).find((i) => i.code === code)
    if (!inquiry) return { inquiry: null } as const
    return {
      inquiry,
      pkg: inquiry.packageId ? db.packages[inquiry.packageId] : undefined,
      destinations: inquiry.destinationIds.map((id) => db.destinations[id]).filter(Boolean),
      booking: inquiry.convertedBookingId ? db.bookings[inquiry.convertedBookingId] : undefined,
    }
  }, [db, code])

  if (!ready || !view) return <ConfirmationSkeleton />
  if (!view.inquiry) {
    return (
      <NotFoundState
        title="Permintaan tidak ditemukan"
        description="Data demo hanya tersimpan di browser tempat permintaan dikirim. Permintaan tidak akan ditemukan di perangkat lain atau setelah data demo di-reset."
        backHref="/custom-trip"
        backLabel="Rancang custom trip"
      />
    )
  }

  const { inquiry, pkg, destinations, booking } = view
  const text = CUSTOMER_STAGE_TEXT[inquiry.stage]
  const reached = inquiry.stage === "lost" ? -1 : STAGE_ORDER.indexOf(inquiry.stage)
  const general = inquiry.type === "general"

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Jenis", value: INQUIRY_TYPE_LABEL[inquiry.type] },
    ...(pkg ? [{ label: inquiry.type === "custom" ? "Paket inspirasi" : "Paket", value: <Link href={`/paket/${pkg.slug}`} className="underline-offset-4 hover:underline">{pkg.title}</Link> }] : []),
    ...(!general && destinations.length ? [{ label: "Destinasi", value: destinations.map((d) => d.name).join(", ") }] : []),
    ...(!general ? [{ label: "Tanggal", value: formatTravelDates(inquiry.travelDates) + (inquiry.durationDays ? ` · ${inquiry.durationDays} hari` : "") }] : []),
    ...(!general ? [{ label: "Peserta", value: `${inquiry.groupSize} orang` }] : []),
    ...(inquiry.budgetPerPax ? [{ label: "Budget", value: BUDGET_LABEL[inquiry.budgetPerPax] }] : []),
    ...(inquiry.interests.length ? [{ label: "Minat", value: inquiry.interests.map((i) => INTEREST_LABEL[i]).join(", ") }] : []),
    ...(inquiry.message ? [{ label: general ? "Pertanyaan" : "Catatan", value: inquiry.message }] : []),
    {
      label: "Kontak",
      value: (
        <>
          {inquiry.contactSnapshot.fullName}
          <span className="block text-muted-foreground">
            {formatPhone(inquiry.contactSnapshot.phone)}
            {inquiry.contactSnapshot.email && ` · ${inquiry.contactSnapshot.email}`}
          </span>
        </>
      ),
    },
  ]

  return (
    <div className="container-page max-w-5xl pt-10 pb-24 md:pt-14">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={inquiry.stage === "lost" ? "neutral" : inquiry.stage === "won" ? "success" : "info"}>{text.title}</StatusBadge>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tabular-nums">{inquiry.code}</span>
      </div>
      <div className="mt-5 flex items-start gap-4">
        <MessageCircle className="mt-2 size-8 shrink-0 text-lagoon-700" strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h1 className="font-display text-display-md text-balance text-ocean-900">{general ? "Pertanyaan Anda sudah kami terima" : text.title}</h1>
          <p className="mt-2 max-w-2xl text-body-lg text-muted-foreground">{text.body}</p>
          <p className="mt-2 text-sm text-muted-foreground">Dikirim {formatDateTime(inquiry.createdAt)}</p>
        </div>
      </div>

      {!general && inquiry.stage !== "lost" && (
        <ol className="mt-10 grid gap-3 sm:grid-cols-4" aria-label="Progres permintaan">
          {PROGRESS.map((item, index) => {
            const done = reached >= STAGE_ORDER.indexOf(item.stage)
            return (
              <li key={item.stage} className={cn("border-t-2 pt-3 text-sm", done ? "border-lagoon-600" : "border-border")}>
                <span className={cn("flex items-center gap-1.5 font-medium", done ? "text-foreground" : "text-muted-foreground")}>
                  {done ? <Check className="size-4 text-lagoon-700" aria-hidden="true" /> : <span className="tabular-nums">{index + 1}.</span>}
                  {item.label}
                </span>
                <span className="sr-only">{done ? "selesai" : "belum"}</span>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <section aria-labelledby="ringkasan-permintaan" className="min-w-0 rounded-[4px] border border-border bg-card p-5 sm:p-6 lg:col-span-7">
          <h2 id="ringkasan-permintaan" className="text-base font-semibold text-ocean-900">
            Ringkasan {general ? "pertanyaan" : "permintaan"}
          </h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[140px_1fr]">
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          {booking && (
            <p className="mt-6 rounded-md bg-tone-success-bg px-4 py-3 text-sm text-tone-success">
              Booking sudah dibuat:{" "}
              <Link href={`/konfirmasi/booking/${booking.code}`} className="font-semibold underline underline-offset-4">
                {booking.code}
              </Link>
            </p>
          )}
        </section>

        <aside className="min-w-0 space-y-6 lg:col-span-5">
          {!general && (
            <section className="rounded-[4px] border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-ocean-900">Langkah berikutnya</h2>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>1. Tim kami menghubungi Anda lewat WhatsApp untuk memastikan detail (simulasi).</li>
                <li>2. Anda menerima penawaran berisi itinerary per hari dan rincian harga.</li>
                <li>3. Setelah penawaran disetujui, invoice DP dikirim dan perjalanan dikonfirmasi.</li>
              </ol>
            </section>
          )}
          <section className="rounded-[4px] bg-ocean-900 p-6 text-ivory-50">
            <p className="eyebrow text-sand-300">Lanjutkan demo</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory-50/85">
              Permintaan ini masuk ke pipeline Inquiry di dashboard sebagai tahap <strong>Baru</strong>. Dari sana tim sales membuat penawaran dan
              mengonversinya menjadi booking.
            </p>
            <Link
              href={`/dashboard/inquiries/${inquiry.id}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sand-300 underline-offset-4 hover:underline"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" /> Lihat di dashboard
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
