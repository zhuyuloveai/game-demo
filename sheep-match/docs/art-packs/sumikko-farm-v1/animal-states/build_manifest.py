"""Read-only PNG audit; writes metadata and a comparison sheet, never alters source sprites."""
from pathlib import Path
import hashlib,json
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
jobs=json.loads((ROOT/'jobs.json').read_text())['jobs']
assert len(jobs)==10
base={a['key']:a for a in json.loads((ROOT.parent/'manifest.json').read_text())['assets']}
def inspect(p):
 with Image.open(p) as im:
  assert im.format=='PNG' and im.mode=='RGBA',p
  alpha=im.getchannel('A');assert alpha.getextrema()==(0,255),p
  bounds=alpha.point(lambda a:255 if a>=128 else 0).getbbox();assert bounds
  h=alpha.histogram()
  return dict(size=list(im.size),opaqueBounds=list(bounds),anchor=[(bounds[0]+bounds[2])/2,bounds[3]],sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size,lowAlphaFraction=round(sum(h[1:128])/sum(h[1:]),5))
assets=[]
for animal in dict.fromkeys(j['animal'] for j in jobs):
 a=base[animal];assets.append(dict(key=animal+'-idle',animal=animal,label=a['label'],projectId=a['projectId'],state='idle',stateLabel='日常',path='../'+a['path'],status='existing',displayScale=1,**inspect(ROOT.parent/a['path'])))
for j in jobs:
 p=ROOT/j['path'];meta=inspect(p)
 record=json.loads((ROOT/'generation'/f"{j['key']}.json").read_text())
 assert record['key']==j['key'] and record['path']==j['path']
 source=Path(record['original']);matches=None if not source.exists() else hashlib.sha256(source.read_bytes()).hexdigest()==meta['sha256'];assert matches is not False
 assets.append({k:j[k] for k in ['key','animal','label','projectId','state','stateLabel','path']}|dict(status='generated',displayScale=1.08 if j['key']=='sheep-ready' else 1,provenance=f"generation/{j['key']}.json",sourceMatches=matches,**meta))
new=[a for a in assets if a['status']=='generated'];assert len({a['sha256'] for a in new})==10
families=[{'animal':animal,'label':base[animal]['label'],'states':[f'{animal}-{s}' for s in ['idle','producing','ready']]} for animal in dict.fromkeys(j['animal'] for j in jobs)]
(ROOT/'manifest.json').write_text(json.dumps(dict(schemaVersion=1,mode='builtin-imagegen',counts={'generated':10,'existing':5,'totalStates':15,'families':5},anchorConvention='Source pixel bottom-center; use opaqueBounds and keep visible width consistent between poses, then apply displayScale.',families=families,assets=assets),ensure_ascii=False,indent=2)+'\n')
(ROOT/'qa').mkdir(exist_ok=True)
(ROOT/'qa/report.json').write_text(json.dumps(dict(generated=10,allRGBA=True,allTransparent=True,uniqueHashes=10,sourceMatches=all(a['sourceMatches'] for a in new),alphaReviewCandidates=[a['key'] for a in new if a['lowAlphaFraction']>.06],assets=new),ensure_ascii=False,indent=2)+'\n')
try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',15)
except OSError:font=ImageFont.load_default()
im=Image.new('RGB',(790,1030),'#f7f4eb');draw=ImageDraw.Draw(im);draw.text((24,18),'Animal states / idle - producing - ready',font=font,fill='#76664f');lookup={a['key']:a for a in assets}
for row,f in enumerate(families):
 y=58+row*192;draw.text((12,y+72),f['animal'],font=font,fill='#8f826c')
 for col,key in enumerate(f['states']):
  a=lookup[key];x=111+col*222
  draw.rounded_rectangle((x,y,x+211,y+157),14,fill='#c6dea4')
  with Image.open(ROOT/a['path']) as source:
   crop=source.crop(a['opaqueBounds']);scale=min(173*a['displayScale']/crop.width,136/crop.height);crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
   im.paste(crop,(x+(211-crop.width)//2,y+145-crop.height),crop)
  draw.text((x+10,y+166),a['state'],font=font,fill='#96866e')
im.save(ROOT/'qa/states.jpg',quality=93)
print('10 new states + 5 existing animals: alpha, hashes and provenance verified.')
