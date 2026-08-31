# -*- coding: utf-8 -*-
"""Adds the drops published since the last run to content/.

The newsletter keeps going after a build: this reads Substack's public archive,
takes every issue the site does not have yet, and writes it as one more file in
content/drops-source/ — the same shape as the original export, since that is
what build.py reads. Images are not touched here; the figures come out pointing
at assets/images/articles/<slug>-N.webp and tools/fetch_images.py fills them in.

    python3 tools/fetch_drops.py     # then fetch_images.py, then build.py

Both API endpoints are public and return JSON; free posts carry their whole
body_html, so nothing has to be scraped out of the page markup.
"""
import datetime
import io
import json
import os
import re
import subprocess
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'content')
SRC = os.path.join(CONTENT, 'drops-source')

PUB = 'https://reincantamentox.substack.com'
ARCHIVE = PUB + '/api/v1/archive?sort=new&search=&offset=%d&limit=12'
POST = PUB + '/api/v1/posts/%s'
PAGES = 10                      # 120 issues back, plenty

s3_re = re.compile(r'https%3A%2F%2Fsubstack-post-media\.s3\.amazonaws\.com%2Fpublic%2Fimages%2F[^"\s&]+')
figure_re = re.compile(r'<figure\b.*?</figure>', re.S)
img_src_re = re.compile(r'(<img[^>]*\ssrc=")([^"]*)(")')
num_re = re.compile(r'Drop #(\d+)')

# The export's own template. build.py looks for the <div class="content"> block
# and ignores the rest, but keeping the file identical to its 44 siblings means
# there is only ever one shape to read.
TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{number}. {title} - REINCANTAMENTO</title>
        <meta name="theme-color" content="#ffffff">

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="../assets/images/reinc-eye-nero.png">
    <link rel="stylesheet" href="../assets/css/article.css">

</head>
<body>
    <a href="#main-content" class="skip-link">Skip to content</a>
    <div class="reading-progress" id="reading-progress"></div>
        <nav class="article-header" id="article-header">
        <a href="index.html" class="back-link">&larr; DROPS</a>
        <a href="https://reincantamentox.substack.com" class="reinc-logo" target="_blank" rel="noopener" title="REINCANTAMENTO">
            <img src="../assets/images/reinc-eye-nero.png" alt="REINCANTAMENTO">
        </a>
    </nav>
    <article id="main-content">
        <div class="article-meta">
            <span class="drop-number">{number}</span>
            <span class="reading-time" id="reading-time"></span>
        </div>
        <h1>{title}</h1>
    <h2>{subtitle}</h2>

    <div class="content">
{body}
    </div>
    </article>

    <script src="../assets/js/article.js"></script>
</body>
</html>
"""


def get_json(url):
    """curl, not urllib: the system Python here has no CA bundle."""
    r = subprocess.run(['curl', '-sfL', '--retry', '3', '--max-time', '60',
                        '-A', 'Mozilla/5.0', '-H', 'Accept: application/json', url],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError('curl %d on %s' % (r.returncode, url))
    return json.loads(r.stdout)


def archive():
    """Every issue Substack lists, newest first."""
    posts = []
    for page in range(PAGES):
        batch = get_json(ARCHIVE % (page * 12))
        if not batch:
            break
        posts += batch
    return posts


def localise(body, slug):
    """Point each figure at the file fetch_images.py will put on disk.

    Substack wraps every image in <figure><a><picture><source>…<img>; the <img>
    src is rewritten and the rest left alone, so the original S3 url stays in
    the markup for the image fetcher to find."""
    n = [0]

    def one(match):
        block = match.group(0)
        if not s3_re.search(block):
            return block
        n[0] += 1
        local = '../assets/images/articles/%s-%d.webp' % (slug, n[0])
        return img_src_re.sub(lambda m: m.group(1) + local + m.group(3), block, count=1)

    return figure_re.sub(one, body), n[0]


def main():
    drops = json.load(io.open(os.path.join(CONTENT, 'drops.json'), encoding='utf-8'))
    have = {d['n'] for d in drops}

    fresh = []
    for p in archive():
        m = num_re.match(p.get('title') or '')
        if not m or int(m.group(1)) in have:
            continue
        fresh.append((int(m.group(1)), p))

    if not fresh:
        print('nothing new — the site has every drop Substack lists')
        return 0

    print('%d new drop(s): %s' % (len(fresh), ', '.join('#%d' % n for n, _ in sorted(fresh))))

    for n, listed in sorted(fresh):
        post = get_json(POST % listed['slug'])
        body = post.get('body_html')
        if not body:
            print('  #%d has no public body — skipped' % n)
            continue

        slug = post['slug']
        title = re.sub(r'^Drop #\d+\.?\s*', '', post['title']).strip()
        subtitle = (post.get('subtitle') or '').strip()
        date = datetime.date.fromisoformat(post['post_date'][:10])
        body, figures = localise(body, slug)

        io.open(os.path.join(SRC, slug + '.html'), 'w', encoding='utf-8').write(
            TEMPLATE.format(number='Drop #%d' % n, title=title, subtitle=subtitle, body=body))

        drops.append({
            'slug': slug,
            'cover': '../assets/images/covers/drop%d.webp' % n,
            'number': 'Drop #%d' % n,
            'title': title,
            'subtitle': subtitle,
            'date': date.strftime('%B %-d, %Y'),
            'n': n,
            'kind': 'drop',
        })
        print('  #%-3d %-46s %s  %d figure(s)' % (n, slug, date, figures))

    drops.sort(key=lambda d: d['n'], reverse=True)
    out = io.open(os.path.join(CONTENT, 'drops.json'), 'w', encoding='utf-8')
    json.dump(drops, out, ensure_ascii=False, indent=2)
    out.write('\n')

    print('\nnow run:  python3 tools/fetch_images.py && python3 tools/build.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
