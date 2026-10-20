"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useMemo, type ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { diffDays } from "@/lib/dates"
import { formatDate, formatDateRange, formatIDR, formatIDRCompact, formatNumber, formatPercent, formatRelativeDay } from "@/lib/format"
import { cn } from "@/lib/utils"
import { BOOKING_STATUS_LABEL, INQUIRY_TYPE_LABEL, PIPELINE_STAGE_LABEL, READINESS_LABEL } from "@/domain/labels"
import {
  bookingTrend,
  followUpsDue,
  incompleteTravelers,
  overviewKpis,
  paymentsDue,
  popularPackages,
  PROFIT_WINDOW_DAYS,
  UPCOMING_WINDOW_DAYS,
  upcomingDepartureRows,
} from "@/domain/rules/metrics"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { ActivityTimeline } from "@/components/dashboard/activity-timeline"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { SectionCard } from "@/components/dashboard/section-card"
import { SeatMeter } from "@/components/shared/seat-meter"
import { StatusBadge } from "@/components/shared/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BOOKING_STATUS_TONE } from "@/features/bookings/labels"
import { STAGE_TONE } from "@/features/inquiries/labels"
import { READINESS_TONE } from "@/features/packages/labels"

const TrendChart = dynamic(() => import("./trend-chart"), { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> })

const PERIODS = [
  { value: "7", label: "7 hari" },
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
]

