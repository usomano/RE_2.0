# -*- coding: utf-8 -*-
"""Checks every internal link and asset reference in the site.

Strict about one thing in particular: a link must point at a real FILE, never at
a directory. `href="writing/"` works on an HTTP server but shows a directory
listing when the site is opened from disk (file://) — and this site is meant to
work by double-clicking index.html.

    python3 tools/check_links.py

Exits non-zero if anything is broken, so it can gate a commit.
"""
import io, os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_PREFIX = ('http', 'mailto:', '#', 'data:', 'tel:', 'javascript:')

os.chdir(ROOT)
pages = [p for p in glob.glob('*.html')] + glob.glob('*/*.html')
pages = [p for p in pages if not p.startswith('content' + os.sep)]

problems = []
for p in sorted(pages):
    base = os.path.dirname(p)
    src = io.open(p, encoding='utf-8').read()
    for ref in re.findall(r'(?:href|src)="([^"]+)"', src):
        if ref.startswith(SKIP_PREFIX):
            continue
        target = os.path.normpath(os.path.join(base, ref.split('#')[0]))
        if os.path.isdir(target):
            problems.append((p, ref, 'points at a directory — use .../index.html'))
        elif not os.path.isfile(target):
            problems.append((p, ref, 'missing'))

print('checked %d pages' % len(pages))
if problems:
    print('%d broken reference(s):' % len(problems))
    for page, ref, why in problems:
        print('  %-46s %-44s %s' % (page, ref, why))
    sys.exit(1)
print('all internal references resolve to real files')
