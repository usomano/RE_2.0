# -*- coding: utf-8 -*-
"""Builds the repetitive pages of reincantamento-site from content/*.json.

The site itself has no build step: this script is run by hand and its output is
committed. It exists because the sections are large and uniform — 44 drops, 36
archive articles, 5 artworks, 2 publications — and hand-writing them would
guarantee the header and footer drift apart.

    python3 tools/build.py

Hand-maintained pages (index.html, about.html, lab.html) are never touched.
"""
import io
import json, math, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'content')

CHEV_L = '<svg viewBox="0 0 14 22" aria-hidden="true"><polyline points="12,2 3,11 12,20"/></svg>'
CHEV_R = '<svg viewBox="0 0 14 22" aria-hidden="true"><polyline points="2,2 11,11 2,20"/></svg>'

# Explicit index.html, never a bare directory: a link to "writing/" only
# resolves on an HTTP server. Opened from disk (file://) the browser shows a
# directory listing instead, and the site has to work by double-clicking it.
NAV = [('Writing', 'writing/index.html'), ('Publishing', 'publishing/index.html'),
       ('Artworks', 'artworks/index.html'), ('Workshops', None), ('Talks', None)]


def load(name):
    return json.load(io.open(os.path.join(CONTENT, name), encoding='utf-8'))


# ---------------------------------------------------------------- the shell
def head(title, desc, up):
    """up: '' for a root page, '../' for a page one folder down."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <meta name="description" content="{desc}">

    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:type" content="website">

    <link rel="icon" href="{up}assets/images/REINC-LOGO.svg" type="image/svg+xml">
    <link rel="icon" href="{up}assets/images/reinc-eye-nero.png" type="image/png"><!-- fallback -->

    <link rel="preload" href="{up}assets/fonts/ApfelGrotezk-Mittel.woff2" as="font" type="font/woff2" crossorigin>

    <link rel="stylesheet" href="{up}assets/css/styles.css">
    <link rel="stylesheet" href="{up}assets/css/sections.css">

    <!-- Not deferred: applies the stored palette before first paint. -->
    <script src="{up}assets/js/theme.js"></script>
</head>
<body class="page">

    <a class="skip-link" href="#main">Skip to content</a>
"""


def header(current, up):
    items = []
    for label, href in NAV:
        if href is None:
            items.append(f'            <span class="grid-nav__item" aria-disabled="true">{label}</span>')
        else:
            cur = ' aria-current="page"' if label == current else ''
            items.append(f'            <a class="grid-nav__item" href="{up}{href}"{cur}>{label}</a>')
    return f"""
    <header class="grid-header grid-row">
        <a class="grid-header__logo" href="{up}index.html" aria-label="Reincantamento — home">
            <svg viewBox="0 0 44 22" aria-hidden="true"><ellipse cx="22" cy="11" rx="22" ry="11"/></svg>
        </a>

        <button class="grid-header__menu" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button>

        <nav class="grid-nav" id="primary-nav" aria-label="Primary">
""" + "\n".join(items) + """
        </nav>
    </header>
"""


def footer(up):
    return f"""
    <footer class="site-footer">
        <p class="site-footer__mark">REINCANTAMENTO</p>

        <div class="footer-cols">
            <form class="newsletter" action="https://reincantamentox.substack.com/subscribe" method="get" target="_blank">
                <label class="newsletter__label" for="nl-email">Subscribe to drops</label>
                <div class="newsletter__field">
                    <input id="nl-email" type="email" name="email" placeholder="your@email.com" autocomplete="email">
                    <button type="submit" aria-label="Subscribe">&#8594;</button>
                </div>
            </form>

            <nav class="footer-social" aria-label="Nodes">
                <a href="mailto:reincantamento@proton.me">Email</a>
                <a href="https://www.instagram.com/re.incantamento/" target="_blank" rel="noopener">Instagram</a>
                <a href="https://t.me/+C1fjM6yVcdJmYzI0" target="_blank" rel="noopener">Telegram</a>
                <a href="https://reincantamentox.substack.com/" target="_blank" rel="noopener">Newsletter</a>
                <a href="https://www.are.na/reincantamento/channels/" target="_blank" rel="noopener">Are.na</a>
            </nav>
        </div>

        <div class="footer-bottom">
            <p>2026 Reincantamento &nbsp;&#183;&nbsp; Berlin / Turin / Venice</p>
            <div class="footer-legal">
                <button class="theme-toggle" type="button" aria-pressed="false" aria-label="Acid mode" title="Acid mode">&#9791;</button>
                <a href="{up}index.html">Home</a>
                <a href="{up}about.html">About</a>
            </div>
        </div>
    </footer>

    <script src="{up}assets/js/site.js" defer></script>
</body>
</html>
"""


