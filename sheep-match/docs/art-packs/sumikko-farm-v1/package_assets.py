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
states = json.loads((root / 'plant-states/manifest.json').read_text())
assert states['counts']['generated'] == 42 and states['counts']['totalStates'] == 58
terrain = json.loads((root / 'terrain/manifest.json').read_text())
assert len(terrain['assets']) == 35
for folder in ['plant-states', 'terrain']:
    files += sorted(p for p in (root / folder).rglob('*')
                    if p.is_file() and p.suffix in {'.png', '.jpg', '.svg', '.json', '.py', '.mjs', '.css', '.html', '.md'}
                    and not {'__pycache__', 'drafts'}.intersection(p.relative_to(root).parts))
assert len(files) == len(set(files)), 'Duplicate archive members'
with zipfile.ZipFile(root / 'assets.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in files:
        z.write(p, p.relative_to(root))
with zipfile.ZipFile(root / 'assets.zip') as z:
    assert z.testzip() is None
    pngs = [s for s in z.namelist() if s.startswith('assets/') and s.endswith('.png')]
    assert len(pngs) == 63
    state_pngs = [s for s in z.namelist() if s.startswith('plant-states/assets/') and s.endswith('.png')]
    terrain_svgs = [s for s in z.namelist() if s.startswith('terrain/svg/') and s.endswith('.svg')]
    assert len(state_pngs) == 42 and len(terrain_svgs) == 35
    print(json.dumps({'basePNGs': len(pngs), 'plantStatePNGs': len(state_pngs), 'terrainSVGs': len(terrain_svgs), 'archiveFiles': len(z.namelist()), 'zipBytes': (root / 'assets.zip').stat().st_size}))
