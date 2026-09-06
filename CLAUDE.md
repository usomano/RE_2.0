# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

**reincantamento-site** is the new homepage for REINCANTAMENTO — an independent
research and publishing collective exploring technology, radical imagination, and
rituality. It is a static site translated from the Figma design "SITO NEW".

No build process. Vanilla HTML + CSS + JS, no framework, no package manager.

### Pages

```
index.html  about.html  lab.html      hand-maintained
writing/    publishing/  artworks/    generated from content/
```

| Section | Contains |
|---|---|
| `writing/` | The DROPS newsletter (53 issues, 2023 →), one page per drop. `writing/archive.html` holds the pre-2023 essays published elsewhere; those cards link out. |
| `publishing/` | nCHANT #01 and Arcane Affinities. Copy, specs, availability and shots come from the Metalabel records. |
| `artworks/` | Formicaio, Harvesting the Net, Tech Collapse, Dolphinology, Vectorial Baptism. |

**One header, on every page.** The home shell's header is the header: the eye in
the first cell (and the way back to the home page), the five sections on a mask
of the page fill, then the filled ABOUT cell in the corner. `tools/build.py`
emits the same markup for the section pages, where it takes the first row of the
page grid instead of floating over the screen (`.page .site-header`). The
current section is underlined, not punched out of a band.

The menu names sections only — WRITINGS, PUBLISHING, ARTWORKS, WORKSHOPS,
TALKS. About is the corner cell, so it is never also a menu item, and the logo
is the only way home.

WRITINGS holds a cell of its own (`.nav-item`) because Writing is two bodies of
work on two pages: the cell fills with `--band` on hover and drops DROPS and
ARCHIVE below it as a column of the same squares, a grid line apart
(`.nav-menu`). `:focus-within` opens it from the keyboard; a touch screen has no
hover, so tapping the item just follows it to the drops, and in the mobile panel
both names are simply there, indented. The cell stays filled on the Writing
pages — the current section is a cell that is on, where the other items, being
text, underline instead. The nav is a row of labels with gaps, so the cell lands
wherever the words put it: `main.js` / `site.js` shift the item to the nearest
column (`snapNavItem`) so its square and menu meet the painted lines. Workshops and Talks have no design or content yet, so they
are `<span class="nav-off">` everywhere — visible, not links. Swap them for
`<a>` when the frames land.

### Content is data, pages are generated

`content/*.json` holds the content; `tools/build.py` writes the section pages;
the generated HTML is committed, so the site keeps working with no build step.
Run `python3 tools/build.py` after editing any JSON. The generator never touches
the three hand-maintained pages.

`content/drops-source/` is the raw Substack export the drop pages are converted
from. It is build input and is never served. The converter strips Substack's
subscription pitch from every issue and keeps only a short list of inline tags —
Substack's `picture`/`srcset`/`data-attrs` markup otherwise leaks into the copy.

Images are optional by design: the generator emits an `<img>` only when the file
exists, so a missing cover renders as the flat placeholder rather than a broken
image. See README for the paths.

The newsletter keeps going, so two fetchers keep the source folder current:

```sh
python3 tools/fetch_drops.py   # new issues → content/drops-source/ + drops.json
python3 tools/fetch_images.py  # the images those files reference
python3 tools/build.py
```

`fetch_drops.py` reads Substack's public archive API and takes the `body_html`
of every issue the site does not have yet — free posts carry their whole body,
so nothing is scraped out of page markup. It writes each one in the export's own
shape and leaves the figures pointing at `assets/images/articles/<slug>-N.webp`;
`fetch_images.py` then fills those in and skips whatever is already on disk, so
both are safe to re-run.

The pre-2023 archive comes from the old site instead, which keeps a page per
year in Italian and English. `python3 tools/fetch_articles.py 2021` reads the
English one and fills that year in with the English title, the description, the
outlet link and a cover (Cargo serves a derivative — `w/900/q/85/f/webp` in
place of `t/original` — but the source art is only 300x200, so covers are soft
by nature). It checks every article on the page against the year in the JSON by
date and outlet before writing anything. **2020 and 2021 are done; 2022 still
carries Italian titles and no covers.** An archive card shows its cover block
only once it has one, so 2022 stays text only in the meantime.

