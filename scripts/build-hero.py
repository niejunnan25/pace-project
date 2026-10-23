"""Rebuild inline first-screen data/effects and version external assets after edits.

Run from any directory: python3 scripts/build-hero.py
The HTML stays usable before the full page data downloads.
"""
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

def main():
    d = data('assets/data/pace-data.js')
    chunks = data('assets/data/pace-chunks.js')
    wall = d['showcase']['wall']
    # Side tiles cover common desktop aspect ratios without covering the title.
    seeds = [t for t in wall['tiles'] if t['row'] in (2, 4, 6) and t['col'] in (1, 2, 9, 10)]
    payload = {'wall': wall, 'sim': {t['key']: chunks['sim'][t['key']] for t in seeds}}
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
    for name in ['style.css', 'assets/data/pace-data.js', 'assets/data/pace-chunks.js', 'assets/js/pace-kit.js', 'app.js']:
        version = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()[:12]
        page = re.sub(r'((?:src|href)=")' + re.escape(name) + r'(?:\?v=[^"]*)?"', lambda m: m[1] + name + '?v=' + version + '"', page)
    (ROOT / 'index.html').write_text(page)
    print(f'Inline hero: {len(seeds)} seed tiles; {len(gzip.compress(block.encode())):,} bytes gzip. HTML: {len(gzip.compress(page.encode())):,} bytes gzip.')

if __name__ == '__main__':
    main()
