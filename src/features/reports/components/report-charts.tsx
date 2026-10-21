"use client"

import { useEffect, useRef, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CHART, AXIS_TICK, TOOLTIP_STYLE } from "@/components/dashboard/charts/chart-theme"

export interface BarSeries {
  key: string
  label: string
  color: string
}

type Row = Record<string, string | number | null>

/** Gap between touching segments, drawn in the surface color (no outline around marks). */
const GAP = { stroke: "#ffffff", strokeWidth: 2 }

/**
 * One-line category label, shortened to the axis width (recharts would wrap it onto two
 * lines). The full name stays in the tooltip, the native title, and the table view.
 */
function CategoryTick({ x, y, payload, width }: { x?: number | string; y?: number | string; payload?: { value: string }; width: number }) {
  const value = String(payload?.value ?? "")
  const max = Math.floor(width / 6.1)
  const text = value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value
  return (
    <text x={Number(x) - 6} y={Number(y)} dy={4} textAnchor="end" fontSize={AXIS_TICK.fontSize} fill={AXIS_TICK.fill}>
      <title>{value}</title>
      {text}
    </text>
  )
}

/**
 * Columns over time. With two series they stack; only the top segment gets the rounded end.
 */
export function ColumnChart({ data, categoryKey, series, format, height = 256 }: { data: Row[]; categoryKey: string; series: BarSeries[]; format: (value: number) => string; height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={categoryKey} tickLine={false} axisLine={{ stroke: CHART.grid }} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={12} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={(v: number) => format(v)} width={44} />
          <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: CHART.cursor }} formatter={(value, name) => [format(Number(value)), series.find((s) => s.key === name)?.label ?? String(name)]} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} stackId="stack" fill={s.color} maxBarSize={24} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} {...GAP} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Horizontal bars, one row per category. `stacked` adds the series end to end; otherwise
 * they sit side by side (grouped) on the same axis. Negative values grow left of zero.
 */
export function HBarChart({
  data,
  categoryKey,
  series,
  format,
  stacked = false,
  labelKey,
  colorOf,
  categoryWidth = 160,
}: {
  data: Row[]
  categoryKey: string
  series: BarSeries[]
  format: (value: number) => string
  stacked?: boolean
  /** Direct label at the bar tip (one series only). */
  labelKey?: string
  /** Per-bar color for a single series (ordinal or status scales). */
  colorOf?: (row: Row, index: number) => string
  categoryWidth?: number
}) {
  // Narrow screens give the labels at most ~40% of the plot so the bars stay readable.
  const ref = useRef<HTMLDivElement>(null)
  const [boxWidth, setBoxWidth] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const labelWidth = boxWidth ? Math.min(categoryWidth, Math.max(84, Math.round(boxWidth * 0.4))) : categoryWidth
  const perRow = stacked || series.length === 1 ? 30 : 18 * series.length + 14
  const height = Math.max(120, data.length * perRow + 24)
  const hasNegative = data.some((row) => series.some((s) => Number(row[s.key] ?? 0) < 0))
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart accessibilityLayer={false} data={data} layout="vertical" margin={{ top: 0, right: labelKey ? 72 : 16, bottom: 0, left: 0 }} barCategoryGap={stacked || series.length === 1 ? 6 : 8} barGap={2}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={(v: number) => format(v)} />
          <YAxis
            type="category"
            dataKey={categoryKey}
            tickLine={false}
            axisLine={false}
            width={labelWidth}
            interval={0}
            tick={(props: { x?: number | string; y?: number | string; payload?: { value: string } }) => <CategoryTick {...props} width={labelWidth - 8} />}
          />
          {hasNegative && <ReferenceLine x={0} stroke={CHART.axis} strokeWidth={1} />}
          <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: CHART.cursor }} formatter={(value, name) => [format(Number(value)), series.find((s) => s.key === name)?.label ?? String(name)]} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId={stacked ? "stack" : undefined}
              fill={s.color}
              maxBarSize={stacked || series.length === 1 ? 20 : 14}
              radius={!stacked || i === series.length - 1 ? [0, 4, 4, 0] : 0}
              {...(stacked ? GAP : {})}
              isAnimationActive={false}
            >
              {colorOf && data.map((row, index) => <Cell key={index} fill={colorOf(row, index)} />)}
              {labelKey && i === series.length - 1 && <LabelList dataKey={labelKey} position="right" style={{ fontSize: 11, fill: CHART.tick }} />}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
