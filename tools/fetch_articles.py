# -*- coding: utf-8 -*-
"""Takes the archive articles off the old site — English copy and cover art.

reincantamento.xyz keeps one page per year, in Italian and in English
(`/articles-2021-eng-1`). `content/articles.json` was seeded from the Italian
ones, so the pre-2023 cards still carry Italian titles and no covers. This reads
an English page, matches it against the year already in the JSON, and fills in
the English title, the description, the outlet link and a local cover.

    python3 tools/fetch_articles.py 2021 [url]

The page lists the year newest-first, exactly the order the JSON is in, so the
run is checked before anything is written: the date and outlet of every pair
have to agree or the script stops rather than shuffle the archive.
"""
import html
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'content')
COVERS = os.path.join(ROOT, 'assets', 'images', 'covers')

PAGE = 'https://reincantamento.xyz/articles-%s-eng-1'
# Cargo serves any derivative in place of "t/original": width, quality, format.
DERIVATIVE = 'w/900/q/85/f/webp'


def get(url):
    """curl, not urllib: the system Python here has no CA bundle."""
    r = subprocess.run(['curl', '-sfL', '--retry', '3', '--max-time', '60',
                        '-A', 'Mozilla/5.0', url], capture_output=True)
    if r.returncode != 0:
        raise RuntimeError('curl %d on %s' % (r.returncode, url))
    return r.stdout


def text(fragment):
    """Tags out, escapes in, whitespace collapsed.

    The page is served inside Cargo's JSON payload, so it still carries literal
    \\n, \\t and \\uXXXX escapes; several cells hold nothing but those, and a
    cell that is only whitespace is not a title."""
    s = re.sub(r'<[^>]+>', ' ', fragment or '')
    s = re.sub(r'\\[nrt]', ' ', s)
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    # \uXXXX pairs decode to lone surrogates; put them back together
    s = s.encode('utf-16', 'surrogatepass').decode('utf-16', 'replace')
    return re.sub(r'\s+', ' ', html.unescape(s)).replace('\xa0', ' ').strip()


def slugify(title, year):
    s = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    return '%s-%s' % (year, s[:44].rstrip('-'))


def parse(page):
    """One record per article, in the order the page lists them.

    Each article is three cells — image, title + description, date + outlet —
    so splitting on the images gives one chunk per article."""
    page = page.replace('\\/', '/').replace('\\"', '"').replace('\\n', '\n')
    parts = re.split(r'<img[^>]*data-src="([^"]+)"[^>]*/?>', page)
    out, seen = [], set()

    for i in range(1, len(parts) - 1, 2):
        cover, chunk = parts[i], parts[i + 1]
        if 'freight.cargo.site' not in cover or cover in seen:
            continue
        seen.add(cover)

        title = next((text(h) for h in re.findall(r'<h1>(.*?)</h1>', chunk, re.S) if text(h)), '')
        sub = re.search(r'<small>(.*?)</small>', chunk, re.S)
        meta = re.search(r'<h2>(.*?)</h2>', chunk, re.S)
        block = meta.group(1) if meta else ''
        link = re.search(r'<a href="(https?://[^"]+)"', block)
        m = re.match(r'([A-Z][a-z]+ 20\d\d)\s*,?\s*(.*)', text(block))

        if not title or not (m and m.group(1)):
            continue                            # page furniture, not an article

        out.append({
            'title': title,
            'subtitle': text(sub.group(1)) if sub else '',
            'date': m.group(1) if m else '',
            'outlet': (m.group(2) if m else '').strip(' ,'),
            'url': link.group(1) if link else '',
            'cover': cover,
        })
    return out


def main(argv):
    year = int(argv[1]) if len(argv) > 1 else 2021
    url = argv[2] if len(argv) > 2 else PAGE % year

    scraped = parse(get(url).decode('utf-8', 'replace'))
    arts = json.load(io.open(os.path.join(CONTENT, 'articles.json'), encoding='utf-8'))
    mine = [a for a in arts if a['year'] == year]

    print('%d on the page, %d in articles.json for %d' % (len(scraped), len(mine), year))
    if len(scraped) != len(mine):
        print("counts differ — nothing written")
        return 1

    for a, s in zip(mine, scraped):
        if a['date'] != s['date'] or a['outlet'].lower() != s['outlet'].lower():
            print('out of step: %r (%s, %s) vs %r (%s, %s) — nothing written'
                  % (a['title'][:40], a['date'], a['outlet'],
                     s['title'][:40], s['date'], s['outlet']))
            return 1

    os.makedirs(COVERS, exist_ok=True)
    for a, s in zip(mine, scraped):
        slug = slugify(s['title'], year)
        dest = os.path.join(COVERS, slug + '.webp')
        if not os.path.exists(dest):
            open(dest, 'wb').write(get(s['cover'].replace('t/original', DERIVATIVE, 1)))
        a['title'] = s['title']
        a['subtitle'] = s['subtitle'] or a.get('subtitle', '')
        a['url'] = s['url'] or a.get('url', '')
        a['cover'] = 'assets/images/covers/%s.webp' % slug
        print('  %-52s %s' % (s['title'][:52], slug + '.webp'))

    out = io.open(os.path.join(CONTENT, 'articles.json'), 'w', encoding='utf-8')
    json.dump(arts, out, ensure_ascii=False, indent=2)
    out.write('\n')
    print('\nnow run:  python3 tools/build.py')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
