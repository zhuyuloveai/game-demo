from pathlib import Path
from shutil import copy2
import json,hashlib
R=Path(__file__).resolve().parents[1]
GAME=R.parents[2]
C=R/'components';C.mkdir(exist_ok=True)
INK='#65513e'; EDGE='#b5a082'; CREAM='#fff9e9'
manifest=[]
def svg(w,h,body):return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'
def rect(x,y,w,h,r,fill,stroke='none',sw=1.5,extra=''):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
def emit(family,state,w,h,body,slice=None,padding=None,safe=None,minsize=None):
 id=f'{family}-{state}' if state else family
 (C/(id+'.svg')).write_text(svg(w,h,body))
 manifest.append(dict(id=id,family=family,state=state or 'default',file='components/'+id+'.svg',canvas=[w,h],nineSlice=slice,contentPadding=padding,safeContentRect=safe,minimumDisplaySize=minsize or [w,h],anchor=[0,0],containsText=False))
# UI skins remain separate from every label, icon, number and progress value.
emit('panel','default',96,96,rect(2,5,92,89,23,'#bda989')+rect(2,2,92,90,23,CREAM,EDGE,1.5)+rect(6,6,84,82,19,'none','#fffdf4',2),[26]*4,[14,14,12,14],[14,14,68,70],[280,220])
emit('title','default',96,64,rect(1,1,94,62,18,'#f3ecd5','#dfd2b5',1),[20]*4,[12,16,12,16],[16,12,64,40],[160,52])
emit('well','default',80,80,rect(1,1,78,78,14,'#f5eedb','#e2d5b9',1.2),[16]*4,[12]*4,[12,12,56,56],[72,64])
emit('divider','default',64,4,'<path d="M1 2H63" stroke="#e4d7bc" stroke-width="1.2"/>',[0,2,0,2],[0]*4,[0,0,64,4],[32,4])
for family,base,edge in [('button-primary','#f2b996','#ae805f'),('button-secondary','#fffaf0','#b5a082')]:
 for state in ['default','pressed','disabled']:
  color=base if state=='default' else ('#e9aa82' if family.endswith('primary') else '#efe6ce') if state=='pressed' else '#e9e4d7'
  stroke=edge if state!='disabled' else '#d0c5b1';bottom='#cea585' if family.endswith('primary') else '#d9c9ab'
  top=4 if state=='pressed' else 1
  body=rect(1,4,94,43,14,bottom if state!='disabled' else '#d4cdbe')+rect(1,top,94,42,14,color,stroke,1.5)
  emit(family,state,96,48,body,[16]*4,[10,18,10,18],[18,10,60,28],[88,44])
for state in ['default','pressed','disabled']:
 fill={'default':'#f5e8d3','pressed':'#e9d8bb','disabled':'#ece7da'}[state]
 emit('close',state,48,48,rect(2,4,44,42,15,'#d7c6a9')+rect(2,2,44,42,15,fill,'#b9a183',1.4)+f'<path d="M18 17L30 29M30 17L18 29" stroke="{INK if state!="disabled" else "#ada491"}" stroke-width="2.5"/>',None,[0]*4,None,[44,44])
for state in ['default','selected','pressed','disabled']:
 fills={'default':'#f6efde','selected':'#dce8c9','pressed':'#c9dcb3','disabled':'#eee9dd'}
 strokes={'default':'#dfd1b7','selected':'#96ad7c','pressed':'#829966','disabled':'#ded5c5'}
 emit('tab',state,96,40,rect(1,1,94,38,13,fills[state],strokes[state],1.3),[15]*4,[8,14,8,14],[14,8,68,24],[80,44])
