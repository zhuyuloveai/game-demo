"""Verify both priority-art deliveries. Requires Pillow; never edits runtime."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import hashlib, json, zipfile, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[4]
ICONS=REPO/'sheep-match/docs/art-packs/farm-priority-icons-v1'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_text())
def opaque_bounds(im):return im.getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()
def image_check(p,size):
 im=Image.open(p);assert im.mode=='RGBA' and im.size==tuple(size),(p,im.mode,im.size)
 a=im.getchannel('A');assert a.getextrema()==(0,255),(p,a.getextrema())
 b=opaque_bounds(im);assert b and b[0]>0 and b[1]>0 and b[2]<im.width and b[3]<im.height,(p,b)
 return im
def difference(a,b):
 bg=Image.new('RGBA',a.size,'#eef0d9')
 aa=Image.alpha_composite(bg,a).convert('RGB');bb=Image.alpha_composite(bg,b).convert('RGB')
 return sum(ImageStat.Stat(ImageChops.difference(aa,bb)).mean)/3

report={'baseCommit':'0a8363f','animals':[],'icons':{},'limitations':['Art-only delivery; runtime integration and live movement speed calibration have not been performed.','Raster action frames preserve hand-drawn variations; geometric checks do not prove perceptual zero flicker.']}
for source in load(ROOT/'production-plan.json'):
 assert sha(ROOT/source['source'])==source['sourceSha256']
 assert (ROOT/source['promptFile']).read_text().strip()
for sp in ['cow','pig','sheep','lamb']:
 folder=ROOT/sp;m=load(folder/'manifest.json')
 assert m['canvas']==[360,280] and m['anchor']==[180,230]
 for state in ['hungry','producing','ready']:
  original=ROOT.parent/f'shelter-layers-v2/{sp}/animals/{sp}-{state}.png'
  assert sha(original)==sha(folder/f'sources/reference-{state}.png')
 assert sha(ROOT.parent/f'shelter-layers-v2/{sp}/layout.json')==sha(folder/'sources/reference-layout.json')
 shadow=Image.open(folder/m['groundShadow']);assert shadow.mode=='RGBA' and shadow.size==(360,280)
 assert shadow.getchannel('A').getextrema()[0]==0 and 0<shadow.getchannel('A').getextrema()[1]<128
 for action,a in m['actions'].items():
  assert a['fps']==12 and a['frameCount']==12 and len(a['frames'])==12
  assert a['endFrameRepeated'] is False and len(set(f['sha256'] for f in a['frames']))==12
  assert len(set(f['sourceScale'] for f in a['frames']))==1
  frames=[];atlas=Image.open(folder/a['atlas']).convert('RGBA');max_error=0
  assert atlas.size==tuple(a['atlasCanvas'])
  with zipfile.ZipFile(folder/a['editableSource']) as z:
   assert z.read('mimetype')==b'image/openraster'
   xml=ET.fromstring(z.read('stack.xml'));assert len(xml.findall('./stack/stack'))==12
   for i,f in enumerate(a['frames']):
    im=image_check(folder/f['file'],[360,280]);frames.append(im)
    assert f['index']==i and f['anchor']==[180,230] and sha(folder/f['file'])==f['sha256']
    x,y,w,h=f['atlasRect'];assert atlas.crop((x,y,x+w,y+h)).tobytes()==im.tobytes()
    assert z.read(f'data/frame-{i:02}.png')==(folder/f['file']).read_bytes()
    assert len(f['visibleHoofTips'])>=2
    for px,py in f['visibleHoofTips']:
     assert im.getpixel((round(px),round(py)))[3]>=64,(sp,action,i,px,py)
    if action=='eat':
     error=max(abs(v-t) for v,t in zip(f['supportAnchor'],f['supportTarget']))
     max_error=max(max_error,error);assert error<=1.0,(sp,action,i,error)
  webp=Image.open(folder/f'previews/{action}.webp');assert webp.n_frames==12
  diffs=[difference(frames[i],frames[(i+1)%12]) for i in range(12)]
  report['animals'].append({'species':sp,'action':action,'frames':12,'uniqueFrames':12,'canvas':[360,280],'atlasAndOraMatch':True,'supportErrorMaxPx':round(max_error,3) if action=='eat' else None,'adjacentImageDifference': [round(v,3) for v in diffs],'loopSeamDifference':round(diffs[-1],3),'maxAdjacentDifference':round(max(diffs),3)})

m=load(ICONS/'manifest.json');assert len(m['icons'])==67
for item in m['icons']:
 svg=ICONS/item['svg'];xml=ET.parse(svg).getroot();assert xml.attrib['viewBox']=='0 0 128 128'
 assert not xml.findall('.//{http://www.w3.org/2000/svg}text')
 assert sha(svg)==item['sha256']
 png=image_check(ICONS/item['png'],[256,256]);bounds=opaque_bounds(png)
 assert bounds[0]>=8 and bounds[1]>=8 and bounds[2]<=248 and bounds[3]<=248,(item['id'],bounds)
 if item['originalPath']:assert (REPO/item['originalPath']).is_file(),item['originalPath']
for filename in m['aliases'].values():assert (ICONS/filename).is_file()
report['icons']={'count':67,'categories':m['counts'],'svgXmlAndHashes':'PASS','pngCanvasAndTransparency':'PASS','originalMappings':'PASS','aliases':'PASS'}
report['status']='PASS'
(ROOT/'qa-report.json').write_text(json.dumps(report,indent=2)+'\n')
(ICONS/'qa-report.json').write_text(json.dumps({'status':'PASS',**report['icons']},indent=2)+'\n')
print('PASS: 96 frames, 8 atlases, 8 editable ORA files, 12 original state references, 67 SVG/PNG pairs.')
