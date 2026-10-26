"""Audit original PNGs and build metadata/contact sheets; never modifies source images."""
from pathlib import Path
import argparse
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PACK = ROOT.parent
parser = argparse.ArgumentParser()
parser.add_argument('--allow-incomplete', action='store_true')
args = parser.parse_args()
jobs = json.loads((ROOT / 'jobs.json').read_text())['jobs']
base = {a['key']: a for a in json.loads((PACK / 'manifest.json').read_text())['assets']}
assets = []
missing = []

def inspect(path):
    with Image.open(path) as image:
        assert image.format == 'PNG' and image.mode == 'RGBA', path
        alpha = image.getchannel('A')
        lo, hi = alpha.getextrema()
        assert lo == 0 and hi >= 240, (path, lo, hi)
        bounds = alpha.point(lambda a: 255 if a >= 128 else 0).getbbox()
        assert bounds, path
        histogram = alpha.histogram()
        nonzero = sum(histogram[1:])
        return {'size': list(image.size), 'opaqueBounds': list(bounds),
                'anchor': [(bounds[0] + bounds[2]) / 2, bounds[3]],
                'alphaRange': [lo, hi], 'lowAlphaFraction': round(sum(histogram[1:128]) / max(1, nonzero), 5),
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': path.stat().st_size}

def aspect(meta):
    l,t,r,b = meta['opaqueBounds']
    return (r-l)/(b-t)

base_meta = {}
for plant in dict.fromkeys(j['plant'] for j in jobs):
    original = base[plant]
    meta = inspect(PACK / original['path'])
    base_meta[plant] = meta
    state = 'ripe' if original['group'] == 'crops' else 'fruit_ready'
    assets.append({'key': f'{plant}-{state}', 'plant': plant, 'label': original['label'],
                   'projectId': original['projectId'], 'group': original['group'], 'state': state,
                   'stateLabel': '成熟' if state == 'ripe' else '结果', 'path': '../' + original['path'],
                   'status': 'existing', 'heightScale': 1, 'displayScale': 1, **meta})

height_scales = {'sprout': .4, 'grown': .75, 'young': .5, 'growing': .97, 'wilt_help': .95, 'wilt_final': .9}
for job in jobs:
    path = ROOT / job['path']
    if not path.is_file():
        missing.append(job['key'])
        continue
    record_path = ROOT / 'generation' / (job['key'] + '.json')
    assert record_path.is_file(), f'Missing provenance: {job["key"]}'
    record = json.loads(record_path.read_text())
    assert record['key'] == job['key'] and record['path'] == job['path']
    meta = inspect(path)
    original = Path(record['original'])
    # The original source may be unavailable on another machine; PNG/hash checks still work there.
    source_matches = None if not original.is_file() else hashlib.sha256(original.read_bytes()).hexdigest() == meta['sha256']
    assert source_matches is not False, f'Modified generated source: {job["key"]}'
    height_scale = height_scales[job['state']]
    width_scale = height_scale * aspect(meta) / aspect(base_meta[job['plant']])
    assets.append({k: job[k] for k in ['key','plant','label','group','state','stateLabel','path']} |
                  {'projectId': base[job['plant']]['projectId'], 'status': 'generated',
                   'heightScale': height_scale, 'displayScale': round(width_scale, 5),
                   'provenance': f'generation/{job["key"]}.json', 'sourceMatches': source_matches, **meta})

generated = [a for a in assets if a['status'] == 'generated']
assert len({a['sha256'] for a in generated}) == len(generated), 'Duplicate generated files'
if not args.allow_incomplete:
    assert len(generated) == 42 and not missing, missing
    assert sum(a['group'] == 'crops' for a in generated) == 22
    assert sum(a['group'] == 'fruit-plants' for a in generated) == 20
families = []
for plant in dict.fromkeys(j['plant'] for j in jobs):
    group = base[plant]['group']
    order = ['sprout','grown','ripe'] if group == 'crops' else ['young','growing','fruit_ready','wilt_help','wilt_final']
    families.append({'plant': plant, 'label': base[plant]['label'], 'group': group,
                     'states': [f'{plant}-{s}' for s in order]})
manifest = {'schemaVersion': 1, 'title': '羊羊牧场 · 植物生长状态', 'mode': 'builtin-imagegen',
            'counts': {'expectedNew': 42, 'generated': len(generated), 'existingMature': 16,
                       'totalStates': len(assets), 'families': 16},
            'anchorConvention': 'Anchor and opaqueBounds are source pixels; all states share a bottom-center world anchor. displayScale is relative to mature visible width.',
            'families': families, 'assets': assets}
(ROOT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'qa').mkdir(exist_ok=True)
report = {'expected': 42, 'actual': len(generated), 'missing': missing, 'uniqueGeneratedFiles': len(generated),
          'allRGBA': True, 'allTransparentBackgrounds': True, 'allHaveSolidFills': True,
          'totalBytes': sum(a['bytes'] for a in generated),
          'alphaReviewCandidates': [a['key'] for a in generated if a['lowAlphaFraction'] > .06],
          'assets': generated}
(ROOT / 'qa/report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')

try: font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 15)
except OSError: font = ImageFont.load_default()
lookup = {a['key']: a for a in assets}

def sheet(families, filename):
    cols = max(len(f['states']) for f in families)
    cw, rh, left, top = 190, 185, 125, 38
    image = Image.new('RGB', (left + cols*cw + 14, top + len(families)*rh + 10), '#f7f4eb')
    draw = ImageDraw.Draw(image)
    draw.text((16,12),'Plant growth stages / same ground anchor',font=font,fill='#746650')
    for row,family in enumerate(families):
        y = top + row*rh
        draw.text((10,y+74),family['plant'],font=font,fill='#7c705a')
        for col,sid in enumerate(family['states']):
            x = left+col*cw
            draw.rounded_rectangle((x+4,y+3,x+cw-4,y+rh-25),radius=12,fill='#c6dea4')
            a = lookup.get(sid)
            if a:
                original = Image.open(ROOT / a['path']).convert('RGBA')
                crop = original.crop(a['opaqueBounds'])
                target_height = 132*a['heightScale']
                scale = min(target_height/crop.height, 164/crop.width)
                crop = crop.resize((max(1,round(crop.width*scale)),max(1,round(crop.height*scale))),Image.Resampling.LANCZOS)
                image.paste(crop,(round(x+cw/2-crop.width/2),round(y+149-crop.height)),crop)
                label=a['state']
            else: label='pending'
            draw.text((x+10,y+rh-20),label,font=font,fill='#8d816b')
    image.save(ROOT/'qa'/filename,quality=92)

crops = [f for f in families if f['group'] == 'crops']
sheet(crops[:6],'crops-1.jpg');sheet(crops[6:],'crops-2.jpg')
sheet([f for f in families if f['group'] == 'fruit-plants'],'fruit-plants.jpg')
print(json.dumps({'generated':len(generated),'existingMature':16,'missing':missing,'alphaReviewCandidates':report['alphaReviewCandidates']},ensure_ascii=False))
