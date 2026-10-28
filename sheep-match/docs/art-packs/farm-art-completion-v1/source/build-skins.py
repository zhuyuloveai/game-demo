"""Floral skins: keep the approved v2 shelter geometry/pixels, add editable flower layers."""
from pathlib import Path
import json, shutil, math, hashlib
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parent/'sumikko-farm-v1/shelter-layers-v2'
NS='http://www.inkscape.org/namespaces/inkscape'
def path(d,fill='none',stroke='#A6B27D',w=3):return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def leaf(x,y,a=0,s=1):return f'<g transform="translate({x} {y}) rotate({a}) scale({s})">'+path('M0 0Q-24-4-23-20Q-5-23 0 0Z','#BCD296','#8EAE76',2.5)+'</g>'
def flower(x,y,s=1,color='#FFF7DF',angle=0):
 petals=''.join(f'<ellipse cx="0" cy="-10" rx="7" ry="11" transform="rotate({i*72})" fill="{color}" stroke="#C6A477" stroke-width="2"/>' for i in range(5))
 return f'<g transform="translate({x} {y}) rotate({angle}) scale({s})">{petals}<circle r="6.5" fill="#F1CF7C" stroke="#C6A477" stroke-width="2"/></g>'
def cluster(x,y,s=1,color='#FFF7DF'):
 return f'<g transform="translate({x} {y}) scale({s})">'+leaf(-4,2,-50)+leaf(9,6,110)+flower(0,0,1,color)+flower(22,12,.6,'#F6CBB7')+'</g>'
def svg(s):return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="{NS}" width="1200" height="1000" viewBox="0 0 1200 1000">{s}</svg>\n'
sets=[]
for sp in ['chicken','sheep']:
 out=ROOT/'skins'/sp;(out/'layers').mkdir(parents=True,exist_ok=True)
 old=BASE/sp;layout=json.loads((old/'layout.json').read_text())
 reused=[]
 for k in ['01-ground','02-building-shadow','03-rear-fence','04-building','07-front-fence']:
  target=out/'layers'/f'{k}.png';shutil.copy2(old/'layers'/f'{k}.png',target)
  reused.append(dict(file=f'layers/{k}.png',original=f'../../../sumikko-farm-v1/shelter-layers-v2/{sp}/layers/{k}.png',sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
 if sp=='chicken':
  roof=path('M473 312Q515 295 568 233Q629 294 677 371','#00000000','#9DB97C',5)+''.join(cluster(x,y,s,c) for x,y,s,c in [(482,309,.75,'#FFF7DF'),(522,277,.72,'#F7CDB8'),(568,237,.88,'#FFF7DF'),(610,292,.7,'#FFF7DF'),(650,338,.68,'#F7CDB8')])+path('M858 361Q869 397 849 433',w=4)+cluster(860,373,.7)+leaf(855,413,80,.85)
  rear=cluster(424,391,.85)+cluster(889,444,.8)
  front=cluster(184,594,.9)+cluster(381,693,.9)+cluster(597,798,1)+cluster(799,698,.9)+cluster(1007,597,.8)
 else:
  roof=path('M380 289Q405 214 466 206Q584 195 644 355',w=5)+''.join(cluster(x,y,s,c) for x,y,s,c in [(386,283,.78,'#F4CBB8'),(422,225,.7,'#FFF7DF'),(469,209,.7,'#E2DBEA'),(548,241,.72,'#FFF7DF'),(610,301,.75,'#F4CBB8'),(645,350,.8,'#FFF7DF')])+path('M390 330Q370 373 389 413',w=4)+leaf(383,384,0,.9)+flower(384,365,.75,'#F4CBB8')+path('M860 344Q842 384 863 420',w=4)+cluster(854,380,.8,'#E2DBEA')
  rear=cluster(426,391,.9,'#E2DBEA')+cluster(785,390,.8,'#F4CBB8')
  front=cluster(184,594,.9,'#E2DBEA')+cluster(381,693,.9,'#FFF7DF')+cluster(597,798,1,'#F4CBB8')+cluster(799,698,.9,'#FFF7DF')+cluster(1007,597,.8,'#E2DBEA')
 new=[]
 for key,name,art in [('03b-rear-flowers','后栏花束',rear),('04b-eave-flowers','屋檐花环',roof),('08-front-flowers','前栏花束',front)]:
  (out/'layers'/f'{key}.svg').write_text(svg(f'<g id="{key}" inkscape:groupmode="layer" inkscape:label="{name}">{art}</g>'))
  new.append(f'layers/{key}.png')
 layout['version']=1;layout['skinId']=sp+'-floral';layout['baseCommit']='de94fb3a5f71a4bda6cb92358aa0cd4571c1bdb6'
 layout['status']='art-only floral overlay pack; geometry identical to shelter-layers-v2'
 layout['reusedLayers']=reused;layout['newLayers']=new
 layout['layerOrder']=['01-ground','02-building-shadow','03-rear-fence','03b-rear-flowers','04-building','04b-eave-flowers','reference-animals','07-front-fence','08-front-flowers']
 layout['originalSkin']='sheep-match/assets/farm/buildings/'+('Chicken' if sp=='chicken' else 'Sheep')+'_Shelter_Floral.svg'
 layout['occlusion'].pop('maskIn',None)
 for a in layout['animals']:a['source']=f'../../../sumikko-farm-v1/shelter-layers-v2/{sp}/sources/'+a['source']
 layout['notes']=['All base shelter layers are byte-identical copies of v2.','Do not overlay on a flattened legacy Floral SVG or add a second yard/fence.','Ground, building, fences, animal contact points and standing regions are unchanged.','Flowers have no separate shadow; front clusters occlude only at the existing rail edge.','Animals in the full preview are references only; reuse existing independent animal states.']
 # Remove obsolete source-relative fields; refer to unchanged upstream contract instead.
 for k in ['buildingTransform','sourceMapping']:layout.pop(k,None)
 layout['geometrySource']=f'../../../sumikko-farm-v1/shelter-layers-v2/{sp}/layout.json'
 (out/'layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n')
 sets.append(dict(id=sp+'-floral',path=f'skins/{sp}',newLayers=3,reusedLayers=5,canvas=[1200,1000],anchor=[600,590],footprint=[4,4],referenceAnimalCount=len(layout['referenceAnimalPlacements'])))
(ROOT/'skins-manifest.json').write_text(json.dumps(dict(version=1,sets=sets),ensure_ascii=False,indent=2)+'\n')
print('2 floral skins: 6 vector flower overlays; 10 approved shelter PNG layers reused unchanged.')
