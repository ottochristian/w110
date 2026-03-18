/**
 * Design token constants for use in JS/JSX contexts where Tailwind classes
 * can't be used (e.g. Recharts stroke/fill props, inline styles, canvas).
 *
 * These values MUST match the CSS custom properties in app/globals.css.
 * To change a color: update globals.css first, then update the matching
 * constant here. Everything else in the app (Tailwind classes) picks up
 * the change from globals.css automatically.
 */

export const colors = {
  // Brand
  primary:   '#ea580c',  // --primary  hsl(25 91% 48%)
  primaryFg: '#fafafa',

  // Surfaces
  background: '#0a0a0a',  // --background
  card:        '#171717',  // --card
  border:      '#2e2e2e',  // --border

  // Text
  foreground:       '#fafafa',  // --foreground
  mutedForeground:  '#8c8c8c',  // --muted-foreground

  // Chart palette (orange-first, all readable on dark bg)
  chart: [
    '#ea580c',  // orange-600   — primary brand
    '#fb923c',  // orange-400
    '#10b981',  // emerald-500
    '#6366f1',  // indigo-500
    '#f59e0b',  // amber-500
    '#8b5cf6',  // violet-500
    '#06b6d4',  // cyan-500
    '#ef4444',  // red-500
  ],

  // Chart chrome
  chartGrid:    '#27272a',  // zinc-800
  chartAxis:    '#52525b',  // zinc-600 (after remap ~62% lightness)
  chartTooltipBg:     '#18181b',
  chartTooltipBorder: '#3f3f46',
} as const

export type ColorKey = keyof typeof colors
