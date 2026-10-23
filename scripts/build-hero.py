"""Rebuild inline first-screen data/effects and version external assets after edits.

Run from any directory: python3 scripts/build-hero.py
The HTML stays usable before the full page data downloads.
"""
import base64
import gzip
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def data(name):
    text = (ROOT / name).read_text()
    return json.loads(text[text.index('=') + 1:].strip().rstrip(';'))

def inline(text):
    return text.replace('</', '<\\/')

def packed_episode(ep):
    # Lossless signed deltas + unsigned varints. Each arm has 49 speed samples.
    packed = []
    for ch in ep['chunks']:
        buf = bytearray()
        for arm in ('L', 'R'):
            assert len(ch[arm]) == 49
            prev = 0
            for value in ch[arm]:
                delta = value - prev
                prev = value
                n = 2 * delta if delta >= 0 else -2 * delta - 1
                while n >= 128:
                    buf.append((n & 127) | 128)
                    n >>= 7
                buf.append(n)
        contrast = next((v for k, v in ch['v' + ch['trig']] if k == ch['H']), None) if ch['trig'] else None
        packed.append([ch['t'], ch['H'], ch['trig'], contrast, base64.b64encode(buf).decode()])
    return packed

def main():
    d = data('assets/data/pace-data.js')
    chunks = data('assets/data/pace-chunks.js')
    wall = d['showcase']['wall']
    keys = {t['key'] for t in wall['tiles']}
    payload = {'wall': wall, 'sim': {k: packed_episode(chunks['sim'][k]) for k in sorted(keys)}}
    real = '/* Real-robot curves; the wall uses its inline lossless payload. */\nwindow.PACE_CHUNKS = ' + json.dumps({'sim': {}, 'real': chunks['real']}, separators=(',', ':')) + ';\n'
    (ROOT / 'assets/data/pace-real-chunks.js').write_text(real)
    source = (ROOT / 'assets/js/hero.js').read_text()
    block = '<!-- BEGIN GENERATED HERO -->\n<script>\nwindow.PACE_HERO = ' + inline(json.dumps(payload, separators=(',', ':'))) + ';\n' + inline(source) + '</script>\n<!-- END GENERATED HERO -->'
    page = (ROOT / 'index.html').read_text()
    if '<!-- BEGIN GENERATED HERO -->' in page:
        page = re.sub(r'<!-- BEGIN GENERATED HERO -->.*?<!-- END GENERATED HERO -->', lambda _: block, page, flags=re.S)
    else:
        page = page.replace('\n<main>', '\n' + block + '\n\n<main>', 1)
    authors = ''.join('<span class="author">' + html.escape(a['name']) + '<sup>' + ','.join(map(str, a['aff'])) + (',✉' if a.get('corresponding') else '') + '</sup></span>' for a in d['meta']['authors'])
    affs = ''.join('<span class="aff"><sup>' + html.escape(k) + '</sup>' + html.escape(v) + '</span>' for k, v in d['meta']['affiliations'].items())
    for key, value in [('authors', authors), ('affs', affs)]:
        page = re.sub(r'(<div class="' + key + '" id="' + key + '">).*?(</div>)', lambda m: m[1] + value + m[2], page, count=1)
    media = '<!-- BEGIN GENERATED MEDIA -->\n<script>\n' + inline((ROOT / 'assets/js/media.js').read_text()) + '</script>\n<!-- END GENERATED MEDIA -->'
    if '<!-- BEGIN GENERATED MEDIA -->' in page:
        page = re.sub(r'<!-- BEGIN GENERATED MEDIA -->.*?<!-- END GENERATED MEDIA -->', lambda _: media, page, flags=re.S)
    else:
        page = page.replace('</footer>', '</footer>\n' + media, 1)
    for name in ['style.css', 'assets/data/pace-data.js', 'assets/data/pace-real-chunks.js', 'assets/js/pace-kit.js', 'app.js']:
        version = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()[:12]
        page = re.sub(r'((?:src|href)=")' + re.escape(name) + r'(?:\?v=[^"]*)?"', lambda m: m[1] + name + '?v=' + version + '"', page)
    (ROOT / 'index.html').write_text(page)
    print(f'Inline hero: {len(keys)} wall episodes; {len(gzip.compress(block.encode())):,} bytes gzip. HTML: {len(gzip.compress(page.encode())):,} bytes gzip.')

if __name__ == '__main__':
    main()