def write(relpath, body):
    path = os.path.join(ROOT, relpath)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    io.open(path, 'w', encoding='utf-8').write(body)
    return relpath


def page(relpath, title, desc, current, up, main):
    return write(relpath, head(title, desc, up) + header(current, up) + main + footer(up))


def title_row(title, back_href, back_label, authors=()):
    """The head of a long read: the progress rail, then the title band.

    The rail rides on top of the sticky header, so it always has the band
    behind it — it reads as a line drawn across the page as you go down.

    The band stops one cell short of the edge; that last cell is where a guest
    byline goes, one name per line. Pieces written in-house leave it empty, the
    way the frame draws it."""
    names = "".join(f'<span>{a}</span>' for a in authors)
    byline = f'\n            <p class="title-authors">{names}</p>' if names else ''
    return f"""
    <div class="reading-progress" role="progressbar" aria-label="Reading progress"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>

    <main id="main" tabindex="-1">

        <div class="title-row grid-row">
            <a class="back-cell" href="{back_href}" aria-label="{back_label}">{CHEV_L}</a>
            <h1 class="title-band">{title}</h1>{byline}
        </div>

        <div class="article grid-row">
"""


def next_band(label, title, href):
    return f"""
            <a class="next-band is-spaced" href="{href}">
                <span class="next-band__label">{label}</span>
                <span class="next-band__title">{title}</span>
            </a>
            <a class="next-cell is-spaced" href="{href}" aria-hidden="true" tabindex="-1">{CHEV_R}</a>

        </div>
    </main>
"""


def credit_blocks(credits):
    out = []
    for n, (label, values) in enumerate(credits):
        cls = 'blk c-third' + (' c-start' if n % 3 == 0 else '') + (' is-spaced' if n < 3 else '')
        dd = "\n".join(f'                    <dd>{v}</dd>' for v in values)
        out.append(f"""            <div class="{cls}">
                <dl class="blk-credit">
                    <dt>{label}</dt>
{dd}
                </dl>
            </div>""")
    return "\n\n".join(out)


def text_sections(sections):
    out = []
    for title, paras in sections:
        body = "\n".join(f'                    <p class="blk-text">{p}</p>' for p in paras)
        out.append(f"""            <div class="blk-group c-narrow is-spaced">
                <h2 class="blk blk--row blk-heading">{title}</h2>
                <div class="blk blk--rows">
{body}
                </div>
            </div>""")
    return "\n\n".join(out)


# The reading column is 8 cells wide on desktop; on mobile every block spans the
# content width, which is 11 cells of the 13-column module.
FIG_COLS, FIG_COLS_M = 8, 11


def webp_size(path):
    """Canvas size of a WebP, straight out of the VP8X header — every image here
    comes from the same encoder, so there is nothing else to handle."""
    with open(path, 'rb') as f:
        head = f.read(30)
    if len(head) < 30 or head[12:16] != b'VP8X':
        return None
    return (int.from_bytes(head[24:27], 'little') + 1,
            int.from_bytes(head[27:30], 'little') + 1)


