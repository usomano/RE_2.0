# reincantamento-site

**Live site:** [https://usomano.github.io/RE_2.0/](https://usomano.github.io/RE_2.0/)

The website of **REINCANTAMENTO** — an independent research and publishing
collective exploring technology, radical imagination and rituality.
Berlin / Turin / Venice.

Static HTML, CSS and vanilla JavaScript. No framework, no package manager, no
server. Open `index.html` in a browser and it works.

## Preview

The repository includes a GitHub Pages workflow that deploys `main` automatically.
For the first deployment, set **Settings → Pages → Build and deployment → Source**
to **GitHub Actions**. After that, pushes to `main` update the live site.

For local preview, double-click `index.html`. The site runs from disk over
`file://`, no server needed.

If you prefer a server (closer to production, and required if you ever add
`fetch`):

```sh
python3 -m http.server 8000   # then http://localhost:8000/
```

**Every link points at an explicit file**, e.g. `writing/index.html`, never
`writing/`. A bare directory link works on a server but shows a directory
listing from disk. `python3 tools/check_links.py` enforces this.

## Layout

```
index.html            home — the statement screen
about.html            about
lab.html              animation playground (noindex, not linked)

writing/              Writing: the DROPS newsletter, a year at a time
writing/archive.html  the pre-2023 essays published elsewhere, a year at a time
publishing/           Publishing: nCHANT, Arcane Affinities
artworks/             Artworks: five projects

assets/css/           styles.css (shared) · sections.css (section pages) · lab.css
assets/js/            theme.js · main.js (home) · site.js (section pages) · lab.js
assets/fonts/         Redaction and Apfel Grotezk, self-hosted
assets/images/

content/              the site's content, as data
tools/build.py        regenerates the section pages from content/
tools/fetch_drops.py  pulls new issues off Substack into content/
tools/fetch_images.py downloads the images those issues reference
tools/fetch_articles.py  pulls a year of the archive off the old site
```

## Content lives in `content/`

The section pages are **generated** from JSON and the generated HTML is
committed, so the site itself still has no build step. The generator exists
because those sections are large and uniform — 53 drops, 36 archive articles,
5 artworks, 2 publications — and hand-editing them would let the header and
footer drift apart page by page.

| File | Feeds |
|---|---|
| `content/drops.json` | the DROPS half of Writing, and one page per drop |
| `content/articles.json` | the pre-2023 archive (these link out to Medium, Speculum!, Not, …) |
| `content/artworks.json` | Artworks index and detail pages |
| `content/publications.json` | Publishing index and detail pages |
| `content/drops-source/` | the raw Substack export; build input, never served |

To add or edit content, change the JSON and run:

```sh
python3 tools/build.py        # regenerate the section pages
python3 tools/check_links.py  # verify nothing dangles
```

When new issues land on Substack, fetch them first — both scripts only do what
is still missing, so they are safe to re-run:

```sh
python3 tools/fetch_drops.py   # new issues → drops-source/ + drops.json
python3 tools/fetch_images.py  # the images those files reference
python3 tools/build.py
```

The pre-2023 archive came over from reincantamento.xyz, which keeps a page per
year in both languages. `fetch_articles.py` reads an English one and fills that
year in with the English title, the description, the outlet link and a local
cover:

```sh
python3 tools/fetch_articles.py 2021    # https://reincantamento.xyz/articles-2021-eng-1
```

It refuses to write unless every article on the page lines up with the year in
the JSON by date and outlet, so it can never shuffle the archive. 2020 and 2021
are done; 2022 still carries its Italian titles and has no covers. (The 2020
page lives at `/articles-2020-eng`, without the `-1` the others carry — pass the
URL as a second argument when a year breaks the pattern.)

`index.html`, `about.html` and `lab.html` are hand-maintained — the generator
never touches them.

## Images

Covers and article images are referenced but optional: the generator emits an
`<img>` only when the file actually exists, so anything missing shows the flat
placeholder block instead of a broken image. Drop the files in and rebuild.

- `assets/images/covers/dropNN.webp` — drop covers
- `assets/images/publications/<slug>-cover.webp` — publication covers
- `assets/images/publications/<slug>-N.webp` — the four shots on a publication page
- `assets/images/articles/<slug>-N.webp` — images inside drop pages

The drop images come from the Substack export: each `<figure>` there carries
both the local path the image lands on and the original file on Substack's S3
bucket. They were pulled through Substack's own CDN
(`substackcdn.com/image/fetch/w_1400,c_limit,f_webp,q_auto:good/<url>`), which
resizes and encodes server-side — the raw originals are ~300MB, the WebPs 50MB.
Covers are the first figure of each drop at `w_800`. Drop #28 has no images in
the export, so its card keeps the placeholder.

## Design source

The design lives in Figma — see [CLAUDE.md](CLAUDE.md) for the tokens, the grid
system and the conventions that keep the two in sync.

File: **SITO NEW** — <https://www.figma.com/design/kisWr3171g0G6rqOyNOYLF/SITO-NEW>
