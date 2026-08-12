/**
 * The phorage brand palette as literal values.
 *
 * `globals.css` is the source of truth for anything the browser paints via CSS.
 * This module exists for the places that cannot read a CSS custom property:
 * Recharts/SVG `fill` and `stroke` props, and the Satori-rendered OG image.
 * Keep these in sync with the `:root` palette block in `src/app/globals.css`.
 */
export const palette = {
  forest: '#386641',
  fern: '#6a994e',
  moss: '#a7c957',
  cream: '#f2e8cf',
  brick: '#bc4749',

  forestDeep: '#24402c',
  forestBlack: '#16231a',
  mossWash: '#eef4dc',

  ink: '#1f2a1e',
  inkBody: '#2e3a2c',
  slate: '#57624f',
  mutedForeground: '#67715d',
  border: '#e2decd',
  background: '#fcfaf4',
} as const;

/** Categorical ramp for multi-series charts — mirrors `--chart-1` … `--chart-5`. */
export const chartSeries = [
  palette.forest,
  palette.fern,
  palette.moss,
  palette.brick,
  '#8b7a4f',
] as const;

/**
 * Directional colours for equity/PnL curves on the Lab's dark shell. Lime reads
 * as growth against forest-black; the clay red is lightened so it clears
 * contrast on the same surface.
 */
export const trend = {
  up: palette.moss,
  down: '#d76668',
} as const;
