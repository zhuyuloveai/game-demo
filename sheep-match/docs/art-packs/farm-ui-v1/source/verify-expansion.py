from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET,subprocess
from PIL import Image,ImageChops
R=Path(__file__).resolve().parents[1]
terrain=json.loads((R/'terrain/manifest.json').read_text());fx=json.loads((R/'effects/manifest.json').read_text())
checks=[]
for a in terrain['assets']:
 root=ET.parse(R/a['svg']).getroot();assert not list(root.iter('{http://www.w3.org/2000/svg}text')),a['id']
 im=Image.open(R/a['png']).convert('RGBA');assert list(im.size)==[v*2 for v in a['canvas']],a['id']
 alpha=im.getchannel('A');assert alpha.getextrema()[0]==0 and alpha.getbbox(),a['id']
 # No rectangular backing: outer canvas edges must be fully transparent.
 assert all(alpha.getpixel(p)==0 for p in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]),a['id']
 for x,y in a['ports']:
  dx=x-a['anchor'][0];dy=y-a['anchor'][1];assert dx and abs(abs(dy/dx)-.5)<1e-8,(a['id'],x,y)
 checks.append({'id':a['id'],'canvas':list(im.size),'transparent':True,'groundAxes':True})
for e in fx['effects']:
 atlas=Image.open(R/e['atlas']).convert('RGBA');assert list(atlas.size)==e['atlasCanvas']
 for f in e['frames']:
  im=Image.open(R/f['png']).convert('RGBA');assert list(im.size)==e['canvas'];x,y,w,h=f['atlasRect'];crop=atlas.crop((x,y,x+w,y+h));assert ImageChops.difference(im,crop).getbbox() is None,(e['id'],f['index'])
  alpha=im.getchannel('A')
  if f['index'] in [0,7]:assert alpha.getbbox() is None,(e['id'],'ends must be transparent')
  else:
   box=alpha.getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<im.width and box[3]<im.height,(e['id'],box)
 assert not e['loop'] and e['anchor']==[64,76]
changes=subprocess.check_output(['git','diff','--name-only','origin/main'],cwd=R,text=True).splitlines()
assert all(x.startswith('sheep-match/docs/art-packs/farm-ui-v1/') for x in changes),changes
report={'status':'passed','terrain':checks,'newTerrain':18,'derivedFog':1,'effects':len(fx['effects']),'transparentFrames':sum(e['frameCount'] for e in fx['effects']),'atlasFramesMatchIndependentPng':True,'effectEndpointsTransparent':True,'editableSvgSources':True,'gameChangesAgainstMain':False}
(R/'expansion-qa-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='terrain'},ensure_ascii=False))