def fig_rows(path):
    """A figure's height in whole grid rows: (desktop, mobile, fit).

    The drops carry images of every shape — square, 16:9, portrait — so one
    fixed frame cropped most of them to a band. Measuring the file and rounding
    its real height to the nearest whole row keeps the block on the painted grid
    (heights stay in cells, never a ratio) and trims a couple of percent off the
    median figure — invisible.

    A handful of extremes can't be served that way: an ultra-wide banner or a
    tall screenshot lands far from any whole row, or runs past the cap. Those
    are flagged `fit`, rounded up and shown whole inside the box, with the
    media colour filling the leftover strip — a visible band beats a cut."""
    size = webp_size(path)
    if not size:
        return 5, 7, False
    w, h = size

    def rows(cols, cap, floor):
        ideal = cols * h / w
        n = min(cap, max(floor, round(ideal)))
        return n, abs(n - ideal) / max(n, ideal)

    # The caps only bite on a few very tall screenshots; letting those run to 16
    # rows costs a tall block but keeps the image readable.
    d, d_off = rows(FIG_COLS, 16, 2)
    m, m_off = rows(FIG_COLS_M, 22, 3)
    # 12% is where a crop stops reading as framing and starts eating the image:
    # a 16:9 still lands 11% off a whole row and is fine cropped, a 1400x428
    # banner is 18% off and would lose its ends.
    if max(d_off, m_off) <= 0.12:
        return d, m, False
    return (min(16, max(2, math.ceil(FIG_COLS * h / w))),
            min(22, max(3, math.ceil(FIG_COLS_M * h / w))), True)


def cover_img(path, alt):
    """Emit an <img> only when the file is actually there, so a missing cover
    shows the flat placeholder instead of a broken-image icon."""
    if os.path.exists(os.path.join(ROOT, path)):
        return f'<img src="../{path}" alt="{alt}" loading="lazy">'
    return ''


made = []

# ------------------------------------------------------------------ WRITING
drops = load('drops.json')
articles = load('articles.json')

MONTH_N = {m: i for i, m in enumerate(
    ['January', 'February', 'March', 'April', 'May', 'June',
     'July', 'August', 'September', 'October', 'November', 'December'], 1)}


def art_key(a):
    return (a['year'], MONTH_N.get(a['date'].split()[0], 0))


current_items = [dict(d, href=d['slug'] + '.html') for d in drops]
archive_items = sorted([a for a in articles if a['year'] < 2023], key=art_key, reverse=True)


def year_of(it):
    """Both card kinds carry their year: drops in the date, archive articles in
    a field of their own."""
    if it['kind'] == 'drop':
        return int(it['date'].split()[-1]) if it['date'] else 0
    return it['year']


def year_nav(years, current, other_href, other_label):
    """The band under the header: one year at a time, the arrows stepping
    through them, and a last cell crossing to the other half of the timeline.

    The drops (2023 onward) and the archive (published elsewhere, before 2023)
    are two pages, so stepping off either end follows that link instead of a
    year — the run 2020 … 2026 reads as one line even though it is cut in two."""
    cells = []
    for y in years:
        cur = ' aria-current="true"' if y == current else ''
        cells.append(f'            <a class="year-nav__year" href="#{y}" data-year="{y}"{cur}>{y}</a>')
    return f"""
        <nav class="year-nav grid-row" aria-label="By year">
            <a class="year-nav__step" href="#" data-step="-1" aria-label="Previous year">{CHEV_L}</a>
            <span class="year-nav__years">
{chr(10).join(cells)}
            </span>
            <a class="year-nav__step" href="#" data-step="1" aria-label="Next year">{CHEV_R}</a>
            <a class="year-nav__other" href="{other_href}">{other_label}</a>
        </nav>
"""


