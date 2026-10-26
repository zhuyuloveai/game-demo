"""Verify source containers and bundle the delivered art pack without recursive ZIPs."""
from pathlib import Path
import json,zipfile,xml.etree.ElementTree as ET
from PIL import Image
R=Path(__file__).resolve().parent.parent
C=R/'chicken'
m=json.loads((C/'manifest.json').read_text())
for a in m['actions']:
    with zipfile.ZipFile(C/f'sources/chicken-{a["id"]}.ora') as z:
        assert z.read('mimetype')==b'image/openraster'
        root=ET.fromstring(z.read('stack.xml'))
        groups=root.find('stack').findall('stack')
        assert len(groups)==12
        assert sum(g.get('visibility')=='visible' for g in groups)==1
        for layer in root.iter('layer'):
            assert layer.get('src') in z.namelist()
        assert z.read('mergedimage.png')==(C/a['frames'][0]['file']).read_bytes()
    with Image.open(C/f'previews/{a["id"]}.webp') as im:
        assert im.n_frames==12
with zipfile.ZipFile(R/'chicken-sample.zip','w',compression=zipfile.ZIP_DEFLATED) as z:
    for p in sorted(R.rglob('*')):
        if p.is_file() and p.suffix!='.zip' and p.name!='.DS_Store':
            z.write(p,Path('chicken-animation-sample')/p.relative_to(R))
print('Source containers and animated WebP passed; bundled chicken-sample.zip.')
