// Keep in sync with the `:root` palette in `src/app/globals.css` (for SVG props and OG images).
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

export const chartSeries = [
  palette.forest,
  palette.fern,
  palette.moss,
  palette.brick,
  '#8b7a4f',
] as const;

export const trend = {
  up: palette.moss,
  down: '#d76668',
} as const;
