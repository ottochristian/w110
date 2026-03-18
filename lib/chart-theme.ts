/**
 * Shared dark-theme configuration for all Recharts charts.
 * All color values come from lib/colors.ts — no hardcodes here.
 */
import { colors } from '@/lib/colors'

export const CHART_PALETTE = colors.chart
export const CHART_COLORS = {
  primary:   colors.chart[0],
  secondary: colors.chart[1],
  success:   colors.chart[2],
  warning:   colors.chart[4],
  danger:    colors.chart[7],
  muted:     colors.chartAxis,
  grid:      colors.chartGrid,
  axis:      colors.chartAxis,
  axisLine:  colors.chartTooltipBorder,
}

export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: colors.chartGrid,
  vertical: false,
} as const

export const AXIS_STYLE = {
  tick:      { fill: colors.chartAxis, fontSize: 12 },
  axisLine:  { stroke: colors.chartTooltipBorder },
  tickLine:  { stroke: colors.chartTooltipBorder },
} as const

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: colors.chartTooltipBg,
    border: `1px solid ${colors.chartTooltipBorder}`,
    borderRadius: '8px',
    color: colors.foreground,
    fontSize: '13px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  labelStyle: {
    color: colors.mutedForeground,
    fontWeight: 600,
    marginBottom: 4,
  },
  itemStyle: {
    color: colors.foreground,
  },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
} as const

export const LEGEND_STYLE = {
  wrapperStyle: {
    color: colors.mutedForeground,
    fontSize: '12px',
  },
} as const

export const GRADIENT_IDS = {
  orange:  'chartGradientOrange',
  emerald: 'chartGradientEmerald',
  indigo:  'chartGradientIndigo',
} as const