def writing_card(it):
    if it['kind'] == 'drop':
        kicker = it['number']
        meta = it['date']
        href, ext = it['href'], ''
        media = cover_img('assets/images/covers/drop%d.webp' % it['n'], it['number'])
    else:
        kicker = it['outlet']
        meta = f"{it['date']} &#183; {it['outlet']}"
        href = it['url'] or '#'
        ext = ' target="_blank" rel="noopener"' if it['url'] else ''
        media = cover_img(it['cover'], it['title']) if it.get('cover') else ''
    sub = f'<p class="card__abstract">{it["subtitle"]}</p>' if it.get('subtitle') else ''
    meta_line = f'<p class="card__meta">{meta}</p>' if meta else ''
    # The arrow promises a link away, so it only shows when there is one — a
    # couple of the 2020 episodes have no surviving address.
    arrow = ('<span class="card__out" aria-hidden="true">&#8599;</span>'
             if it['kind'] == 'article' and it['url'] else '')
    # A guest byline rides in the top-right corner of the card, opposite the
    # drop number — the same pairing the article page makes with its title.
    by = it.get('authors') or ()
    byline = f'<span class="card__by">{" &#183; ".join(by)}</span>' if by else ''
    # A drop always gets the block, cover or not — the flat placeholder is how
    # the frame draws a missing one. An archive article only gets it once its
    # cover has been pulled across from the old site; the years still without
    # art stay text only rather than becoming a wall of empty grey.
    media_block = f'<div class="card__media">{media}</div>' if (it['kind'] == 'drop' or media) else ''
    return f"""                <li class="card" data-year="{year_of(it)}">
                    <a href="{href}"{ext}>
                        {media_block}
                        <div class="card__body">
                            <p class="card__kicker"><span class="card__no">{kicker}</span>{arrow}{byline}</p>
                            <h2 class="card__title">{it['title']}</h2>
                            {sub}
                            {meta_line}
                        </div>
                    </a>
                </li>"""


drop_years = sorted({year_of(i) for i in current_items})
archive_years = sorted({year_of(i) for i in archive_items})

main = """
    <main id="main" tabindex="-1">

        <!-- Mobile only: the desktop frame names the section through the nav. -->
        <div class="grid-row">
            <h1 class="section-title">Writing</h1>
        </div>
""" + year_nav(drop_years, drop_years[-1],
                  'archive.html#%d' % archive_years[-1], 'Archive') + """
        <div class="cards grid-row">
            <ul class="card-grid" id="card-grid">

""" + "\n\n".join(writing_card(i) for i in current_items) + """

            </ul>
        </div>
    </main>
"""
made.append(page('writing/index.html', 'REINCANTAMENTO &#8212; Writing',
                 'DROPS, the newsletter by Reincantamento, one year at a time.',
                 'Writing', '../', main))

# Everything the group published before the DROPS newsletter began: essays that
# live on other outlets, so these cards link away. Its own page, with the same
# band running over the years it covers.
archive_main = """
    <main id="main" tabindex="-1">

        <div class="grid-row">
            <h1 class="section-title">Archive</h1>
        </div>

        <div class="divider grid-row">
            <h2 class="divider__band">Archive<span class="divider__note">Before 2023 &#183; published elsewhere</span></h2>
        </div>
""" + year_nav(archive_years, archive_years[-1],
                  'index.html#%d' % drop_years[0], 'Drops') + """
        <div class="cards grid-row is-archive">
            <ul class="card-grid" id="card-grid">

""" + "\n\n".join(writing_card(i) for i in archive_items) + """

            </ul>
        </div>
    </main>
"""
made.append(page('writing/archive.html', 'REINCANTAMENTO &#8212; Archive',
                 'Essays published elsewhere before the DROPS newsletter began, 2020 to 2022.',
                 'Writing', '../', archive_main))


# ---- drop pages: convert the exported Substack body into the block system ----
# Only these inline tags survive the crossing; everything else Substack emits
# (picture/source/srcset soups, data-attrs, tracking wrappers) is dropped.
KEEP_INLINE = ('em', 'i', 'strong', 'b', 'a', 'br', 'code', 'sup', 'sub')


def clean_inline(s):
    s = re.sub(r'<a [^>]*href="([^"]*)"[^>]*>', r'<a href="\1" target="_blank" rel="noopener">', s)
    # strip every tag that is not on the keep list, opening or closing
    s = re.sub(r'</?([a-zA-Z0-9]+)\b[^>]*/?>',
               lambda m: m.group(0) if m.group(1).lower() in KEEP_INLINE else '', s)
    # drop attributes from the survivors, except the href we just normalised
    s = re.sub(r'<(?!a )([a-zA-Z0-9]+)\b[^>]*>', r'<\1>', s)
    return re.sub(r'\s+', ' ', s).strip()