The old site's copy travels as it is, typos included — the one exception so far
is Episode 9 of 2020, whose English page carries no description at all, so the
Italian one was translated rather than left standing in an English archive.

## Design Source of Truth

The design lives in Figma — keep code in sync with it:

- File: **SITO NEW**
- URL: https://www.figma.com/design/kisWr3171g0G6rqOyNOYLF/SITO-NEW
- fileKey: `kisWr3171g0G6rqOyNOYLF`

To read the file, use the Figma MCP (`use_figma`, load the `figma-use` skill first).

### Design tokens (extracted from Figma styles)

Colors:
| Token | Hex | Usage |
|---|---|---|
| GRIGIO | `#D9D9D9` | page background |
| BLU | `#0009FF` | links, active nav, highlighted words |
| BIANCO | `#FFFFFF` | grid lines |

Text styles:
| Style | Font | Size / line-height | Tracking |
|---|---|---|---|
| Display | Redaction 20 Regular | 40 / 44 | 0% |
| Menu | Apfel Grotezk Mittel | 14 / 17 | 8% |
| Body | Apfel Grotezk Regular | 16 / 26 | 0% |
| Data | Apfel Grotezk Regular | 11 / 15 | 3% |

CSS variables in `:root` mirror these tokens (`--grigio`, `--blu`, `--grid-line`, etc.).

### Colour tokens — use these, not the raw colours

Every rule paints with the semantic tokens defined in `styles.css`; that is what
lets acid mode remap the site from one block.

| Token | Default (Blu) | Acid |
|---|---|---|
| `--bg` | `#d9d9d9` | `#210013` |
| `--band` | `#0009ff` | `#622779` |
| `--ink` | `#0009ff` | `#6fff55` |
| `--on-band` | `#ffffff` | `#6fff55` |
| `--line` | `#ffffff` | `#b74ddf` |
| `--media` | `#b8b8b8` | `#b74ddf` |
| `--on-media` | `#ffffff` | `#210013` |
| `--statement-ink` / `--statement-hl` | `#ffffff` / `#0009ff` | `#6fff55` / `#b74ddf` |

### Acid mode

Plum ground with a magenta grid, acid-green ink. `theme.js` reads
`localStorage['reinc-theme']` and sets `data-theme="acid"` on `<html>` before
first paint; `:root[data-theme="acid"]` in `styles.css` redefines the tokens
above and nothing else changes.

The switch is the alchemical mercury sign ☿ (`&#9791;`), quicksilver being the
agent of transformation. It carries an `aria-label` since the glyph alone says
nothing to a screen reader, and it is set in a named symbol-font stack so it
stays a text glyph instead of turning into a colour emoji. Active state is a
hairline box drawn in `currentColor`, so it reads the same on the page, on the
blue About header. It has a square of its own on every page. On the index pages
that is the bottom-right cell of the first screen, under the ABOUT cell at the
top of the same column; on the detail pages — a drop, a publication, an artwork
— it moves into the article grid, the square directly under the byline cell
(`.theme-switch--inline`, and `page(..., switch=False)` so the corner one is not
emitted as well). Either way it is in the page colourway, not on a band. There is no active-state mark on the
control — flipping the colourway repaints the page, which says it far more
plainly — only `aria-pressed`. The section pages have a square module, so the
viewport height rarely divides by it: `site.js` measures the last whole row of
the screen and publishes it as `--screen-last-row`.

The home mark is a flat image, so acid reaches it through a `hue-rotate` filter.

## Fonts

- **Redaction 20** (display serif) — bundled in `assets/fonts/` (Regular/Bold/Italic).
- **Apfel Grotezk** (Menu/Body/Data) — bundled in `assets/fonts/` as WOFF2,
  declared under one `@font-face` family with weight mapping: Regular `400`,
  Mittel `500` (nav/Menu), Fett `700`. Source OTFs are kept in `assets/fonts/`
  alongside the generated WOFF2s. The Mittel weight is `<link rel="preload">`ed
  since the nav is above the fold. Regenerate WOFF2 from OTF with fonttools:
  `python3 -c "from fontTools.ttLib import TTFont; f=TTFont('X.otf'); f.flavor='woff2'; f.save('X.woff2')"`.

