## Overview

phorage runs on **Forest Editorial** — a botanical, warm-neutral design system built on the [shadcn/ui](https://github.com/shadcn-ui/ui) token architecture. The structure is shadcn's: semantic role tokens (`--background`, `--primary`, `--muted`, `--destructive`, `--ring`, …), a single `--radius` that derives the whole corner ramp, an `@theme inline` bridge into Tailwind v4 utilities, and component recipes that live in `@layer components` so markup utilities always win.

The surface treatment is not shadcn's neutral grey. The palette is five colours pulled from a forest: deep canopy green, fern, lime, parchment cream, and clay red. Every neutral is warm or green-tinted, so nothing on the page reads as cold grey. Pages alternate a paper canvas, cream chapter bands, and one deep-forest closing band, with photography carrying most of the saturation.

**Key Characteristics:**
- Warm paper canvas (`#fcfaf4`) as the default surface — never pure white, never grey.
- Cream bands mark chapter breaks; a single forest band closes the page.
- Forest-green pill CTAs, not near-black — the brand colour does the primary action.
- Lime is the accent-of-record: active nav underline, section eyebrow tick, hero underlay.
- Monumental grotesk display type with tight tracking, over restrained 14–17px body copy.
- Flat, bordered cards (`shadow-xs`, 1px warm border) that lift on hover — no heavy drop shadows.
- A whisper of SVG paper grain on large flat bands.

## Colors

### Brand Palette

The five source colours. Everything else is derived from them.

| Token | Value | Role |
|---|---|---|
| `--forest` | `#386641` | Primary actions, brand ink, active states, chart series 1 |
| `--fern` | `#6a994e` | Primary hover, focus ring (`--ring`), chart series 2 |
| `--moss` | `#a7c957` | Lime accent — markers, underlines, positive metrics on dark |
| `--cream` | `#f2e8cf` | Secondary surface, section bands, image matting |
| `--brick` | `#bc4749` | Destructive, error, editorial taxonomy, caveat callouts |

### Tonal Extensions

- `--forest-deep` (`#24402c`): Deep product / CTA bands.
- `--forest-black` (`#16231a`): Footer and the deepest editorial surface. (No longer the Lab shell — see **The Lab is not this system** below.)
- `--moss-wash` (`#eef4dc`): Palest lime section wash and verified-evidence chips.
- `--cream-deep` (`#e8dcbb`): Pressed cream, border-on-cream.
- `--brick-soft` (`#e0a8a6`): Brick chip borders.
- `--brick-light` (`#d76668`): Brick lifted for legibility on dark surfaces.

### Semantic Roles (shadcn)

| Token | Light | Dark (`.dark`) |
|---|---|---|
| `--background` | `#fcfaf4` | `#16231a` |
| `--foreground` | `#1f2a1e` | `#f1f3ec` |
| `--card` / `--popover` | `#ffffff` | `#1d2b21` |
| `--primary` | `--forest` | `--moss` |
| `--primary-foreground` | `#f5efe0` | `#16231a` |
| `--secondary` | `--cream` | `#24332a` |
| `--secondary-foreground` | `#2a4a32` | `#e8eedd` |
| `--muted` | `#f1ede0` | `#223028` |
| `--muted-foreground` | `#67715d` | `#94a189` |
| `--accent` | `--forest` | `--moss` |
| `--destructive` | `--brick` | `#d76668` |
| `--border` | `#e2decd` | `#2c3b31` |
| `--input` | `#dcd7c4` | `#34453a` |
| `--ring` | `--fern` | `--moss` |

**Documented deviation from stock shadcn:** `--accent` is the brand green rather than a pale hover wash. `text-accent` reads as "brand" throughout this app. Hover surfaces use `--muted` or `--secondary` instead.

### Legacy Aliases

The codebase already speaks a set of older names; they are re-pointed at the new palette rather than churned out of the markup. Prefer the semantic roles above in new code.

`--canvas` → background · `--surface` (`#f7f2e3`) → warm section · `--surface-muted` → muted · `--surface-dark` → forest-black · `--stone` → cream · `--green-wash` / `--blue-wash` → moss-wash · `--hairline` / `--border-light` / `--card-border` → border · `--ink` → foreground · `--ink-body` (`#2e3a2c`) → body copy · `--slate` (`#57624f`) → secondary body copy · `--accent-light` → fern · `--green-deep` → forest-deep · `--navy` → forest-black.

### Data Visualization

`--chart-1` … `--chart-5` run forest → fern → moss → brick → `#8b7a4f` (tan). `src/lib/palette.ts` mirrors the palette as literal hex for the places that cannot read a CSS variable: Recharts `stroke`/`fill` props, inline SVG charts, and the Satori-rendered OG image. Keep the two in sync.

Directional colour in editorial contexts uses `trend.up` = moss and `trend.down` = `#d76668`. Categorical market chips deliberately avoid those two so a chip never reads as a P&L signal. (`/lab` no longer uses these — it carries its own reserved status palette.)

### Contrast Notes

- Moss (`#a7c957`) never carries text on a light surface — it is a highlight, an underlay, or dark-surface text only.
- `--muted-foreground` is tuned to clear 4.5:1 on the paper canvas, so uppercase 11px eyebrows stay legible.
- Forest and brick both clear 5:1 on canvas and are safe for body-size links.

## Typography

### Font Family

- **Display**: `Fraunces` — an old-style serif with a little optical wonk. **Latin only.**
- **Body/UI**: `IBM Plex Sans`, with `IBM Plex Sans KR` resolving every Hangul glyph.
- **Technical labels**: `IBM Plex Mono`.

`font-serif` in markup means "the display voice", not a CSS generic — it resolves to `--font-display-stack`.

**Korean is served by exactly one webfont family, deliberately.** Google's Korean faces ship ~2,500 glyphs across unicode-range subsets, so each additional family costs roughly 150–330 KB on a Korean page. Plex Sans KR therefore does both display and body duty, and Fraunces stays Latin-only so it never pulls a Korean download.

**400 / 500 / 600 are loaded, for every family — and 600 is the ceiling.** Ask for `font-bold` (700) or heavier and there is no face to match, so the browser synthesises one: smeared strokes, worst on Hangul and on the 9–12px mono labels where it shows most. Those classes therefore appear nowhere in the app.

Mono carries 600 even though the weight budget is otherwise tight. Measured cost: +32 KB on disk across five unicode-range subsets, of which a page downloads only `latin` — against the 150–330 KB a Korean weight would add. It earns that by carrying every emphasised mono label: table headers, status chips, stat values.

**The portfolio surface opts out of the display voice entirely** (`.portfolio-ui` maps `font-serif` to the body stack). Fraunces beside Plex Sans KR works everywhere the two alternate by *section* — but the portfolio mixes them inside a line, because the Korean edition keeps project titles in English ("Korean Air Financial Analysis" a line below 재무비율) and evidence labels run "DCF · APV · 멀티플". At that distance a Latin serif against Hangul reads as two typefaces that met by accident, so that surface sets everything in IBM Plex — one superfamily, Latin and Hangul drawn to a shared skeleton, at no extra webfont cost.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Tracking |
|---|---|---:|---:|---:|---:|
| Hero Display | Display | `clamp(1.9rem, 7cqw, 4.25rem)` | 500 | 1.05 | tight |
| Section Display | Display | 44–48px | 500 | 1.10 | tight |
| Section Heading | Display | 32–36px | 500 | 1.15 | tight |
| Card Heading | Display | 20–24px | 500 | 1.25 | tight |
| Body Large | Body | 17–18px | 400 | 1.65 | 0 |
| Body | Body | 15–16px | 400 | 1.6 | 0 |
| Button | Body | 14px | 500 | 1 | -0.01em |
| Caption | Body | 13px | 400 | 1.5 | 0 |
| Eyebrow (`.eyebrow`) | Mono | 11px | 500 | 1.4 | 0.24em, uppercase |

### Principles

- One oversized headline per page; everything after it settles into 15–18px copy.
- Uppercase mono eyebrows open sections. Use `.eyebrow-marked` to prefix one with a forest→lime tick.
- Avoid heavy bold — and note it is not merely a preference: 700 is not loaded (see § Font Family). Size, surface contrast, and spacing carry the hierarchy.

### Line Breaking

Korean is the primary language of this site, so the wrapping rules are set once on `body` and inherited, not sprinkled per element:

| Property | Value | Why |
|---|---|---|
| `word-break` | `keep-all` | A browser's default breaks Hangul between *any two syllables*, so "포트폴리오" splits as "포트폴 / 리오". `keep-all` moves every break onto a space — how Korean is actually typeset. |
| `overflow-wrap` | `break-word` | The escape hatch: a long unbroken token (URL, 이메일, spaceless 문장) wraps instead of overflowing its box. |
| `text-wrap` | `balance` on `h1`–`h4`, `pretty` on `p`/`li`/`figcaption` | Headlines get even line lengths instead of one orphan word; body copy only guards its last line. Both are `@layer base` + `:where()`, so any `text-*` utility overrides them. |

Two things CSS cannot decide, so the markup does:

- **Glue a separator to the word before it.** Put U+00A0 (`&nbsp;`) *before* a `·` separator and a normal space after it, so a line can never open with a dangling `·`. Same for prices (`₩&nbsp;12,000`) — the currency mark never strands itself at a line end.
- **`<br>` is for a break you want at *every* width.** A hard break inside admin-editable or translated copy turns into a three-line rag as soon as the string changes; reach for `text-balance` and a `max-w-[Nch]` cap instead.

`break-keep` in markup is therefore redundant — harmless where it already exists, unnecessary in new code.

## Layout

### Spacing System

8px base. Sections breathe at `py-16 md:py-28`; page gutters run `px-5 sm:px-6 md:px-10`. Content containers cap at `max-w-[1400px]` for grids and `max-w-3xl` for prose.

### Grid & Container

- Nav is a three-zone flex: wordmark centre, links right, and an empty left zone that still reserves width so the centring holds (hamburger below `lg`). Labels, wordmark, and gaps are fluid — 11→14px between 1024 and ~1600, because five labels plus the wordmark only just fit at `lg` and look undersized on a wide monitor.
- Home hero is a single photographic stage — one full-width frame with the eyebrow, headline, subtitle, and CTAs laid over its lower band.
- Card grids run 4 columns at `lg`, 2 at `sm`, 1 below.
- Photo surfaces (Archive, Shop) use CSS multi-column masonry with `break-inside-avoid`.

### Rhythm

Pages alternate surfaces rather than stacking cards on one background: paper canvas → cream band → paper canvas → forest band → forest-black footer. The tonal shift is what separates chapters; rules and borders are secondary.

## Elevation & Depth

Mostly flat. Depth comes from surface alternation, warm borders, and hover lift.

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, canvas or band fill | Hero copy, prose, list surfaces |
| Bordered | 1px `--border` + `shadow-xs` | Cards, inputs, outline buttons |
| Hover lift | `translateY(-2px to -4px)` + tinted forest shadow | Interactive cards, pill CTAs |
| Media | Cream matting around a rounded image | Product and album cards |
| Photographic stage | Frame cut to the photo's own ratio, scrim ramp over the lower band | Home hero |
| Band | Cream, moss-wash, forest-deep, or forest-black full-bleed | Chapter breaks, CTAs, footer |

## Shapes

### Radius Scale

Derived from a single `--radius: 1rem`, following shadcn's ramp formula.

| Token | Multiplier | Value | Role |
|---|---|---:|---|
| `--radius-xs` | ×0.4 | 6px | Micro elements |
| `--radius-sm` | ×0.6 | 10px | Chips, small controls, skip link |
| `--radius-md` | ×0.8 | 13px | Inputs, small media |
| `--radius-lg` | ×1.0 | 16px | Cards, album and product media |
| `--radius-xl` | ×1.4 | 22px | Large media frames |
| `--radius-2xl` | ×1.8 | 29px | Full-bleed CTA panels |
| `--radius-pill` | — | 9999px | All buttons, chips, badges |

Buttons and chips are true pills — the one place the system diverges from shadcn's `rounded-md` controls, because the organic voice wants soft ends.

### Image Treatment

Images sit as rounded cards, not background fills. Album covers carry a forest-black scrim (not neutral black) so overlaid text stays warm.

**Nothing on this site is cropped to fit a frame — the frame accommodates the photograph.** `cloudinary()` deliberately offers no `c_fill`; it only resizes.

The home hero is where that rule has to work hardest, because the image is admin-configurable and arrives in any orientation. **The frame is built from the photograph's proportions**, not the reverse:

1. `cloudinaryAspect()` reads the delivered width÷height on the server — `fl_getinfo` chained *after* the delivery transform, so the number already accounts for EXIF rotation and `c_limit`. Cached for a day; falls back to `DEFAULT_ASPECT` (3:2) for a non-Cloudinary URL.
2. The frame takes that ratio (`aspect-ratio`) and caps its width at `min(1400px, ratio × 76vh)`.

Box and picture being the same shape removes both failure modes at once: nothing is cropped, and there is no leftover strip to fill with matting, blur, or anything else. A portrait photo narrows the frame into a centred column rather than being cropped or letterboxed; the warm canvas around it is page, not filler. Passing the ratio in the HTML also reserves the box before the image loads, so the hero contributes no layout shift.

Copy is laid over the lower band from `md` up — cream and moss on `.scrim-hero`, with the moss CTA pill of the closing forest band — and sits *below* the photo in ink on canvas at phone widths, where a landscape shot is far too short to carry it. Hero type scales in `cqw` off a `@container` on the frame, so it fits a narrow portrait frame and a wide panorama alike. The admin hero preview renders the photo at its own ratio too, so what is previewed is what ships.

## Components

All recipes live in `src/app/globals.css` inside `@layer components`. Tailwind v4 orders `theme, base, components, utilities`, so any utility in the markup (`bg-moss`, `text-[11px]`) still overrides the recipe. Never write these unlayered — unlayered rules beat utilities and make the class un-tunable.

### **`.btn-primary`**

Forest pill, cream label, `shadow-xs`. Hovers to fern with a 1px lift and a forest-tinted shadow. The single highest-priority action on a light surface. On a dark band, override with `bg-moss text-forest-black`.

### **`.btn-secondary`**

Cream pill with deep-green label. The companion action that still needs a filled surface.

### **`.btn-outline`**

White pill, 1px warm border, `shadow-xs`. Filters and taxonomy. `data-active="true"` inverts it to solid forest.

### **`.btn-ghost`** / **`.btn-destructive`**

Unfilled lowest-emphasis action; clay pill for destructive confirmations.

### **`.link-underline`** / **`.link-leaf`**

`.link-underline` is a 1px current-colour rule that fades on hover — the neutral secondary action. `.link-leaf` is the prose link: forest text over a 2px lime underline that grows to a highlighter sweep on hover.

### **`.eyebrow`** / **`.eyebrow-marked`**

Uppercase mono section marker at 11px / 0.24em. The `-marked` variant prefixes a 20px forest→lime gradient tick.

### **`.rule`** / **`.rule-accent`**

`.rule` is the 1px hairline. `.rule-accent` is a 2px bar fading forest → fern → moss → transparent, used to close a page header.

### **`.card-hair`** / **`.card-cream`**

`.card-hair` is the shadcn card: white, 1px border, `shadow-xs`, lifting to a forest-tinted shadow on hover. `.card-cream` is its warm sibling for use inside white sections.

### **`.chip`** / **`.chip-leaf`** / **`.chip-brick`** / **`.badge-solid`**

Mono uppercase pills. Neutral, forest-on-moss-wash, clay editorial (with an `data-active` inverted state), and a solid forest badge for overlaying media.

### **`.field-label`** / **`.field-input`**

shadcn field behaviour: 1px `--input` border, `--radius-md`, and a 3px `--ring/40` focus halo. `aria-invalid="true"` swaps border and halo to clay.

### **`.band-cream`** / **`.band-wash`** / **`.band-dark`** / **`.band-navy`**

Full-width section fills: parchment, palest lime, forest-deep, forest-black.

### **`.scrim-hero`**

Forest-black gradient ramp — 92% alpha at the baseline, clear by the top quarter — laid over an arbitrary photograph so overlaid copy keeps its contrast without dimming the whole picture. Pair with cream/moss text; never with ink.

### **`.texture-grain`**

Inline-SVG `feTurbulence` noise at 50% opacity, `mix-blend-mode: multiply`, painted behind content via a `z-index: -1` pseudo-element inside an isolated stacking context. No network request, CSP-safe, and suppressed in print. Use on large flat bands only — never on text-dense surfaces.

## Do's and Don'ts

### Do

- Use the paper canvas as the default; introduce cream and forest as full-width bands.
- Let forest be the primary action colour — it is the brand doing the work.
- Reserve moss for accents: markers, underlines, active states, positive metrics on dark.
- Use brick for destructive states, errors, and analytical caveats.
- Keep buttons and chips pill-shaped and cards at `--radius-lg`.
- Put new component recipes in `@layer components`.
- Mirror any new chart colour into `src/lib/palette.ts`.

### Don't

- Do not set moss as text on a light surface — it fails contrast.
- Do not reintroduce stock Tailwind palette colours (`gray-500`, `amber-300`, `emerald-400`). Everything maps to the five.
- Do not use pure white or pure black as a surface; the system has no cold neutrals.
- Do not add heavy drop shadows — depth comes from surface alternation and hover lift.
- Do not make every section card-based; unframed rows and tonal bands carry most of the structure.
- Do not let directional colours (moss up / clay down) leak into categorical chips.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---:|---|
| Mobile | <640px | Single-column everything, hamburger nav, hero stacks headline over media |
| Large Mobile | 640–768px | Two-column masonry begins, wider gutters |
| Tablet | 768–1024px | Two-column card grids, portfolio grid engages 12 columns |
| Desktop | 1024–1440px | Full horizontal nav at `lg`, 3–4 column grids, split hero |
| Large Desktop | >1440px | Containers cap at 1400px; vertical intervals grow |

### Touch Targets

Pill CTAs use 12–24px padding; the shop's add-to-cart control is a 40px circle. Filter chips are larger than typical tags so dense taxonomy stays usable on touch.

### Collapsing Strategy

- Nav collapses to a hamburger dropdown below `lg`.
- Hero moves from side-by-side to stacked, media below the headline.
- Card grids step 4 → 2 → 1; masonry columns step 3 → 2 → 1.
- The portfolio hero's method sidebar drops its left border and stacks underneath.

## Iteration Guide

1. Start from the paper canvas. Reach for a band (`.band-cream`, `.band-dark`) when a section is a new chapter, not just a new block.
2. One `.btn-primary` per view; everything else is `.btn-outline` or `.link-underline`.
3. Open sections with `.eyebrow-marked`, close page headers with `.rule-accent`.
4. Use semantic role tokens (`bg-primary`, `text-muted-foreground`, `border-border`) in new markup; the legacy aliases exist for the existing surface area, not for new code.
5. When a colour cannot come from CSS (SVG props, OG images), import it from `src/lib/palette.ts` rather than hardcoding hex.

## The Lab is not this system

`/lab` is an operations console for a fleet that trades real money. Its
**structure** diverges — hairline grid instead of bordered cards, monospace
throughout, glass chrome over opaque data, a condition stripe per row — because
it is machinery read at a glance to answer "is anything wrong", not an
editorial page.

Its **colour does not diverge.** Every plane, border and ink is a `.dark` token
from `globals.css`: forest-black ground, `--card` panels, `--secondary` header
strips, moss as the accent and as the section tick. It reads as this site in a
different mode, not as a different site.

The one place the brand palette could not be used as-is is the categorical
series. Forest, fern and moss are three greens that collapse under
colour-blindness; forest falls below the validator's lightness band and cream
below its chroma floor. The six series colours were therefore generated in
OKLCH *inside* the band, held to hue families the site already uses (moss,
plum, wheat, rose, sky, clay), and their ORDER searched rather than chosen —
equal-lightness clay beside moss is exactly the red/green pair deuteranopia
erases. Status keeps the site's directional semantics: moss up, brick down.

**It cannot leak.** Every rule lives in `src/app/lab/lab-console.css`, nested
under `.lab-console`; every custom property is `--lab-*` and is defined only in
that scope; and the file lands in its own route chunk, so `/portfolio` never
downloads it. If you add to that file, keep both properties — a bare selector
or a `:root` token there would reach the whole site.

Nothing there is chosen by eye. The six categorical slots, four status tokens
and three ink steps were validated against the console's own panel surface
(`--card`, `#1d2b21`) — lightness band, chroma floor, colour-blind separation
and ≥3:1 contrast, all passing with no warnings. The header comment in
`lab-console.css` records the numbers and what to re-run if the surface
changes.

## Known Gaps

- The `.dark` token block is defined and correct but not yet wired to a toggle. (It is no longer blocked on `/lab`, which now carries its own palette — see below.)
- Korean webfonts are not bundled; the stacks fall back to system Korean faces.
- The portfolio print stylesheet is preserved from the previous system and has not been re-toned to the new palette beyond replacing stock greys.
