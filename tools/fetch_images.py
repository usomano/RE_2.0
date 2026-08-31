"""Pull the drop images out of the Substack export into assets/images/.

The export's <figure> blocks already carry the local path each image is meant
to land on; the original file lives on Substack's S3 bucket. We fetch through
Substack's own CDN so the resize/WebP encode happens server-side — the raw
originals are ~300MB, the WebPs a tenth of that."""

import json, os, re, subprocess, sys, urllib.parse, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'content', 'drops-source')
CDN = 'https://substackcdn.com/image/fetch/%s/%s'
FIG_OPTS = 'w_1400,c_limit,f_webp,q_auto:good'
COVER_OPTS = 'w_800,c_limit,f_webp,q_auto:good'

figure_re = re.compile(r'<figure\b.*?</figure>', re.S)
img_re = re.compile(r'<img[^>]*\ssrc="([^"]+)"')
s3_re = re.compile(r'https%3A%2F%2Fsubstack-post-media\.s3\.amazonaws\.com%2Fpublic%2Fimages%2F[^"\s&]+')


def figures(html):
    """(local path as written in the export, original S3 url) per figure."""
    out = []
    for block in figure_re.findall(html):
        srcs = img_re.findall(block)
        local = next((s for s in srcs if not s.startswith('http')), None)
        m = s3_re.search(block)
        if local and m:
            out.append((local, urllib.parse.unquote(m.group(0))))
    return out


def fetch(url, dest, opts):
    """curl, not urllib: the system Python here has no CA bundle."""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    src = CDN % (opts, urllib.parse.quote(url, safe=''))
    r = subprocess.run(['curl', '-sfL', '--retry', '3', '--max-time', '90',
                        '-A', 'Mozilla/5.0', '-H', 'Accept: image/webp,*/*',
                        '-o', dest, '-w', '%{http_code} %{size_download}', src],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError('curl %d (%s)' % (r.returncode, r.stdout.strip()))
    code, size = r.stdout.split()
    if code != '200' or int(size) == 0:
        raise RuntimeError('HTTP %s, %s bytes' % (code, size))
    return int(size)


drops = {d['slug']: d for d in json.load(open(os.path.join(ROOT, 'content', 'drops.json')))}

jobs, rewrites, covers = [], {}, []
for name in sorted(os.listdir(SRC)):
    if not name.startswith('drop-') or not name.endswith('.html'):
        continue
    path = os.path.join(SRC, name)
    html = open(path, encoding='utf-8').read()
    figs = figures(html)
    if not figs:
        continue
    slug = name[:-5]
    for i, (local, url) in enumerate(figs):
        webp = os.path.splitext(local)[0] + '.webp'
        rewrites.setdefault(path, []).append((local, webp))
        # the export's paths are relative to writing/
        jobs.append((url, os.path.normpath(os.path.join(ROOT, 'writing', webp)), FIG_OPTS))
    d = drops.get(slug)
    if d:
        covers.append((figs[0][1],
                       os.path.join(ROOT, 'assets/images/covers/drop%d.webp' % d['n']),
                       COVER_OPTS))

jobs += covers
total_jobs = len(jobs)
# already on disk: leave it alone, so a re-run only fills the gaps
jobs = [j for j in jobs if not os.path.exists(j[1])]
print('%d images referenced, %d already on disk, %d to fetch'
      % (total_jobs, total_jobs - len(jobs), len(jobs)))

done, failed, total = 0, [], 0
with cf.ThreadPoolExecutor(8) as pool:
    futs = {pool.submit(fetch, *j): j for j in jobs}
    for fut in cf.as_completed(futs):
        url, dest, _ = futs[fut]
        try:
            total += fut.result()
            done += 1
        except Exception as e:
            failed.append((dest, url, str(e)))

print('fetched %d files, %.1f MB' % (done, total / 1e6))
for f in failed:
    print('FAILED', f[0], f[2])

# only rewrite the export once the bytes are on disk
for path, pairs in rewrites.items():
    html = open(path, encoding='utf-8').read()
    for old, new in pairs:
        if os.path.exists(os.path.normpath(os.path.join(ROOT, 'writing', new))):
            html = html.replace('"%s"' % old, '"%s"' % new)
    open(path, 'w', encoding='utf-8').write(html)
print('rewrote %d export files' % len(rewrites))
sys.exit(1 if failed else 0)