for family,w,h,r in [('item-slot',72,72,14),('recipe-card',112,104,17),('queue-slot',80,80,14)]:
 states=['default','selected','pressed','disabled','missing'] if family!='queue-slot' else ['empty','running','waiting','complete','locked']
 for state in states:
  fills={'default':'#fffdf5','selected':'#edf3df','pressed':'#deebc9','disabled':'#ece7db','missing':'#fff0e6','empty':'#faf6e9','running':'#fff0dc','waiting':'#fffdf5','complete':'#e7f0d9','locked':'#eae7dd'}
  strokes={'default':'#d9c9aa','selected':'#8da66e','pressed':'#77935c','disabled':'#d1c9b9','missing':'#cb9276','empty':'#cabb9f','running':'#c99a6d','waiting':'#d6c7ac','complete':'#95ad7e','locked':'#c7c0af'}
  body=rect(1,3,w-2,h-4,r,'#e0d2b5' if state not in ['disabled','locked'] else '#d9d3c7')+rect(1,1,w-2,h-4,r,fills[state],strokes[state],1.5,'stroke-dasharray="3 4"' if state=='empty' else '')
  if state in ['selected','complete']:body+=f'<path d="M{w-23} 13l4 4 7-8" stroke="#728a58" stroke-width="2"/>'
  emit(family,state,w,h,body,[r+2]*4,[10]*4,[10,10,w-20,h-20],[64,64] if family!='recipe-card' else [88,88])
for state in ['default','missing','complete','disabled']:
 fill={'default':'#f3e6c8','missing':'#f7d9c8','complete':'#dce8c9','disabled':'#e8e3d7'}[state]
 emit('quantity',state,64,28,rect(1,1,62,26,12,fill,'#c8b695',1),[13]*4,[4,8,4,8],[8,4,48,20],[36,24])
emit('progress','track',96,16,rect(1,1,94,14,7,'#e8ddc4','#c9b696',1),[7]*4,[2]*4,[2,2,92,12],[40,12])
emit('progress','fill',96,16,rect(1,2,94,12,6,'#b1c988'),[6]*4,[0]*4,None,[12,12])
for state in ['info','missing','full','empty']:
 fill={'info':'#edf2df','missing':'#fff0e5','full':'#fff0e5','empty':'#f3efdf'}[state]
 emit('notice',state,96,64,rect(1,1,94,62,13,fill,'#d1b89b' if state in ['missing','full'] else '#d3cfb6',1),[15]*4,[10,12,10,12],[12,10,72,44],[160,44])
icons={
 'lock':'<path d="M10 15v-5a6 6 0 0 1 12 0v5"/><rect x="7" y="14" width="18" height="14" rx="4" fill="#e1d5b9"/><path d="M16 20v3"/>',
 'complete':'<path d="M7 16l6 6L26 9" stroke-width="3"/>',
 'clock':'<circle cx="16" cy="16" r="11"/><path d="M16 9v7l5 3"/>',
 'plus':'<path d="M16 8v16M8 16h16"/>',
 'warning':'<path d="M16 5 29 27H3Z" fill="#f4cbb0"/><path d="M16 12v7m0 4v.2"/>',
 'arrow':'<path d="m12 8 8 8-8 8"/>',
}
for name,b in icons.items():emit('symbol',name,32,32,f'<g stroke="{INK}" stroke-width="1.8">{b}</g>',None,[0]*4,None,[16,16])
(R/'manifest.json').write_text(json.dumps({'version':'0.1-sample','baseCommit':'77a41898f0c9d0d647c93cd9bf266ef1c3b42794','scope':'P0 production-panel sample only; P1/P2 await direction confirmation','units':'CSS px at 1x; nineSlice top right bottom left','components':manifest},ensure_ascii=False,indent=2))
ids=['bread','corn_bread','cookie','raspberry_muffin','blackberry_muffin','wheat','corn','egg','brown_sugar','raspberry','blackberry']
reuse=[]
for id in ids:
 p=GAME/'assets/farm/items'/f'{id}.svg';q=R/'reused'/p.name;copy2(p,q);reuse.append(dict(id=id,file=str(q.relative_to(R)),original=str(p.relative_to(GAME)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),change='none'))
p=GAME/'assets/farm-runtime/buildings/bakery.png';copy2(p,R/'reused/bakery.png');reuse.append(dict(id='bakery',file='reused/bakery.png',original=str(p.relative_to(GAME)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),change='none'))
(R/'reuse-manifest.json').write_text(json.dumps(reuse,ensure_ascii=False,indent=2))
print('exported',len(manifest),'UI component states;',len(reuse),'unchanged reference assets')
