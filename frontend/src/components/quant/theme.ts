/**
 * Chart colours.
 *
 * Recharts takes strokes and fills as JS strings, so these cannot be
 * `var(--…)` the way `lab-console.css` now writes them — a literal here is
 * forced, not a shortcut. What that costs is a mirror: these are the site's
 * light tokens from `globals.css`, and if one of THOSE moves, the matching
 * literal below has to move with it.
 *
 * If the SURFACE changes, re-run the dataviz validator as well — contrast is
 * only meaningful against the surface a chart actually renders on.
 *
 * Two dark versions came before this one and both read as mud; see the header
 * comment in `lab-console.css` for why.
 */
export const LAB_SURFACE = "#f7f2e3";  /* --surface, the chart surface */
export const LAB_GRID = "#e6e0cf";     /* recessive: 1.18:1 off the surface */
export const LAB_BORDER = "#e2decd";   /* --border */
export const LAB_PLANE = "#fcfaf4";    /* --background, the paper canvas */

/* Spaced, not maxed: near-black on near-white across a whole dense screen is
   glare rather than legibility. Every step still clears 4.5:1 comfortably. */
export const LAB_INK = {
  primary: "#26312a",    /* 12.07:1 on the surface — console-specific */
  secondary: "#404a3d",  /*  8.29:1 — mirrors --ink-body */
  muted: "#616b58",      /*  5.00:1 — mirrors --slate */
} as const;

/**
 * Reserved. Only where the colour MEANS good/bad, never as a series — and
 * always beside a label, so hue never carries the meaning alone. Keeps the
 * site's directional semantics: green up, brick down.
 *
 * `good` is FOREST, not moss. Moss reads 1.89:1 on white — the site's own rule
 * is that moss never carries text on a light surface; it is a highlight or an
 * underlay there, which is what `--lab-accent-wash` is for.
 */
export const LAB_STATUS = {
  good: "#386641",      /* --forest  5.97:1 */
  warning: "#8a6410",   /*           4.80:1 */
  serious: "#a85222",   /*           4.82:1 */
  critical: "#bc4749",  /* --brick   4.54:1 */
} as const;

/**
 * Four categorical slots, fixed order.
 *
 * On paper the set uses LIGHTNESS as a second channel of separation, and that
 * is the whole reason it works. Colour-blindness flattens hue; it does not
 * flatten value. Every equal-lightness set searched here FAILED the CVD check
 * no matter how the hues were arranged, and every set that varies lightness
 * across slots passed comfortably — worst adjacent ΔE 17.8 against the 12.3
 * the dark version managed, and against a floor of 8.
 *
 * Lightness has a ceiling, and the ceiling moved: on white a mark could reach
 * L 0.64 before it stopped clearing 3:1, but the panel is now the site's
 * `--surface` — 11% less light — so slot 4 had to come down to L 0.62. That
 * ceiling, not taste, is what fixes each slot.
 *
 * The hues are the site's: forest green, brick, and two cool anchors. The
 * highest-scoring set the search returned put a light orchid in slot 4 (ΔE
 * 22.8); teal was taken instead at ΔE 17.8, because orchid is not a colour
 * this site speaks and 17.8 is not a close call.
 *
 * The brand's own five could not be used directly: forest/fern/moss are three
 * greens that collapse under colour-blindness, cream falls below the chroma
 * floor, and moss reads 1.89:1 on white.
 *
 * The ORDER is a safety mechanism, not a preference — it was searched over
 * permutations, and it keeps forest and teal non-adjacent.
 *
 * The palette STOPS rather than cycling. A fifth bot is not given a generated
 * hue; `buildSeriesColors` leaves it uncoloured and the chart reports it as
 * "not plotted", because two bots sharing one colour is worse than one bot
 * being visibly absent.
 */
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
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;
