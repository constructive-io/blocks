// Geist (variable) weight tokens for `fontVariationSettings` (DESIGN.md §3.1).
//
// Active/selected text gets HEAVIER, not recolored-only: resting `normal`
// animates to `semibold` on the `wght` axis, transitioned at
// `duration-[var(--dur-fast)]` alongside color. Wrap the animating node in a
// ghost span (an invisible `semibold` sizer stacked under the visible label) so
// the width delta never reflows the row.
//
// Geist has a `wght` axis but NO `opsz` axis, so — unlike FF's Inter tokens —
// there's no optical-size compensation; the ghost span alone absorbs the width
// delta. Don't invent new pairs: resting `normal`, active `semibold`.
export const fontWeights = {
  normal: "'wght' 400",
  medium: "'wght' 500",
  semibold: "'wght' 550",
  bold: "'wght' 640",
} as const;
