/** Recharts needs literal colours: these mirror the light tokens in `globals.css` — move them together. */
export const LAB_SURFACE = "#f7f2e3";  /* --surface, the chart surface */
export const LAB_GRID = "#e6e0cf";     /* recessive: 1.18:1 off the surface */
export const LAB_BORDER = "#e2decd";   /* --border */
export const LAB_PLANE = "#fcfaf4";    /* --background, the paper canvas */

export const LAB_INK = {
  primary: "#26312a",    /* 12.07:1 on the surface — console-specific */
  secondary: "#404a3d",  /*  8.29:1 — mirrors --ink-body */
  muted: "#616b58",      /*  5.00:1 — mirrors --slate */
} as const;

/** Only where colour MEANS good/bad, always beside a label. `good` is forest: moss reads 1.89:1 on white. */
export const LAB_STATUS = {
  good: "#386641",      /* --forest  5.97:1 */
  warning: "#8a6410",   /*           4.80:1 */
  serious: "#a85222",   /*           4.82:1 */
  critical: "#bc4749",  /* --brick   4.54:1 */
} as const;

/** Fixed order is a colour-blind safety choice (forest/teal non-adjacent); the palette stops, never cycles. */
export const LAB_SERIES = [
  "#146a2d", // forest   L 0.46
  "#2086cd", // sky      L 0.60
  "#b53715", // brick    L 0.52
  "#0798a4", // teal     L 0.62
] as const;

export const LAB_TOOLTIP = {
  backgroundColor: LAB_SURFACE,
  border: `1px solid ${LAB_BORDER}`,
  color: LAB_INK.primary,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  padding: "8px 10px",
} as const;

export const LAB_AXIS = {
  stroke: LAB_INK.muted,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;