## Layout — section pages

The Figma frames are 1440 wide on a 90px module (16 columns); mobile is 390 on a
30px module (13 columns). `site.js` keeps the module near 90px and the column
count valid — `--cols` is always `13, 16, 19, 22 …`, i.e. `(N - 4)` divisible by
3, so the 12-column content area still splits into three equal cards at any
window size. It publishes `--cols` and `--cell`; CSS places everything by column
number from there.

Two conventions carry the whole system:

- **The 1px inset.** The background grid paints each line on the leading edge of
  its cell, so every filled block sits at `margin: 1px 0 0 1px` and is 1px
  smaller — that way all four of its bounding lines read alike. This is why
  Figma draws a 4-cell square as 359px at x=361.
- **Whole rows.** Every text block covers an exact number of grid squares
  (89px, 179px, 269px …). CSS can only set a floor (`.blk--row`, `.blk--rows`),
  so `site.js` measures the laid-out copy and rounds each block up to the next
  whole row — clearing that floor first, since a `min-height` beats the measured
  height and would keep a one-line block two rows tall. Blocks stack 1px apart
  inside a group; `.is-spaced` puts a whole empty row before a new group.

Figures state their height in grid rows (`.r-7x4` → `calc(var(--cell) * 4 - 1px)`)
rather than as an `aspect-ratio`. A ratio resolves against the 1px-inset width —
a 7-cell figure is 629px wide, so `630/360` gives 359.43 — and that remainder
accumulates down the page until blocks no longer meet the painted grid. Keep
heights in cells when adding a figure size.

Drop figures are the exception to a *fixed* frame, not to the rule above. The
newsletter carries images of every shape, and one 8x5 box cropped most of them
to a band, so `build.py` reads each file's size (`webp_size`) and rounds its
real height to the nearest whole row — `--fig-rows` on the block, `--fig-rows-m`
for the wider one-column mobile layout. Heights stay in cells; the median figure
loses 2% to the rounding. The handful more than 12% off a whole row (an
ultra-wide banner, a tall screenshot) get `.blk-figure--fit`: the box rounds up
and the image is shown whole inside it.

Column spans come from the `.c-*` set in `sections.css` (`.c-wide`, `.c-narrow`,
`.c-quote` …) — the design only ever uses those.

A drop reads across two measures: its text blocks take the full content width
(`.c-wide`, 12 cells, quotes indented one inside it) while its figures keep the
8-cell reading column (`.c-narrow`). A figure's height follows its own
proportions, and most of what the newsletter carries is square or portrait, so a
12-cell box would turn the majority of them into blocks taller than a screen —
`FIG_COLS` in `build.py` is the width those heights are computed from and has to
match the span the figures actually get. The publishing and artworks pages,
which come from Figma frames that alternate text and figures across the width,
keep the 8-cell measure for both.

### The DROPS masthead

`writing/index.html` is the newsletter's own front page, so it carries the mark:
`assets/images/drops-mark.png`, the 2026 wordmark — pixel serif between two
drop-eyes — two rows tall on the left of the row under the header, with the year
band on the last five cells of that same row and a cell of air between them. The
mark ships as BLU on transparency so it sits on the page ground; acid mode
reaches it through the same `hue-rotate` as the home eye, both being flat
images. It was cut from `drops-newbranding2026/Layer_2-1.png` (build input,
never served) — that export is ink `#0000ff` on a flat `#ebebeb` ground, so the
red channel alone gives the alpha:

```python
a = int(round((235 - r) * 255 / 235))   # per pixel, then paint it #0009ff
``` The `<nav>` around the year controls is
`display: contents`, which is what lets those cells land on the masthead's grid
row while the element still wraps only the controls. The standfirst — what DROPS
is, in two sentences — sits a grid line under the nameplate, in the reading
column, as a `.blk` that `site.js` rounds up to whole rows like every other text
block. On mobile the nameplate takes the width, the band drops to a row of its
own beneath it, and the standfirst opens a group after it.

### The year band, and the archive's single scroll

The two halves of Writing carry their years differently, because there are
fifty-three drops and only thirty-odd archive pieces.

