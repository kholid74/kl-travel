"use client"

import type { Destination, TourPackage } from "@/domain/entities"
import { buildInstallments } from "@/domain/rules/invoice-schedule"
import { formatDate, formatDateRange, formatDuration, formatIDR } from "@/lib/format"
import { SummaryCard } from "@/components/public/flow-shell"
import { SmartImage } from "@/components/shared/smart-image"
import type { DepartureOption } from "@/services/queries/catalog"

/** Aside of the Open Trip flow: what is being booked and how payment will work. */
export function BookingSummary({
  pkg,
  destination,
  option,
  pax,
  today,
}: {
  pkg: TourPackage
  destination?: Destination
  option: DepartureOption | null
  pax: number
  today: string | null
}) {
  const total = option ? option.pricePerPax * pax : null
  const schedule =
    option && total !== null && today
      ? buildInstallments({
          total,
          depositPercent: pkg.paymentTerms.depositPercent,
          balanceDueDaysBefore: pkg.paymentTerms.balanceDueDaysBefore,
          departureStart: option.departure.startDate,
          today,
          depositDueDate: today,
        })
      : null

  return (
    <SummaryCard>
      <div className="flex gap-4">
        <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-[2px] bg-muted">
          <SmartImage mediaId={pkg.coverMediaId} fill sizes="96px" />
        </div>
        <div className="min-w-0">
          <p className="eyebrow text-muted-foreground">
            {destination?.name} · {formatDuration(pkg.durationDays, pkg.durationNights)}
          </p>
          <p className="mt-1 font-semibold text-balance text-ocean-900">{pkg.title}</p>
        </div>
      </div>
      <dl className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Keberangkatan</dt>
          <dd className="text-right font-medium">{option ? formatDateRange(option.departure.startDate, option.departure.endDate) : "Belum dipilih"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Peserta</dt>
          <dd className="font-medium tabular-nums">{pax} orang</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Harga per orang</dt>
          <dd className="font-medium tabular-nums">{option ? formatIDR(option.pricePerPax) : "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">Total</dt>
          <dd className="text-xl font-semibold text-ocean-900 tabular-nums">{total !== null ? formatIDR(total) : "—"}</dd>
        </div>
      </dl>
      {schedule && (
        <div className="mt-5 rounded-md bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Jadwal pembayaran (perkiraan)</p>
          <ul className="mt-1.5 space-y-1">
            {schedule.map((installment) => (
              <li key={installment.kind} className="flex justify-between gap-3">
                <span>
                  {installment.label}
                  {installment.kind === "balance" && `, paling lambat ${formatDate(installment.dueDate)}`}
                </span>
                <span className="font-medium text-foreground tabular-nums">{formatIDR(installment.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">Invoice dikirim setelah tim kami memverifikasi pemesanan. Belum ada pembayaran di langkah ini.</p>
        </div>
      )}
    </SummaryCard>
  )
}
