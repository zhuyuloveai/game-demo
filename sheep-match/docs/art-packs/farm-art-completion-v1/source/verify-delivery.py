"""Delivery contract checks: inventory coverage, alpha, references, geometry, editable layers."""
from pathlib import Path
import json,hashlib,xml.etree.ElementTree as ET,zipfile
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[3]
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
errors=[];checks=0

def check(ok,msg):
 global checks
 checks+=1
 if not ok:errors.append(msg)
def png(file,size,edge=False):
 im=Image.open(file);check(im.size==tuple(size),str(file)+' size');check(im.mode=='RGBA',str(file)+' RGBA')
 a=im.getchannel('A');b=a.getbbox();check(b is not None,str(file)+' empty');lo,hi=a.getextrema();check(lo==0 and hi>0,str(file)+' alpha background');check(hi>=250 or 'shadow' in file.stem,str(file)+' solid fill (shadow exempt)')
 if edge and b:check(b[0]>0 and b[1]>0 and b[2]<size[0] and b[3]<size[1],str(file)+' touches edge')
 return im
m=read(ROOT/'icons-manifest.json');check(m['total']==93,'icon total');check(m['counts']==dict(achievements=30,branch=4,currency=6,materials=15,processed=38),'icon counts')
main=read(REPO/'sheep-match/assets/farm/manifest.json');old=read(ROOT.parent/'farm-priority-icons-v1/manifest.json')
need={x['path'] for x in main['assets'] if x.get('category') in ['economic-item','material','currency-reward','achievement','branch-badge']}
covered={x['originalPath'].replace('sheep-match/assets/farm/','') for x in old['icons'] if x['originalPath']}|{x['originalPath'].replace('sheep-match/assets/farm/','') for x in m['icons']}
check(not need-covered,'uncovered inventory: '+str(need-covered))
ids=set();hashes=set()
for i in m['icons']:
 check(i['id'] not in ids,'duplicate id '+i['id']);ids.add(i['id']);f=ROOT/i['svg'];check(sha(f)==i['sha256'],i['id']+' SVG digest');check((REPO/i['originalPath']).exists(),i['id']+' original mapping')
 xml=ET.parse(f).getroot();check(xml.get('viewBox')=='0 0 128 128',i['id']+' viewport');check(not xml.findall('.//{http://www.w3.org/2000/svg}text'),i['id']+' baked text')
 im=png(ROOT/i['png'],[256,256],True);h=hashlib.sha256(im.tobytes()).hexdigest();check(h not in hashes,i['id']+' duplicate pixels');hashes.add(h)
for sp in ['chicken','sheep']:
 d=ROOT/'skins'/sp;l=read(d/'layout.json');ref=ROOT.parent/'sumikko-farm-v1/shelter-layers-v2'/sp;original=read(ref/'layout.json')
 for k in ['canvas','footprint','standingRegion','standingExclusions','entry','referenceAnimalPlacements']:check(l[k]==original[k],sp+' changed geometry '+k)
 check(l['footprint']['logicalTiles']==[4,4],sp+' footprint')
 for r in l['reusedLayers']:check(sha(d/r['file'])==sha(d/r['original']),sp+' changed reused pixels')
 check((d/l['geometrySource']).exists(),sp+' geometry ref')
 for a in l['animals']:check((d/a['source']).exists(),sp+' animal source '+a['state'])
 for k in l['layerOrder']:
  if k!='reference-animals':png(d/'layers'/f'{k}.png',[1200,1000])
 png(d/'previews/empty.png',[1200,1000],True);png(d/'previews/full.png',[1200,1000],True)
 with zipfile.ZipFile(d/'editable.ora') as z:
  check(z.read('mimetype')==b'image/openraster',sp+' ora mime');check(len(ET.fromstring(z.read('stack.xml')).findall('.//layer'))==8,sp+' ora layers')
for k in read(ROOT/'machines-manifest.json')['sets']:
 d=ROOT/k['path'];a=read(d/'manifest.json');check(len(a['samples'])==12,k['id']+' sample count');check(a['loopSeamMaxChannelDelta']<=1,k['id']+' loop seam');check(a['animation']['loop'],k['id']+' loop');check(a['sourceToCanvas']=={'scale':.5,'offset':[72,75]},k['id']+' registration')
 check(sha(d/'sources/original.png')==sha(REPO/a['sourcePath']),k['id']+' original retained')
 for layer in a['layers']:
  png(d/layer['png'],a['canvas']);check(layer['offset']==[0,0],k['id']+' layer offset')
 for frame in a['samples']:png(d/frame['file'],a['canvas'],True)
 with zipfile.ZipFile(d/'editable.ora') as z:check(len(ET.fromstring(z.read('stack.xml')).findall('.//layer'))==len(a['layers']),k['id']+' ora layers')
# Every external local SVG image reference must resolve from that SVG, not a workstation path.
for f in ROOT.rglob('*.svg'):
 xml=ET.parse(f).getroot()
 for im in xml.findall('.//{http://www.w3.org/2000/svg}image'):
  href=im.get('href',im.get('{http://www.w3.org/1999/xlink}href',''))
  check(bool(href),'empty href '+str(f))
  if not href.startswith('data:'):check(not href.startswith('/') and (f.parent/href).exists(),'unresolved SVG reference '+str(f)+' '+href)
report=dict(status='pass' if not errors else 'fail',checks=checks,icons=93,coverage={'processed':38,'materials':15,'currency':6,'achievements':30,'branch':4,'floralSkinSets':2,'machineSets':5},machineLayerPngs=sum(x['layerCount'] for x in read(ROOT/'machines-manifest.json')['sets']),skinLayerPngs=16,machineDiagnosticSamples=60,errors=errors,scope='Art contracts only; no game integration or deployed gameplay verification.')
(ROOT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(bool(errors))