def convert_body(html_src):
    """Substack markup -> our blocks. Paragraphs gather into a text block, a
    heading opens a new group, quotes and figures become their own blocks.

    Figures are pulled out FIRST and replaced by a marker: Substack wraps each
    image in <figure><a><picture><source>…<img>, and left in place that markup
    leaks into the surrounding paragraphs."""
    m = re.search(r'<div class="content">(.*)</div>\s*(?:<div class="article-footer|</article)', html_src, re.S)
    if not m:
        return []
    body = m.group(1)
    body = re.sub(r'<div class="(youtube-wrap|tiktok-wrap)[^"]*".*?</div>\s*</div>', '', body, flags=re.S)

    figures = []

    def take_figure(match):
        block = match.group(0)
        # prefer the local export path over the CDN srcset variants
        srcs = re.findall(r'<img[^>]*\ssrc="([^"]+)"', block)
        src = next((s for s in srcs if not s.startswith('http')), srcs[0] if srcs else '')
        cap = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', block, re.S)
        figures.append((src, clean_inline(cap.group(1)) if cap else ''))
        return '\n@@FIG%d@@\n' % (len(figures) - 1)

    body = re.sub(r'<figure\b.*?</figure>', take_figure, body, flags=re.S)

    tokens = re.findall(
        r'@@FIG(\d+)@@'
        r'|<h[1-3][^>]*>(.*?)</h[1-3]>'
        r'|<blockquote[^>]*>(.*?)</blockquote>'
        r'|<p[^>]*>(.*?)</p>', body, re.S)
    blocks, para = [], []

    def flush():
        if para:
            blocks.append(('text', list(para)))
            del para[:]

    # Substack appends the same subscription pitch to every issue; it is
    # newsletter chrome, not the piece, so it does not travel to the site.
    CHROME = ('runs on voluntary work', 'paid subscriber', 'off forever',
              'one-time donation', 'Subscribers will get access', 'Leave a comment',
              'Share Reincantamento', 'Thanks for reading', 'Monthly:', 'Yearly:')

    for fig, h, q, p in tokens:
        if fig != '':
            flush()
            blocks.append(('figure', figures[int(fig)]))
        elif h.strip():
            flush()
            blocks.append(('heading', clean_inline(h)))
        elif q.strip():
            flush()
            blocks.append(('quote', clean_inline(q)))
        elif p.strip():
            t = clean_inline(p)
            if t and t not in ('&nbsp;', '&#160;') and not any(c in t for c in CHROME):
                para.append(t)
    flush()
    return blocks


WPM = 200


def reading_minutes(blocks):
    """Minutes at 200 words a minute, from the copy that actually ships —
    headings, paragraphs and quotes, with the tags stripped back out."""
    words = 0
    for kind, val in blocks:
        if kind == 'text':
            text = " ".join(val)
        elif kind in ('heading', 'quote'):
            text = val
        else:
            continue
        words += len(re.sub(r'<[^>]+>', ' ', text).split())
    return max(1, round(words / WPM))


