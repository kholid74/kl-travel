"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { TrendPoint } from "@/domain/rules/metrics"
import { formatDate, formatIDR } from "@/lib/format"
import { AXIS_TICK, CHART, TOOLTIP_STYLE } from "@/components/dashboard/charts/chart-theme"

/**
 * Weekly bookings on one axis. The secured value sits in the tooltip and the table:
 * a second y-scale on the same plot would invite false comparisons.
 * Loaded lazily: recharts is dashboard-only.
 */
export default function TrendChart({ points }: { points: TrendPoint[] }) {
  const data = points.map((p) => ({ ...p, label: formatDate(p.weekStart, "day-month") }))
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.grid }} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={16} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={36} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: CHART.cursor }}
            labelFormatter={(_, payload) => (payload?.[0] ? `Minggu ${formatDate((payload[0].payload as TrendPoint).weekStart)}` : "")}
            formatter={(value, _name, item) => [`${value} booking · terkonfirmasi ${formatIDR((item.payload as TrendPoint).value)}`, ""]}
            separator=""
          />
          <Bar dataKey="bookings" fill={CHART.series[0]} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
