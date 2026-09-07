# Bundled webfont

## TwemojiCountryFlags.woff2

Country-flag emoji, self-hosted because no font on Windows draws them.

Windows ships Segoe UI Emoji, which covers the emoji block but deliberately
omits every country flag — a Microsoft product decision, not a gap we can fill
with a `font-family` fallback. Chromium on Windows therefore renders 🇰🇷 as the
two boxed letters `KR`. Album titles in the archive are flag-suffixed
("Korea 🇰🇷"), so this font is what makes them render as intended off macOS.

- **Source:** `country-flag-emoji-polyfill@0.1.10` (TalkJS), file
  `dist/TwemojiCountryFlags.woff2`. Only the font is vendored; the package's
  JS feature-detection is not used — `globals.css` gets the same effect from
  font-fallback order plus a `unicode-range` (see `--font-emoji` there).
- **Glyph art:** [Twemoji](https://github.com/twitter/twemoji) by Twitter, Inc.
  and other contributors, used under
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/). Unmodified.
- **Font code:** MIT, Copyright (c) 2022 TalkJS.

Served with a one-year immutable cache (`next.config.ts`), so **rename the file
when replacing it** rather than overwriting it in place.