function WidgetList({ children, empty }: { children: ReactNode[]; empty: string }) {
  if (children.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  return <ul className="-my-2 divide-y divide-line">{children}</ul>
}

function SeeAll({ href, label = "Lihat semua" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-lagoon-700 hover:underline">
      {label} <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}

export function OverviewPage() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(["periode"] as const)
  const days = PERIODS.some((p) => p.value === query.periode) ? Number(query.periode) : 30

  const data = useMemo(() => {
    if (!live) return null
    const { db, now } = live
    return {
      kpis: overviewKpis(db, now, days),
      trend: bookingTrend(db, now, 12),
      popular: popularPackages(db, now, 90, 5),
      followUps: followUpsDue(db, now).slice(0, 6),
      payments: paymentsDue(db, now, 7).slice(0, 6),
      departures: upcomingDepartureRows(db, now, UPCOMING_WINDOW_DAYS).slice(0, 6),
      incomplete: incompleteTravelers(db, now, UPCOMING_WINDOW_DAYS).slice(0, 6),
      activity: Object.values(db.activity)
        .filter((e) => e.subject.type === "booking" || e.subject.type === "inquiry")
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8),
    }
  }, [live, days])

  if (!live || !data) return <PageSkeleton variant="overview" />
  const { db, today } = live
  const { kpis } = data
  const changeLabel = `vs ${days} hari sebelumnya`
  const trendTotal = data.trend.reduce((sum, p) => sum + p.bookings, 0)
  const trendValue = data.trend.reduce((sum, p) => sum + p.value, 0)
  const maxPax = Math.max(1, ...data.popular.map((p) => p.pax))

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan operasional per ${formatDate(today, "weekday")}. Semua angka dihitung dari data booking, inquiry, dan pembayaran.`}
        actions={
          <div role="radiogroup" aria-label="Periode KPI" className="inline-flex rounded-md border border-line bg-card p-0.5">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                type="button"
                role="radio"
                aria-checked={days === Number(period.value)}
                onClick={() => setQuery({ periode: period.value === "30" ? null : period.value })}
                className={cn(
                  "h-8 rounded-[5px] px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  days === Number(period.value) ? "bg-ocean-800 text-white" : "text-text-muted hover:text-text-strong",
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total booking"
          value={formatNumber(kpis.bookings.value)}
          change={kpis.bookings.change}
          changeLabel={changeLabel}
          hint="Booking baru di periode ini, tidak termasuk yang dibatalkan."
          href="/dashboard/bookings"
        />
        <KpiCard
          label="Nilai booking"
          value={formatIDR(kpis.bookingValue.value)}
          change={kpis.bookingValue.change}
          changeLabel={changeLabel}
          hint={<>Booking terkonfirmasi. Pipeline belum terkonfirmasi: <strong className="text-text-strong">{formatIDR(kpis.bookingValue.pipeline)}</strong></>}
          href="/dashboard/bookings"
        />
        <KpiCard
          label="Inquiry baru"
          value={formatNumber(kpis.inquiries.value)}
          change={kpis.inquiries.change}
          changeLabel={changeLabel}
          hint={
            kpis.inquiries.conversionRate === null
              ? "Belum ada inquiry periode ini yang berhasil atau gagal."
              : `Konversi ${formatPercent(kpis.inquiries.conversionRate, 0)} (${kpis.inquiries.won} berhasil, ${kpis.inquiries.lost} gagal)`
          }
          href="/dashboard/inquiries"
        />
        <KpiCard
          label="Keberangkatan mendatang"
          value={formatNumber(kpis.upcoming.departures)}
          hint={`${UPCOMING_WINDOW_DAYS} hari ke depan · ${kpis.upcoming.pax} peserta terkonfirmasi`}
          href="/dashboard/departures"
        />
        <KpiCard
          label="Pembayaran tertunda"
          value={formatIDR(kpis.outstanding.amount)}
          hint={
            <>
              {kpis.outstanding.bookings} booking belum lunas.{" "}
              {kpis.outstanding.overdue > 0 ? (
                <strong className="text-tone-danger">Lewat jatuh tempo {formatIDR(kpis.outstanding.overdue)}</strong>
              ) : (
                "Tidak ada yang lewat jatuh tempo."
              )}
            </>
          }
          href="/dashboard/bookings?bayar=belum-lunas"
        />
        <KpiCard
          label="Estimasi profitabilitas"
          value={formatIDR(kpis.profitability.profit)}
          badge={<StatusBadge tone="accent" dot={false} className="h-5 px-2 text-[0.6875rem]">Estimasi</StatusBadge>}
          hint={
            kpis.profitability.margin === null
              ? `Belum ada peserta terkonfirmasi untuk ${PROFIT_WINDOW_DAYS} hari ke depan.`
              : `Laba kotor ${kpis.profitability.departures} keberangkatan dalam ${PROFIT_WINDOW_DAYS} hari · margin ${formatPercent(kpis.profitability.margin)}`
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <SectionCard
          className="xl:col-span-8"
          title="Tren booking"
          description="12 minggu terakhir: jumlah booking (batang) dan nilai yang sudah terkonfirmasi (garis)."
        >
          <TrendChart points={data.trend} />
          <p className="mt-3 text-sm text-muted-foreground">
            {trendTotal} booking dalam 12 minggu, nilai terkonfirmasi {formatIDR(trendValue)}. Minggu ini {data.trend.at(-1)?.bookings ?? 0} booking.
          </p>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-lagoon-700">Lihat data dalam tabel</summary>
            <table className="mt-2 w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-text-muted">
                  <th className="py-1.5 font-medium">Minggu mulai</th>
                  <th className="py-1.5 text-right font-medium">Booking</th>
                  <th className="py-1.5 text-right font-medium">Nilai terkonfirmasi</th>
                </tr>
              </thead>
              <tbody>
                {data.trend.map((point) => (
                  <tr key={point.weekStart} className="border-b border-line last:border-0">
                    <td className="py-1.5">{formatDate(point.weekStart)}</td>
                    <td className="py-1.5 text-right tabular-nums">{point.bookings}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatIDR(point.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </SectionCard>

        <SectionCard className="xl:col-span-4" title="Paket terpopuler" description="Berdasarkan jumlah peserta, 90 hari terakhir.">
          <WidgetList empty="Belum ada booking dalam 90 hari terakhir.">
            {data.popular.map((row, index) => (
              <li key={row.pkg.id} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/dashboard/packages/${row.pkg.id}`} className="min-w-0 truncate font-medium text-text-strong hover:underline">
                    <span className="mr-2 text-text-subtle tabular-nums">{index + 1}.</span>
                    {row.pkg.title}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{row.pax} pax</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-ocean-700" style={{ width: `${(row.pax / maxPax) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-text-subtle">
                  {row.bookings} booking · {formatIDRCompact(row.revenue)} terkonfirmasi
                </p>
              </li>
            ))}
          </WidgetList>
        </SectionCard>

        <SectionCard className="xl:col-span-6" title="Inquiry perlu follow-up" action={<SeeAll href="/dashboard/inquiries" />}>
          <WidgetList empty="Tidak ada follow-up yang tertunda.">
            {data.followUps.map(({ inquiry, overdueDays }) => (
              <li key={inquiry.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/dashboard/inquiries/${inquiry.id}`} className="block truncate text-sm font-medium text-text-strong hover:underline">
                    {inquiry.contactSnapshot.fullName}
                  </Link>
                  <p className="truncate text-xs text-text-subtle">
                    {inquiry.code} · {INQUIRY_TYPE_LABEL[inquiry.type]} · {inquiry.groupSize} orang
                    {inquiry.assigneeId && ` · ${db.users[inquiry.assigneeId]?.name.split(" ")[0]}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge tone={STAGE_TONE[inquiry.stage]}>{PIPELINE_STAGE_LABEL[inquiry.stage]}</StatusBadge>
                  <span className={cn("text-xs", overdueDays && overdueDays > 0 ? "font-semibold text-tone-danger" : "text-text-subtle")}>
                    {overdueDays === null ? "Belum dihubungi" : overdueDays === 0 ? "Jadwal hari ini" : `Terlambat ${overdueDays} hari`}
                  </span>
                </div>
              </li>
            ))}
          </WidgetList>
        </SectionCard>

        <SectionCard className="xl:col-span-6" title="Pembayaran jatuh tempo" description="Termin yang jatuh tempo dalam 7 hari atau sudah lewat.">
          <WidgetList empty="Tidak ada termin yang jatuh tempo dalam 7 hari.">
            {data.payments.map(({ booking, installment, remaining, overdue }) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/dashboard/bookings/${booking.id}`} className="block truncate text-sm font-medium text-text-strong hover:underline">
                    {db.customers[booking.customerId]?.fullName}
                  </Link>
                  <p className="truncate text-xs text-text-subtle">
                    {booking.code} · {installment.label}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-text-strong tabular-nums">{formatIDR(remaining)}</p>
                  <p className={cn("text-xs", overdue ? "font-semibold text-tone-danger" : "text-text-subtle")}>
                    {overdue ? `Lewat ${diffDays(today, installment.dueDate)} hari` : `Jatuh tempo ${formatRelativeDay(installment.dueDate, today).toLowerCase()}`}
                  </p>
                </div>
              </li>
            ))}
          </WidgetList>
        </SectionCard>

        <SectionCard className="xl:col-span-8" title="Keberangkatan mendatang" description={`${UPCOMING_WINDOW_DAYS} hari ke depan, termasuk yang sedang berjalan.`} action={<SeeAll href="/dashboard/departures" />}>
          <WidgetList empty="Tidak ada keberangkatan dalam 30 hari ke depan.">
            {data.departures.map(({ departure, pkg, seats, readiness }) => (
              <li key={departure.id} className="grid gap-x-5 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_150px_232px] sm:items-center">
                <div className="min-w-0">
                  <Link href={`/dashboard/departures/${departure.id}`} className="block truncate text-sm font-medium text-text-strong hover:underline">
                    {pkg?.title}
                  </Link>
                  <p className="truncate text-xs text-text-subtle">
                    {formatDateRange(departure.startDate, departure.endDate)} · {departure.code}
                    {departure.kind === "private" && " · privat"}
                  </p>
                </div>
                <div>
                  <SeatMeter seats={seats} showLegend={false} />
                  <p className="mt-1 text-xs text-text-subtle tabular-nums">
                    {seats.allocated}/{seats.capacity} terisi{seats.held > 0 && ` · ${seats.held} ditahan`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <StatusBadge tone={READINESS_TONE[readiness.status]}>
                    {READINESS_LABEL[readiness.status]}
                    {readiness.status === "preparing" && ` ${Math.round(readiness.progress * 100)}%`}
                  </StatusBadge>
                  {readiness.atRisk && <StatusBadge tone="danger">Perlu perhatian</StatusBadge>}
                </div>
              </li>
            ))}
          </WidgetList>
        </SectionCard>

        <SectionCard className="xl:col-span-4" title="Data peserta belum lengkap" description="Keberangkatan dalam 30 hari.">
          <WidgetList empty="Data peserta untuk 30 hari ke depan sudah lengkap.">
            {data.incomplete.map(({ booking, departure, missing, pax }) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/dashboard/bookings/${booking.id}#peserta`} className="block truncate text-sm font-medium text-text-strong hover:underline">
                    {db.customers[booking.customerId]?.fullName}
                  </Link>
                  <p className="truncate text-xs text-text-subtle">
                    {booking.code} · berangkat {formatDate(departure.startDate, "day-month")}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-tone-warning tabular-nums">
                  {missing}/{pax} belum lengkap
                </span>
              </li>
            ))}
          </WidgetList>
        </SectionCard>

        <SectionCard className="xl:col-span-12" title="Aktivitas booking & inquiry terbaru">
          <ActivityTimeline events={data.activity} users={db.users} />
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4 text-xs text-muted-foreground">
            Status booking saat ini:
            {(Object.keys(BOOKING_STATUS_LABEL) as (keyof typeof BOOKING_STATUS_LABEL)[]).map((status) => {
              const count = Object.values(db.bookings).filter((b) => b.status === status).length
              return (
                <Link key={status} href={`/dashboard/bookings?status=${status}`}>
                  <StatusBadge tone={BOOKING_STATUS_TONE[status]}>
                    {BOOKING_STATUS_LABEL[status]} · {count}
                  </StatusBadge>
                </Link>
              )
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