`writing/index.html` shows one year of drops at a time (2023 → 2026). Every card
is in the page carrying a `data-year`; `site.js` hides the rest, so without JS
the page simply lists everything. The band sits on the five cells at the end of
the row under the nav — arrow, year over two cells, arrow, and a cell crossing
to the archive. Stepping off either end follows that crossing
(`archive.html#2022`), so 2020 … 2026 reads as one line across the two pages. At
the ends of the run — 2026 forward, 2023 back — there is nowhere to go: that
arrow is not drawn at all and the year block takes its cell, so the band stays a
solid run of squares. `site.js` puts `data-end` on the band.

`writing/archive.html` is one scroll instead, newest year first. Each year opens
with a band of its own carrying the year (`.divider__band`, the same band the
page opens with) and the div around it carries `id="2022"` and so on, which is
what the drops band's crossing lands on. No JS is involved: the page is a list.

### Reading a drop

Three things carry the long reads, all of them optional enhancements — the page
is whole without JS:

- **The progress rail.** 3px across the top, in `--on-band`. The header is
  sticky, so the rail always has the band behind it. It measures `.article`,
  not the document: the footer and the next-drop band are not part of the read.
- **Reading time.** Counted at build time (`reading_minutes`, 200 wpm) from the
  copy that actually ships, and printed in the kicker — nothing shifts on load.
- **The figure lightbox.** Figures are cut to whole grid rows, so clicking one
  lifts it out whole in a `<dialog>` over the page colour.
- **The guest byline.** The title band stops one cell short of the right edge;
  that cell carries `authors` from `drops.json`, one name per line, and stays
  empty for pieces written in-house. Three names still fit inside the square, so
  the row stays one cell tall — keep it that way when adding more. On mobile the
  cell runs under the band instead.

## Layout — home

- Fixed header (matches Figma HEADER frame): pixel-eye logo
  (`assets/images/reinc-eye-nero.png`) top-left, nav top-right with five items all
  in BLU — WRITING / PUBLISHING / ARTWORKS / WORKSHOPS / TALKS — then the filled
  corner cell (ABOUT on home, HOME elsewhere). Below 768px
  the nav collapses behind a hamburger toggle (full-screen dropdown panel).
- Centered serif statement, one screen tall. Its last row carries the media cell
  in the left corner and the colourway switch in the right one.
- The footer band follows that row directly (`.site-footer--flush`, a 1px grid
  line between them) rather than after an empty row: wordmark, newsletter field,
  nodes, colophon. Its CSS lives in `styles.css` (shared by every page) and is
  measured in `--fmod` — the section pages' own `--cell`, falling back to
  `--foot-mod` (the Figma column count) where there is none.
- Full-page CSS grid background: two `repeating-linear-gradient`s draw white
  (BIANCO) lines over the GRIGIO fill. Cell size = `--grid-cell` (120px).
- Responsive via `clamp()`; one breakpoint at 768px.

## Development

Local preview: `python3 -m http.server 8000` from the repo root, then open
`http://localhost:8000/`. (A `.claude/launch.json` "static" config is provided
for the Claude Code preview tooling.)

Content comes from https://reincantamento.xyz, which is readable with WebFetch —
the article archive lives under `/Articoli-2020`, `/Articoli-2021`,
`/Articoli-2022`. Everything on this site is in English; dates are month and
year, never a time.

**The site must work from disk.** It is opened by double-clicking
`index.html`, over `file://`, not only through a server. That means every
internal link points at an explicit file — `writing/index.html`, never
`writing/`. A bare directory link resolves on an HTTP server but renders a
directory listing from disk.

After any change:

```sh
python3 tools/build.py        # regenerate the section pages
python3 tools/check_links.py  # fails on missing files and directory links
```

## Conventions

- All CSS lives in `assets/css/styles.css`; all JS in `assets/js/main.js`.
  Keep `index.html` markup-only — no inline `<style>` or `<script>` blocks.
  (CSS uses `../fonts` / `../images` paths since it sits under `assets/css/`.)
- Use the CSS custom properties for any color/spacing — do not hardcode hex values
  that already exist as tokens.
- Asset paths are root-relative: `assets/...`.
- Images use `loading="lazy"` where applicable; the eye logo uses `image-rendering: pixelated`.
