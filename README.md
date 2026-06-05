# reincantamento-site

New homepage for **REINCANTAMENTO** — an independent research and publishing
collective exploring technology, radical imagination, and rituality.

A single static page translated from the Figma design *SITO NEW*.

## Run locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Structure

```
index.html              # the page (all HTML + CSS inline)
assets/
  fonts/                # Redaction 20 (display serif)
  images/               # reinc-eye-nero.png (brand eye / favicon)
.claude/launch.json     # preview server config for Claude Code
CLAUDE.md               # design tokens, Figma source, conventions
```

## Design

Source of truth: [Figma — SITO NEW](https://www.figma.com/design/kisWr3171g0G6rqOyNOYLF/SITO-NEW)

- **GRIGIO** `#D9D9D9` — background · **BLU** `#0009FF` — accent · **BIANCO** `#FFFFFF` — grid lines
- Display type: Redaction 20 (40/44)
- Menu/Body/Data: Apfel Grotezk (not yet bundled — falls back to Helvetica)

See [CLAUDE.md](CLAUDE.md) for full token reference.
