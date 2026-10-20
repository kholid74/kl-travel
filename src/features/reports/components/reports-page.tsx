"use client"

import Link from "next/link"
import { useMemo } from "react"
import { diffDays } from "@/lib/dates"
import { formatDate, formatDateRange, formatIDR, formatIDRCompact, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { SOURCE_LABEL } from "@/domain/labels"
import {
  AGING_LABEL,
  bookingTrendReport,
  departureOccupancy,
  leadConversion,
  outstandingAging,
  popularDestinations,
  profitabilityReport,
  reportRange,
  salesByPackage,
  type AgingBucket,
  type ReportRangeKey,
} from "@/domain/rules/reports"
import { useLive } from "@/hooks/use-live"
import { useQueryParams } from "@/hooks/use-query-params"
import { ChartFrame, ChartTable } from "@/components/dashboard/charts/chart-frame"
import { CHART } from "@/components/dashboard/charts/chart-theme"
import { FilterBar, FilterSelect } from "@/components/dashboard/filters"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { SectionCard } from "@/components/dashboard/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Input } from "@/components/ui/input"
import { ColumnChart, HBarChart } from "./report-charts"

const KEYS = ["range", "from", "to"] as const
const RANGES: { value: ReportRangeKey; label: string }[] = [
  { value: "30d", label: "30 hari terakhir" },
  { value: "90d", label: "90 hari terakhir" },
  { value: "ytd", label: "Tahun ini" },
  { value: "custom", label: "Rentang khusus" },
]
const AGING_COLOR: Record<AgingBucket, string> = {
  not_due: CHART.status.good,
  "1_7": CHART.status.warning,
  "8_30": CHART.status.serious,
  over_30: CHART.status.critical,
}
const compact = (value: number) => formatIDRCompact(value).replace("Rp", "").trim()
const shortMonth = (date: string) => {
  const [month, year] = formatDate(date, "month-year").split(" ")
  return `${month.slice(0, 3)} ${year.slice(2)}`
}

export function ReportsPage() {
  const live = useLive()
  const [query, setQuery] = useQueryParams(KEYS)
  const key = (RANGES.some((r) => r.value === query.range) ? query.range : "30d") as ReportRangeKey

  const report = useMemo(() => {
    if (!live) return null
    const { db, now, today } = live
    const range = reportRange(key, today, { from: query.from, to: query.to })
    return {
      range,
      trend: bookingTrendReport(db, range),
      sales: salesByPackage(db, range),
      destinations: popularDestinations(db, range),
      leads: leadConversion(db, range),
      occupancy: departureOccupancy(db, range, now),
      aging: outstandingAging(db, today),
      profit: profitabilityReport(db, range, today),
    }
  }, [live, key, query.from, query.to])

  if (!live || !report) return <PageSkeleton />
  const { range, trend, sales, destinations, leads, occupancy, aging, profit } = report
  const invalidCustom = key === "custom" && range.key !== "custom"

  const created = trend.buckets.reduce((s, b) => s + b.bookings, 0)
  const cancelled = trend.buckets.reduce((s, b) => s + b.cancelled, 0)
  const securedValue = trend.buckets.reduce((s, b) => s + b.value, 0)
  const peak = trend.buckets.reduce((best, b) => (b.bookings > (best?.bookings ?? -1) ? b : best), trend.buckets[0])
  const bucketLabel = (start: string) => (trend.unit === "week" ? formatDate(start, "day-month") : shortMonth(start))
  const agingTotal = Object.values(aging.totals).reduce((a, b) => a + b, 0)
  const overdue = agingTotal - aging.totals.not_due
  const funnelBase = leads.funnel[0].count
  const bestSource = leads.bySource.filter((s) => s.winRate !== null && s.won + s.lost >= 2).sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0]
  const profitRows = profit.rows.slice(-12)
  const losses = profit.rows.filter((r) => r.estimate.profit < 0)
  const lowOccupancy = occupancy.rows.filter((r) => r.occupancy < 0.5).length

  return (
    <div>
      <PageHeader
        title="Laporan"
        description={`Periode ${formatDateRange(range.from, range.to)} (${diffDays(range.to, range.from) + 1} hari). Semua angka dihitung dari data booking, inquiry, dan pembayaran yang sama dengan modul lain.`}
      />

      <FilterBar>
        <FilterSelect label="Periode" value={key === "30d" ? "" : key} onChange={(range) => setQuery({ range: range === "30d" ? null : range })} allLabel="30 hari terakhir" options={RANGES.slice(1)} />
        {key === "custom" && (
          <>
            <Input type="date" aria-label="Dari tanggal" className="h-9 w-40 bg-card" max={live.today} value={query.from} onChange={(e) => setQuery({ from: e.target.value })} />
            <span className="text-sm text-text-muted">s.d.</span>
            <Input type="date" aria-label="Sampai tanggal" className="h-9 w-40 bg-card" max={live.today} value={query.to} onChange={(e) => setQuery({ to: e.target.value })} />
          </>
        )}
        {invalidCustom && <p className="text-xs text-tone-warning">Pilih tanggal awal dan akhir yang valid. Sementara menampilkan 30 hari terakhir.</p>}
      </FilterBar>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Booking baru" value={formatNumber(created)} hint={`${cancelled} dibatalkan · nilai terkonfirmasi ${formatIDR(securedValue)}`} />
        <KpiCard label="Konversi inquiry" value={leads.winRate === null ? "—" : formatPercent(leads.winRate)} hint={`${leads.won} berhasil dari ${leads.won + leads.lost} inquiry yang selesai`} />
        <KpiCard label="Okupansi open trip" value={occupancy.average === null ? "—" : formatPercent(occupancy.average, 0)} hint={`${occupancy.rows.length} jadwal berangkat dalam periode`} />
        <KpiCard
          label="Laba kotor estimasi"
          value={formatIDR(profit.estimated.profit)}
          badge={<StatusBadge tone="accent" dot={false} className="h-5 px-2 text-[0.6875rem]">Estimasi</StatusBadge>}
          hint={profit.estimated.margin === null ? "Belum ada peserta terkonfirmasi" : `margin ${formatPercent(profit.estimated.margin)} · ${profit.rows.length} keberangkatan`}
          href="/dashboard/costing"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Tren booking" description={`Booking dibuat per ${trend.unit === "week" ? "minggu" : "bulan"}, menurut status saat ini.`} className="xl:col-span-2">
          <ChartFrame
            legend={[
              { label: "Aktif", color: CHART.series[0] },
              { label: "Dibatalkan", color: CHART.series[1] },
            ]}
            summary={
              created + cancelled === 0
                ? "Tidak ada booking dalam periode ini."
                : `${created} booking aktif dan ${cancelled} dibatalkan. Nilai yang sudah terkonfirmasi ${formatIDR(securedValue)}. Terbanyak pada ${trend.unit === "week" ? "minggu" : "bulan"} ${bucketLabel(peak.start)} dengan ${peak.bookings} booking.`
            }
            table={
              <ChartTable
                head={[trend.unit === "week" ? "Minggu mulai" : "Bulan", "Aktif", "Dibatalkan", "Nilai terkonfirmasi"]}
                align={["left", "right", "right", "right"]}
                rows={trend.buckets.map((b) => [trend.unit === "week" ? formatDate(b.start) : formatDate(b.start, "month-year"), b.bookings, b.cancelled, formatIDR(b.value)])}
              />
            }
          >
            <ColumnChart
              data={trend.buckets.map((b) => ({ label: bucketLabel(b.start), bookings: b.bookings, cancelled: b.cancelled }))}
              categoryKey="label"
              series={[
                { key: "bookings", label: "Aktif", color: CHART.series[0] },
                { key: "cancelled", label: "Dibatalkan", color: CHART.series[1] },
              ]}
              format={(v) => formatNumber(v)}
            />
          </ChartFrame>
        </SectionCard>

        <SectionCard title="Penjualan per paket" description="Booking aktif yang dibuat dalam periode. Terkonfirmasi = sudah membayar DP.">
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada penjualan dalam periode ini.</p>
          ) : (
            <ChartFrame
              legend={[
                { label: "Terkonfirmasi", color: CHART.series[0] },
                { label: "Menunggu pembayaran", color: CHART.series[1] },
              ]}
              summary={`${sales[0].pkg.title} memimpin dengan nilai terkonfirmasi ${formatIDR(sales[0].value)} dari ${sales[0].bookings} booking. ${sales.length} paket terjual; ${formatIDR(sales.reduce((s, r) => s + r.pipeline, 0))} masih menunggu verifikasi atau pembayaran.`}
              table={
                <ChartTable
                  head={["Paket", "Booking", "Pax", "Terkonfirmasi", "Menunggu"]}
                  align={["left", "right", "right", "right", "right"]}
                  rows={sales.map((r) => [r.pkg.title, r.bookings, r.pax, formatIDR(r.value), formatIDR(r.pipeline)])}
                />
              }
            >
              <HBarChart
                data={sales.slice(0, 8).map((r) => ({ name: r.pkg.title, value: r.value, pipeline: r.pipeline }))}
                categoryKey="name"
                stacked
                series={[
                  { key: "value", label: "Terkonfirmasi", color: CHART.series[0] },
                  { key: "pipeline", label: "Menunggu pembayaran", color: CHART.series[1] },
                ]}
                format={compact}
              />
            </ChartFrame>
          )}
        </SectionCard>

        <SectionCard title="Destinasi populer" description="Peserta dari booking aktif dan jumlah inquiry yang menyebut destinasi.">
          {destinations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada permintaan dalam periode ini.</p>
          ) : (
            <ChartFrame
              summary={`${destinations[0].destination.name} paling diminati: ${destinations[0].pax} peserta dari ${destinations[0].bookings} booking, ditambah ${destinations[0].inquiries} inquiry.`}
              table={
                <ChartTable
                  head={["Destinasi", "Peserta", "Booking", "Inquiry"]}
                  align={["left", "right", "right", "right"]}
                  rows={destinations.map((r) => [r.destination.name, r.pax, r.bookings, r.inquiries])}
                />
              }
            >
              <HBarChart
                data={destinations.map((r) => ({ name: r.destination.name, pax: r.pax, label: `${r.pax} pax` }))}
                categoryKey="name"
                series={[{ key: "pax", label: "Peserta", color: CHART.series[0] }]}
                format={(v) => formatNumber(v)}
                labelKey="label"
                categoryWidth={120}
              />
            </ChartFrame>
          )}
        </SectionCard>

        <SectionCard title="Konversi inquiry" description="Inquiry yang masuk dalam periode dan sejauh mana prosesnya.">
          <ChartFrame
            summary={
              leads.total === 0
                ? "Tidak ada inquiry dalam periode ini."
                : `${leads.total} inquiry masuk: ${leads.won} berhasil, ${leads.lost} gagal, ${leads.open} masih berjalan. Tingkat konversi ${leads.winRate === null ? "belum ada" : formatPercent(leads.winRate)} (berhasil dibagi yang sudah selesai).${bestSource ? ` Sumber terbaik: ${SOURCE_LABEL[bestSource.source]} (${formatPercent(bestSource.winRate ?? 0, 0)}).` : ""}`
            }
            tableLabel="Lihat per sumber"
            table={
              <ChartTable
                head={["Sumber", "Inquiry", "Berhasil", "Gagal", "Konversi"]}
                align={["left", "right", "right", "right", "right"]}
                rows={leads.bySource.map((s) => [SOURCE_LABEL[s.source], s.total, s.won, s.lost, s.winRate === null ? "—" : formatPercent(s.winRate, 0)])}
              />
            }
          >
            <HBarChart
              data={leads.funnel.map((step) => ({ name: step.label, count: step.count, label: funnelBase ? `${step.count} · ${formatPercent(step.count / funnelBase, 0)}` : "0" }))}
              categoryKey="name"
              series={[{ key: "count", label: "Inquiry", color: CHART.ordinal[2] }]}
              colorOf={(_, index) => CHART.ordinal[index] ?? CHART.ordinal[3]}
              format={(v) => formatNumber(v)}
              labelKey="label"
              categoryWidth={140}
            />
          </ChartFrame>
        </SectionCard>

        <SectionCard title="Umur tagihan" description="Posisi hari ini, tidak terpengaruh filter periode. Sisa setiap termin booking yang masih aktif.">
          <ChartFrame
            summary={agingTotal === 0 ? "Tidak ada tagihan yang belum dibayar." : `Sisa tagihan ${formatIDR(agingTotal)}; ${formatIDR(overdue)} di antaranya sudah lewat jatuh tempo${aging.totals.over_30 > 0 ? `, termasuk ${formatIDR(aging.totals.over_30)} yang lewat lebih dari 30 hari` : ""}.`}
            tableLabel="Lihat termin yang belum dibayar"
            table={
              <ChartTable
                head={["Booking", "Termin", "Jatuh tempo", "Sisa", "Keterlambatan"]}
                align={["left", "left", "left", "right", "right"]}
                rows={aging.items.map((item) => [
                  <Link key={item.installment.id} href={`/dashboard/bookings/${item.booking.id}`} className="hover:underline">
                    {item.booking.code}
                  </Link>,
                  item.installment.label,
                  formatDate(item.installment.dueDate),
                  formatIDR(item.remaining),
                  item.daysLate ? `${item.daysLate} hari` : "—",
                ])}
              />
            }
          >
            <HBarChart
              data={(Object.keys(AGING_LABEL) as AgingBucket[]).map((bucket) => ({ bucket, name: AGING_LABEL[bucket], amount: aging.totals[bucket], label: compact(aging.totals[bucket]) }))}
              categoryKey="name"
              series={[{ key: "amount", label: "Sisa tagihan", color: CHART.status.good }]}
              colorOf={(row) => AGING_COLOR[row.bucket as AgingBucket]}
              format={compact}
              labelKey="label"
              categoryWidth={130}
            />
          </ChartFrame>
          <p className="mt-3 text-xs">
            <Link href="/dashboard/invoices?status=belum-lunas" className="font-semibold text-lagoon-700 hover:underline">
              Buka invoice belum lunas
            </Link>
          </p>
        </SectionCard>

        <SectionCard className="xl:col-span-2" title="Okupansi keberangkatan" description="Jadwal open trip yang berangkat dalam periode: kursi terkonfirmasi dibanding kapasitas.">
          {occupancy.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada jadwal open trip dalam periode ini.</p>
          ) : (
            <ChartFrame
              summary={`${occupancy.rows.length} jadwal dengan okupansi rata-rata ${formatPercent(occupancy.average ?? 0, 0)}. ${occupancy.rows.filter((r) => r.guaranteed).length} sudah memenuhi peserta minimum${lowOccupancy ? `, ${lowOccupancy} masih di bawah 50%` : ""}.`}
              table={
                <ChartTable
                  head={["Keberangkatan", "Tanggal", "Terisi", "Kapasitas", "Okupansi", "Pasti berangkat"]}
                  align={["left", "left", "right", "right", "right", "left"]}
                  rows={occupancy.rows.map((r) => [
                    <Link key={r.departure.id} href={`/dashboard/departures/${r.departure.id}`} className="hover:underline">
                      {r.pkg?.title}
                    </Link>,
                    formatDateRange(r.departure.startDate, r.departure.endDate),
                    r.allocated,
                    r.capacity,
                    formatPercent(r.occupancy, 0),
                    r.guaranteed ? "Ya" : "Belum",
                  ])}
                />
              }
            >
              <HBarChart
                data={occupancy.rows.map((r) => ({ name: `${r.pkg?.title ?? r.departure.code} · ${formatDate(r.departure.startDate, "day-month")}`, pct: Math.round(r.occupancy * 100), label: `${r.allocated}/${r.capacity}` }))}
                categoryKey="name"
                series={[{ key: "pct", label: "Okupansi (%)", color: CHART.series[0] }]}
                format={(v) => `${v}%`}
                labelKey="label"
                categoryWidth={190}
              />
            </ChartFrame>
          )}
        </SectionCard>

        <SectionCard
          title="Estimasi vs realisasi profit"
          description="Laba kotor per keberangkatan yang berangkat dalam periode. Realisasi hanya muncul bila trip selesai dan seluruh biaya aktual tercatat."
          className="xl:col-span-2"
        >
          {profit.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada keberangkatan dengan peserta terkonfirmasi dalam periode ini.</p>
          ) : (
            <ChartFrame
              legend={[
                { label: "Laba kotor estimasi", color: CHART.series[0] },
                { label: "Laba kotor realisasi", color: CHART.series[1] },
              ]}
              summary={
                <>
                  Estimasi laba kotor {formatIDR(profit.estimated.profit)}
                  {profit.estimated.margin !== null && ` (margin ${formatPercent(profit.estimated.margin)})`} untuk {profit.rows.length} keberangkatan.{" "}
                  {profit.realized.departures > 0
                    ? `Realisasi tersedia untuk ${profit.realized.departures} keberangkatan: ${formatIDR(profit.realized.profit)}${profit.realized.margin !== null ? ` (margin ${formatPercent(profit.realized.margin)})` : ""}.`
                    : "Belum ada realisasi yang dapat dihitung."}{" "}
                  {profit.rows.length - profit.realized.departures} lainnya belum dapat dihitung.
                  {losses.length > 0 && <span className="text-tone-danger"> {losses.length} keberangkatan diperkirakan rugi.</span>}
                  {profit.rows.length > profitRows.length && ` Grafik menampilkan ${profitRows.length} keberangkatan terakhir; tabel memuat semuanya.`}
                </>
              }
              table={
                <ChartTable
                  head={["Keberangkatan", "Pax", "Pendapatan", "Laba estimasi", "Laba realisasi"]}
                  align={["left", "right", "right", "right", "right"]}
                  rows={profit.rows.map((r) => [
                    <Link key={r.estimate.departure.id} href={`/dashboard/costing?departure=${r.estimate.departure.id}`} className="hover:underline">
                      {r.pkg?.title} · {formatDate(r.estimate.departure.startDate)}
                    </Link>,
                    r.estimate.pax,
                    formatIDR(r.estimate.revenue),
                    <span key="e" className={cn(r.estimate.profit < 0 && "text-tone-danger")}>
                      {formatIDR(r.estimate.profit)}
                    </span>,
                    r.realized.profit === null ? <span key="r" className="text-text-subtle">Belum dapat dihitung</span> : formatIDR(r.realized.profit),
                  ])}
                />
              }
            >
              <HBarChart
                data={profitRows.map((r) => ({ name: `${r.pkg?.title ?? r.estimate.departure.code} · ${formatDate(r.estimate.departure.startDate, "day-month")}`, estimate: r.estimate.profit, realized: r.realized.profit }))}
                categoryKey="name"
                series={[
                  { key: "estimate", label: "Laba kotor estimasi", color: CHART.series[0] },
                  { key: "realized", label: "Laba kotor realisasi", color: CHART.series[1] },
                ]}
                format={compact}
                categoryWidth={220}
              />
            </ChartFrame>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
