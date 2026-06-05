# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

**reincantamento-site** is the new homepage for REINCANTAMENTO — an independent
research and publishing collective exploring technology, radical imagination, and
rituality. It is a single static page (`index.html`) translated from the Figma
design "SITO NEW".

No build process. Pure HTML + CSS (all styles are inline in `index.html`).
Vanilla, no framework, no package manager.

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

## Fonts

- **Redaction 20** (display serif) — bundled in `assets/fonts/` (Regular/Bold/Italic).
- **Apfel Grotezk** (Menu/Body/Data) — NOT yet bundled. The nav currently falls
  back to Helvetica/Arial. When the `.woff2`/`.woff` files are available, add them
  to `assets/fonts/` and declare `@font-face` for the `Apfel Grotezk` family.

## Layout

- Fixed header: pixel-eye logo (`assets/images/reinc-eye-nero.png`) top-left,
  nav (ABOUT / WORKS / INFO) top-right with WORKS active in BLU.
- Centered serif statement with select words highlighted in BLU.
- Full-page CSS grid background: two `repeating-linear-gradient`s draw white
  (BIANCO) lines over the GRIGIO fill. Cell size = `--grid-cell` (120px).
- Responsive via `clamp()`; one breakpoint at 768px.

## Development

Local preview: `python3 -m http.server 8000` from the repo root, then open
`http://localhost:8000/`. (A `.claude/launch.json` "static" config is provided
for the Claude Code preview tooling.)

## Conventions

- All CSS lives in the `<style>` block of `index.html` (single-file page).
- Use the CSS custom properties for any color/spacing — do not hardcode hex values
  that already exist as tokens.
- Asset paths are root-relative: `assets/...`.
- Images use `loading="lazy"` where applicable; the eye logo uses `image-rendering: pixelated`.
