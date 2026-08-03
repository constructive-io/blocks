"use client"

import type { ChartTheme } from "@tanstack/charts"

export { Chart } from "@tanstack/react-charts"
export type {
  ChartCommonProps,
  ChartDefinition,
  ChartPoint,
  ChartProps,
} from "@tanstack/react-charts"

/**
 * A theme-adaptive TanStack Charts theme backed exclusively by the semantic
 * tokens every Constructive registry consumer receives.
 */
const CONSTRUCTIVE_CHART_THEME = {
  foreground: "var(--foreground)",
  muted: "var(--muted-foreground)",
  grid: "var(--border)",
  background: "var(--background)",
  palette: [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ],
} as const satisfies ChartTheme

export { CONSTRUCTIVE_CHART_THEME }
