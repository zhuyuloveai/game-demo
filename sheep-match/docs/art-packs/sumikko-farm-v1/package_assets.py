from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parent
m = json.loads((root / 'manifest.json').read_text())
assert len(m['assets']) == 63
assert all((root / a['path']).is_file() for a in m['assets'])
files = [root / a['path'] for a in m['assets']]
files += list((root / 'generation').glob('*.json'))
files += [root / name for name in ['manifest.json', 'README.md', 'ASSET-GAPS.md', 'index.html', 'package_assets.py', 'preview.png', 'qa/report.json', 'qa/review-notes.md']]
files += [root / 'qa' / (name + '.jpg') for name in ['buildings', 'crops', 'fruit-plants', 'animals', 'decor']]
files += [root / 'scene' / name for name in [
    'README.md', 'assets.json', 'index.html', 'scene.js', 'style.css',
    'scene-preview.png', 'browser-preview.png', 'verification.md',
]]
with zipfile.ZipFile(root / 'assets.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in files:
        z.write(p, p.relative_to(root))
with zipfile.ZipFile(root / 'assets.zip') as z:
    assert z.testzip() is None
    pngs = [s for s in z.namelist() if s.startswith('assets/') and s.endswith('.png')]
    assert len(pngs) == 63
    print(json.dumps({'pngs': len(pngs), 'archiveFiles': len(z.namelist()), 'zipBytes': (root / 'assets.zip').stat().st_size}))
