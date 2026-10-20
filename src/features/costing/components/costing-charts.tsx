"use client"

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatIDR, formatIDRCompact } from "@/lib/format"
import { AXIS_TICK, CHART, TOOLTIP_STYLE } from "@/components/dashboard/charts/chart-theme"

const compact = (value: number) => formatIDRCompact(value).replace("Rp", "").trim()

/**
 * Revenue and HPP for every participant count on one IDR axis: where the lines cross is
 * the break-even point, the gap between them is gross profit.
 */
export function RevenueCostChart({ fixed, perPax, price, max, current, breakEven }: { fixed: number; perPax: number; price: number; max: number; current: number; breakEven: number | null }) {
  const data = Array.from({ length: Math.max(2, max) }, (_, i) => {
    const n = i + 1
    return { n, revenue: price * n, hpp: fixed + perPax * n }
  })
  const at = data[Math.min(current, data.length) - 1]
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="n" type="number" domain={[1, data.length]} allowDecimals={false} tickLine={false} axisLine={{ stroke: CHART.grid }} tick={AXIS_TICK} label={{ value: "peserta", position: "insideBottomRight", offset: -2, fontSize: 11, fill: CHART.tick }} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={compact} width={48} />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            labelFormatter={(n) => `${n} peserta`}
            formatter={(value, name) => [formatIDR(Number(value)), name === "revenue" ? "Pendapatan" : "HPP"]}
          />
          {breakEven !== null && breakEven <= data.length && (
            <ReferenceLine x={breakEven} stroke={CHART.axis} strokeWidth={1} label={{ value: `Impas ${breakEven} pax`, position: "insideTopLeft", fontSize: 11, fill: CHART.tick }} />
          )}
          <Line dataKey="revenue" stroke={CHART.series[0]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
          <Line dataKey="hpp" stroke={CHART.series[1]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
          {at && <ReferenceDot x={at.n} y={at.revenue} r={5} fill={CHART.series[0]} stroke="#fff" strokeWidth={2} />}
          {at && <ReferenceDot x={at.n} y={at.hpp} r={5} fill={CHART.series[1]} stroke="#fff" strokeWidth={2} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Cost per category at the simulated participant count; one series, so one hue. */
export function CostBreakdownChart({ rows }: { rows: { label: string; amount: number }[] }) {
  const height = Math.max(120, rows.length * 34 + 16)
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} width={128} interval={0} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: CHART.cursor }} formatter={(value) => [formatIDR(Number(value)), "Biaya"]} />
          <Bar dataKey="amount" fill={CHART.series[0]} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
            <LabelList dataKey="amount" position="right" formatter={(v) => compact(Number(v))} style={{ fontSize: 11, fill: CHART.tick }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
