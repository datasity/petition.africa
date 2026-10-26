"""Wrap page fragments in src/ into full HTML pages.
Each src file starts with a line: <!--{"title":"...","page":"home","map":true}-->
Output: /home/claude/pa/<name>.html (standalone) and an artifact copy of index without skeleton."""
import json, re, pathlib, sys
ROOT = pathlib.Path('/home/claude/pa')
SRC = ROOT / 'src'
ART = pathlib.Path('/home/claude/pa_artifact')
ART.mkdir(exist_ok=True)
for f in sorted(SRC.glob('*.html')):
    raw = f.read_text()
    m = re.match(r'<!--(\{.*?\})-->\n', raw)
    meta = json.loads(m.group(1)); body = raw[m.end():]
    scripts = ['assets/geo/index.js', 'assets/leaders.js', 'assets/writer.js', 'assets/app.js']
    if meta.get('map'): scripts += ['assets/geo/africa.js', 'assets/map.js']
    for extra in meta.get('js', []): scripts.append('assets/' + extra)
    head = (f'<title>{meta["title"]}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
            f'<meta name="description" content="Petition.africa: start and sign petitions for change across Africa.">\n'
            f'<link rel="stylesheet" href="assets/styles.css">\n')
    tags = ''.join(f'<script src="{s}"></script>\n' for s in scripts)
    bodyattr = f'data-page="{meta["page"]}"' + (f' class="{meta["bodyclass"]}"' if meta.get('bodyclass') else '')
    inner = f'<div id="siteHeader"></div>\n' if not meta.get('noChrome') else ''
    inner += body + ('\n<div id="siteFooter"></div>\n' if not meta.get('noChrome') else '')
    full = (f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n{head}</head>\n'
            f'<body {bodyattr}>\n{inner}{tags}<script>document.body.dataset.ready="1"</script>\n</body>\n</html>\n')
    # page script lives inside body as <script data-page-script> ... must run after libs: move it
    ps = re.findall(r'<script data-page-script>.*?</script>', full, re.S)
    for s in ps: full = full.replace(s, '')
    full = full.replace('<script>document.body.dataset.ready="1"</script>', ''.join(ps))
    (ROOT / f.name).write_text(full)
    if f.name == 'index.html':
        # artifact skeleton supplies doctype/html/head/body; body attrs set via script
        a = head + f'<script>document.body.dataset.page="{meta["page"]}"</script>\n' + inner + tags + ''.join(ps)
        (ART / 'index.html').write_text(a)
    print('built', f.name)
