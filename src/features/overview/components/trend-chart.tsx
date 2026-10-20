"use client"

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { TrendPoint } from "@/domain/rules/metrics"
import { formatDate, formatIDR, formatIDRCompact } from "@/lib/format"

const BAR = "#1c4a75" // ocean-700
const LINE = "#3e9690" // lagoon-500

/** Weekly bookings (bars) and secured value (line). Loaded lazily: recharts is dashboard-only. */
export default function TrendChart({ points }: { points: TrendPoint[] }) {
  const data = points.map((p) => ({ ...p, label: formatDate(p.weekStart, "day-month") }))
  return (
    <div className="h-64 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="#e4e7ec" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#667085" }} interval="preserveStartEnd" minTickGap={16} />
          <YAxis yAxisId="count" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#667085" }} width={36} />
          <YAxis yAxisId="value" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#667085" }} tickFormatter={(v: number) => formatIDRCompact(v).replace("Rp", "")} width={52} />
          <Tooltip
            cursor={{ fill: "#f2f4f7" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e4e7ec", fontSize: 12, boxShadow: "0 8px 24px -12px rgb(16 24 40 / 0.2)" }}
            labelFormatter={(_, payload) => (payload?.[0] ? `Minggu ${formatDate((payload[0].payload as TrendPoint).weekStart)}` : "")}
            formatter={(value, name) => (name === "value" ? [formatIDR(Number(value)), "Nilai terkonfirmasi"] : [String(value), "Booking"])}
          />
          <Bar yAxisId="count" dataKey="bookings" fill={BAR} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Line yAxisId="value" dataKey="value" stroke={LINE} strokeWidth={2} dot={false} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