def render_blocks(blocks):
    out, group = [], []

    def close():
        if group:
            out.append('            <div class="blk-group c-narrow is-spaced">\n' +
                       "\n".join(group) + '\n            </div>')
            del group[:]

    for kind, val in blocks:
        if kind == 'heading':
            close()
            group.append(f'                <h2 class="blk blk--row blk-heading">{val}</h2>')
        elif kind == 'text':
            body = "\n".join(f'                    <p class="blk-text">{p}</p>' for p in val)
            group.append(f'                <div class="blk blk--rows">\n{body}\n                </div>')
        elif kind == 'quote':
            close()
            out.append('            <div class="blk-group c-quote is-spaced">\n'
                       f'                <blockquote class="blk blk--rows blk-quote">{val}</blockquote>\n'
                       '            </div>')
        elif kind == 'figure':
            close()
            src, cap = val
            capblk = (f'\n                <figcaption class="blk blk--row blk-caption">{cap}</figcaption>'
                      if cap else '')
            # The Substack export references images that were not shipped with
            # it. Emit the <img> only once the file is actually in assets/, so a
            # missing one shows the flat placeholder, never a broken icon. A
            # present one also sets the box to its own height in rows; a missing
            # one keeps the 8x5 frame the design draws for an empty figure.
            local = os.path.normpath(os.path.join(ROOT, 'writing', src))
            if os.path.exists(local):
                rows, rows_m, fit = fig_rows(local)
                cls = 'blk-figure blk-figure--auto' + (' blk-figure--fit' if fit else '')
                box = (f'<div class="{cls}" '
                       f'style="--fig-rows: {rows}; --fig-rows-m: {rows_m};">'
                       f'<img src="{src}" alt="" loading="lazy"></div>')
            else:
                box = '<div class="blk-figure r-8x5"></div>'
            out.append('            <figure class="blk-group c-narrow is-spaced">\n'
                       f'                {box}'
                       f'{capblk}\n            </figure>')
    close()
    return "\n\n".join(out)


# the Substack export: build input, never served
src_dir = os.path.join(CONTENT, 'drops-source')
for i, d in enumerate(drops):
    src_path = os.path.join(src_dir, d['slug'] + '.html')
    blocks = convert_body(io.open(src_path, encoding='utf-8').read()) if os.path.exists(src_path) else []
    nxt = drops[(i + 1) % len(drops)]
    lede = (f'''
            <div class="blk-group c-narrow">
                <p class="blk blk--row blk-lede">{d["subtitle"]}</p>
            </div>
''' if d['subtitle'] else '')
    kicker = d['number'] + (' &#183; ' + d['date'] if d['date'] else '')
    if blocks:
        kicker += ' &#183; %d min read' % reading_minutes(blocks)
    main = (title_row(d['title'], 'index.html', 'Back to Writing', d.get('authors', ())) + f"""
            <div class="blk-group c-narrow">
                <p class="blk blk--row blk-kicker">{kicker}</p>
            </div>
{lede}
""" + render_blocks(blocks) + next_band('Next drop', nxt['number'] + ' &#183; ' + nxt['title'],
                                        nxt['slug'] + '.html'))
    made.append(page('writing/%s.html' % d['slug'],
                     'REINCANTAMENTO &#8212; %s' % d['title'],
                     (d['subtitle'] or d['title'])[:150], 'Writing', '../', main))

# --------------------------------------------------------------- PUBLISHING
pubs = load('publications.json')
cards = []
for p in pubs:
    cards.append(f"""                <li class="card">
                    <a href="{p['slug']}.html">
                        <div class="card__cover"><span style="--cover-w: {p['cover_w']}; --cover-h: {p['cover_h']};">{cover_img('assets/images/publications/%s-cover.jpg' % p['slug'], p['title'])}</span></div>
                        <div class="card__body">
                            <p class="card__kicker">{p['kind']}</p>
                            <h2 class="card__title">{p['title']} &#8212; {p['subtitle']}</h2>
                            <p class="card__abstract">{p['abstract']}</p>
                            <p class="card__meta">{p['meta']}</p>
                        </div>
                    </a>
                </li>""")

main = """
    <main id="main" tabindex="-1">

        <div class="grid-row">
            <h1 class="section-title">Publishing</h1>
        </div>

        <div class="cards grid-row">
            <ul class="card-grid">

""" + "\n\n".join(cards) + """

            </ul>
        </div>
    </main>
"""
made.append(page('publishing/index.html', 'REINCANTAMENTO &#8212; Publishing',
                 'nCHANT magazine and Arcane Affinities — printed matter published by Reincantamento.',
                 'Publishing', '../', main))

