/**
 * Chart colours, mirrored from `src/app/lab/lab-console.css`.
 *
 * Recharts needs concrete values for strokes and fills, so the `--lab-*`
 * custom properties are duplicated here as literals. Change one, change the
 * other — and if the SURFACE changes, re-run the dataviz validator, because
 * contrast is only meaningful against the surface a chart renders on.
 */
export const LAB_SURFACE = "#252a31";
export const LAB_GRID = "#2f343c";
export const LAB_BORDER = "#363c45";

export const LAB_INK = {
  primary: "#f6f7f9",
  secondary: "#abb3bf",
  muted: "#8f99a8",
} as const;

/** Reserved. Only where the colour MEANS good/bad, never as a series. */
export const LAB_STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

export const LAB_TOOLTIP = {
  backgroundColor: "#1a1e24",
  border: `1px solid ${LAB_BORDER}`,
  color: LAB_INK.primary,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  padding: "8px 10px",
} as const;

export const LAB_AXIS = {
  stroke: LAB_INK.muted,
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;
