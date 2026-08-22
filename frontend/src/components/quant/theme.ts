/**
 * Chart colours, mirrored from `src/app/lab/lab-console.css`.
 *
 * Recharts needs concrete values for strokes and fills, so the `--lab-*`
 * custom properties are duplicated here as literals. Change one, change the
 * other — and if the SURFACE changes, re-run the dataviz validator, because
 * contrast is only meaningful against the surface a chart renders on.
 *
 * These are the site's own dark tokens plus a categorical set generated in
 * OKLCH to sit inside the validator's lightness band while staying in the
 * hue families Forest Editorial already uses.
 */
export const LAB_SURFACE = "#1d2b21";  /* .dark --card */
export const LAB_GRID = "#24332a";     /* .dark --secondary */
export const LAB_BORDER = "#2c3b31";   /* .dark --border */
export const LAB_PLANE = "#16231a";    /* --forest-black */

export const LAB_INK = {
  primary: "#f1f3ec",
  secondary: "#b3bda9",
  muted: "#94a189",
} as const;

/**
 * Reserved. Only where the colour MEANS good/bad, never as a series — and
 * always beside a label, so hue never carries the meaning alone. Keeps the
 * site's directional semantics: moss up, brick down.
 */
export const LAB_STATUS = {
  good: "#a7c957",      /* --moss */
  warning: "#e8b45c",
  serious: "#e08a5c",
  critical: "#d76668",  /* .dark --destructive */
} as const;

/**
 * Six categorical slots, fixed order. The ORDER is a safety mechanism, not a
 * preference: it was searched over permutations, because equal-lightness clay
 * beside moss is exactly the red/green pair deuteranopia erases. Validated as
 * a set against LAB_SURFACE — band, chroma, CVD separation and >=3:1 contrast
 * all pass with no warnings.
 *
 * The brand's own five could not be used directly: forest/fern/moss are three
 * greens that collapse under colour-blindness, forest falls below the
 * lightness band, and cream below the chroma floor.
 */
export const LAB_SERIES = [
  "#537e0e", // moss-green
  "#a4559e", // plum
  "#946e00", // wheat
  "#b55269", // rose
  "#3a75bf", // sky
  "#c4493a", // clay
] as const;

export const LAB_TOOLTIP = {
  backgroundColor: LAB_PLANE,
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
