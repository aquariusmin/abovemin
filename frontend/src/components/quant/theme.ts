/**
 * Chart colours, mirrored from `src/app/lab/lab-console.css`.
 *
 * Recharts needs concrete values for strokes and fills, so the `--lab-*`
 * custom properties are duplicated here as literals. Change one, change the
 * other — and if the SURFACE changes, re-run the dataviz validator, because
 * contrast is only meaningful against the surface a chart renders on.
 *
 * These are the site's LIGHT tokens, unmodified — the console shares the
 * canvas its header and footer sit on. Two dark versions came before this and
 * both read as mud; see the header comment in `lab-console.css` for why.
 */
export const LAB_SURFACE = "#ffffff";  /* --card, the chart surface */
export const LAB_GRID = "#ebe7d9";     /* --border-light, recessive on white */
export const LAB_BORDER = "#e2decd";   /* --border */
export const LAB_PLANE = "#fcfaf4";    /* --background, the paper canvas */

export const LAB_INK = {
  primary: "#1f2a1e",    /* --foreground  14.91:1 on white */
  secondary: "#2e3a2c",  /* --ink-body    11.95:1 */
  muted: "#57624f",      /* --slate        6.43:1 */
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
  good: "#386641",      /* --forest  6.68:1 */
  warning: "#8a6410",   /*           5.37:1 */
  serious: "#a85222",   /*           5.39:1 */
  critical: "#bc4749",  /* --brick   5.08:1 */
} as const;

/**
 * Four categorical slots, fixed order.
 *
 * On paper the set uses LIGHTNESS as a second channel of separation, and that
 * is the whole reason it works. Colour-blindness flattens hue; it does not
 * flatten value. Every equal-lightness set searched here FAILED the CVD check
 * no matter how the hues were arranged, and every set that varies lightness
 * across slots passed comfortably — worst adjacent ΔE 18.6 against the 12.3
 * the dark version managed, and against a floor of 8.
 *
 * Lightness also has a ceiling on white: past L ~0.64 a mark stops clearing
 * 3:1 against the surface. That ceiling, not taste, is what fixes each slot.
 *
 * The hues are the site's: forest green, brick, and two cool anchors. The
 * highest-scoring set the search returned put a light orchid in slot 4 (ΔE
 * 22.8); teal was taken instead at ΔE 18.6, because orchid is not a colour
 * this site speaks and 18.6 is not a close call.
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
  "#269da9", // teal     L 0.64
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