for i, p in enumerate(pubs):
    nxt = pubs[(i + 1) % len(pubs)]
    buy = ''
    if p['buy']:
        buy = f"""

            <div class="blk-group c-narrow is-spaced">
                <div class="blk blk--row">
                    <p class="blk-text"><a href="{p['buy']}" target="_blank" rel="noopener">Purchase &#8594;</a></p>
                </div>
            </div>"""
    intro = "\n".join(f'                <p class="blk-text">{t}</p>' for t in p['intro'])
    main = (title_row(p['title'], 'index.html', 'Back to Publishing') + f"""
            <div class="blk-figure r-12x6 c-wide is-spaced"></div>

            <div class="blk c-right">
{intro}
            </div>

""" + credit_blocks(p['credits']) + """

            <div class="blk-figure r-4x6 c-l4 is-spaced"></div>
            <div class="blk-figure r-7x6 c-r7 is-spaced"></div>

""" + text_sections(p['sections']) + buy + """

            <div class="blk-figure r-12x6 c-wide is-spaced"></div>
""" + next_band('Next publication', nxt['title'], nxt['slug'] + '.html'))
    made.append(page('publishing/%s.html' % p['slug'],
                     'REINCANTAMENTO &#8212; %s' % p['title'], p['abstract'][:150],
                     'Publishing', '../', main))

# ----------------------------------------------------------------- ARTWORKS
arts = load('artworks.json')
rows = []
for a in arts:
    rows.append(f"""                <li class="media-row">
                    <a href="{a['slug'].replace('artwork-', '').replace('.html', '')}.html">
                        <div class="media-row__still"></div>
                        <div class="media-row__body">
                            <h2 class="media-row__title">{a['card_title']}</h2>
                            <p>{a['intro'][0]}</p>
                            <p>{a['intro'][1]}</p>
                            <p class="media-row__meta">{a['date']} &#183; {a['tags']}</p>
                        </div>
                    </a>
                </li>""")

main = """
    <main id="main" tabindex="-1">

        <div class="grid-row">
            <h1 class="section-title">Artworks</h1>
        </div>

        <div class="grid-row">
            <ul class="media-list">

""" + "\n\n".join(rows) + """

            </ul>
        </div>
    </main>
"""
made.append(page('artworks/index.html', 'REINCANTAMENTO &#8212; Artworks',
                 'Artworks, video essays, games and performances by Reincantamento.',
                 'Artworks', '../', main))

FIG_PAIRS = ['            <div class="blk-figure r-4x4 c-l4 is-spaced"></div>\n'
             '            <div class="blk-figure r-7x4 c-r7 is-spaced"></div>',
             '            <div class="blk-figure r-7x4 c-l7 is-spaced"></div>\n'
             '            <div class="blk-figure r-4x4 c-r4 is-spaced"></div>']

for i, a in enumerate(arts):
    slug = a['slug'].replace('artwork-', '').replace('.html', '')
    nxt = arts[(i + 1) % len(arts)]
    nslug = nxt['slug'].replace('artwork-', '').replace('.html', '')
    intro = "\n".join(f'                <p class="blk-text">{t}</p>' for t in a['intro'])
    sections = [(t, ps) for t, ps in a['sections']]
    for label, href, text in a['links']:
        sections.append((label, [f'<a href="{href}" target="_blank" rel="noopener">{text}</a>']))
    main = (title_row(a['title'], 'index.html', 'Back to Artworks') + f"""
            <div class="title-card c-wide is-spaced">
                <h2 class="title-card__title">{a['card_title']}</h2>
                <p class="title-card__meta">{a['date']} &#183; {a['tags']}</p>
            </div>

            <div class="blk c-wide is-spaced">
{intro}
            </div>

""" + credit_blocks([(l, v) for l, v in a['credits']]) + "\n\n" + FIG_PAIRS[0] + "\n\n"
            + text_sections(sections) + "\n\n" + FIG_PAIRS[1]
            + next_band('Next artwork', nxt['title'], nslug + '.html'))
    made.append(page('artworks/%s.html' % slug, 'REINCANTAMENTO &#8212; %s' % a['title'],
                     a['intro'][0][:150], 'Artworks', '../', main))

print('built %d pages' % len(made))
for grp in ('writing/', 'publishing/', 'artworks/'):
    print('  %-12s %d' % (grp, sum(1 for m in made if m.startswith(grp))))
