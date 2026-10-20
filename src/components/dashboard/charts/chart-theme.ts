/**
 * Chart colors, validated with the dataviz validator against the dashboard surface (#ffffff).
 * The brand teal/navy read as gray at chart scale (chroma below 0.10), so data marks use the
 * documented reference palette; chrome uses the dashboard's own line and text tokens.
 * The dashboard has no dark mode, so only light steps are defined.
 */
export const CHART = {
  /** Categorical, assigned in this order. Slot 3 is below 3:1, so every chart has a table view. */
  series: ["#2a78d6", "#eb6834", "#1baf7a"] as const,
  /** Ordinal one-hue ramp (funnel stages), light → dark. */
  ordinal: ["#86b6ef", "#5598e7", "#256abf", "#104281"] as const,
  /** Diverging poles for values on both sides of zero (profit and loss). */
  positive: "#2a78d6",
  negative: "#e34948",
  /** Status scale for severity (overdue buckets), always shown with a text label. */
  status: { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" },
  grid: "#e4e7ec",
  axis: "#848e9f",
  tick: "#667085",
  cursor: "#f2f4f7",
} as const

export const AXIS_TICK = { fontSize: 11, fill: CHART.tick }

export const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 8, border: `1px solid ${CHART.grid}`, fontSize: 12, boxShadow: "0 8px 24px -12px rgb(16 24 40 / 0.2)" },
  labelStyle: { color: "#101828", fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: "#475467", padding: 0 },
} as const
