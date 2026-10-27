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
woodgrain='<g stroke="#b89468" stroke-width="1" opacity=".55"><path d="M11 13q7-3 13-1M72 12l11 1M10 76l10 1M76 83q6-2 11-1M12 21v8M84 65v9"/><path d="M13 16h8M76 16h7M14 81h7"/></g>'
emit('panel','default',96,96,rect(2,5,92,89,18,'#bea17b')+rect(2,2,92,90,18,'#e6cea4','#a88c68',1.5)+rect(8,8,80,78,12,CREAM,'#c6ac84',1.2)+woodgrain+'<g fill="#a98c65"><circle cx="13" cy="13" r="1.4"/><circle cx="83" cy="13" r="1.4"/><circle cx="13" cy="81" r="1.4"/><circle cx="83" cy="81" r="1.4"/></g>',[26]*4,[14,14,12,14],[14,14,68,70],[280,220])
emit('title','default',96,64,rect(1,4,94,59,9,'#c5a378')+rect(1,1,94,59,9,'#eed6a8','#b49870',1.3)+'<path d="M7 13h10M79 13h10M7 49h11M78 49h11M8 17h6M82 45h6" stroke="#c4a16e" stroke-width="1.1"/><g fill="#ac8d60"><circle cx="9" cy="8" r="1.3"/><circle cx="87" cy="8" r="1.3"/></g>',[20]*4,[8,16,8,16],[16,8,64,48],[160,52])
emit('well','default',80,80,rect(1,1,78,78,10,'#f4edd9','#d8c6a6',1.2)+'<path d="M5 16V10q0-5 5-5h6M64 5h6q5 0 5 5v6M5 64v6q0 5 5 5h6M64 75h6q5 0 5-5v-6" stroke="#cbb78f" stroke-width="1" stroke-dasharray="2 3"/>',[16]*4,[12]*4,[12,12,56,56],[72,64])
emit('divider','default',64,4,'<path d="M1 2H63" stroke="#ccb48e" stroke-width="1.2" stroke-dasharray="3 4"/>',[0,2,0,2],[0]*4,[0,0,64,4],[32,4])
for family,base,edge in [('button-primary','#f2b996','#ae805f'),('button-secondary','#fffaf0','#b5a082')]:
 for state in ['default','pressed','disabled']:
  color=base if state=='default' else ('#e9aa82' if family.endswith('primary') else '#efe6ce') if state=='pressed' else '#e9e4d7'
  stroke=edge if state!='disabled' else '#d0c5b1';bottom='#cea585' if family.endswith('primary') else '#d9c9ab'
  top=4 if state=='pressed' else 1
  body=rect(1,4,94,43,11,bottom if state!='disabled' else '#d4cdbe')+rect(1,top,94,42,11,color,stroke,1.5)
  if state!='disabled':body+='<path d="M7 12h8M81 12h8M7 33h7M82 34h7" stroke="#b7865d" stroke-width="1" opacity=".6"/><path d="M8 16h5M83 29h5" stroke="#fff0d6" stroke-width="1.2"/>'
  emit(family,state,96,48,body,[16]*4,[10,18,10,18],[18,10,60,28],[88,44])
for state in ['default','pressed','disabled']:
 fill={'default':'#f5e8d3','pressed':'#e9d8bb','disabled':'#ece7da'}[state]
 emit('close',state,48,48,'<circle cx="24" cy="25" r="21" fill="#c3a079"/><circle cx="24" cy="23" r="21" fill="'+fill+'" stroke="#b08e67" stroke-width="1.4"/><circle cx="24" cy="23" r="16.5" stroke="#d0b38b" stroke-width="1"/>'+f'<path d="M18 17L30 29M30 17L18 29" stroke="{INK if state!="disabled" else "#ada491"}" stroke-width="2.5"/>',None,[0]*4,None,[44,44])
for state in ['default','selected','pressed','disabled']:
 fills={'default':'#f6efde','selected':'#dce8c9','pressed':'#c9dcb3','disabled':'#eee9dd'}
 strokes={'default':'#dfd1b7','selected':'#96ad7c','pressed':'#829966','disabled':'#ded5c5'}
 emit('tab',state,96,40,rect(1,3,94,36,7,'#d5c7a4')+rect(1,1,94,36,7,fills[state],strokes[state],1.3)+'<path d="M7 9h7M82 9h7" stroke="#bcb28c" stroke-width="1"/>',[15]*4,[8,14,8,14],[14,8,68,24],[80,44])
for family,w,h,r in [('item-slot',72,72,14),('recipe-card',112,104,17),('queue-slot',80,80,14)]:
 states=['default','selected','pressed','disabled','missing'] if family!='queue-slot' else ['empty','running','waiting','complete','locked']
 for state in states:
  fills={'default':'#fffdf5','selected':'#edf3df','pressed':'#deebc9','disabled':'#ece7db','missing':'#fff0e6','empty':'#faf6e9','running':'#fff0dc','waiting':'#fffdf5','complete':'#e7f0d9','locked':'#eae7dd'}
  strokes={'default':'#d9c9aa','selected':'#8da66e','pressed':'#77935c','disabled':'#d1c9b9','missing':'#cb9276','empty':'#cabb9f','running':'#c99a6d','waiting':'#d6c7ac','complete':'#95ad7e','locked':'#c7c0af'}
  if family=='queue-slot':
   timber='#d9bd91' if state!='locked' else '#cec4ae'
   body=rect(1,3,w-2,h-4,10,'#ba9971')+rect(1,1,w-2,h-4,10,timber,'#b29874',1.4)+rect(5,6,w-10,h-18,7,fills[state],strokes[state],1.2)
   body+=f'<path d="M7 {h-10}H{w-7}M11 {h-6}h7M{w-19} {h-6}h8" stroke="#b4956c" stroke-width="1"/><g fill="#ad8d66"><circle cx="6" cy="11" r="1"/><circle cx="{w-6}" cy="11" r="1"/><circle cx="6" cy="{h-9}" r="1"/><circle cx="{w-6}" cy="{h-9}" r="1"/></g>'
  elif family=='recipe-card':
   body=rect(2,4,w-4,h-6,8,'#d5c3a3')+rect(1,2,w-2,h-5,8,fills[state],strokes[state],1.4)
   body+=f'<path d="M7 17H{w-7}M7 {h-10}H{w-7}" stroke="#d9c9a7" stroke-width="1" stroke-dasharray="2 4"/>'
   body+='<path d="M9 1h8v12l-4-2-4 2Z" fill="#b4bd8a" stroke="#91a06f" stroke-width=".8"/>'
  else:
   body=rect(1,3,w-2,h-4,12,'#d5bea0')+rect(1,1,w-2,h-4,12,fills[state],strokes[state],1.5)+f'<path d="M9 {h-8}h7M{w-16} {h-8}h7" stroke="#d2b994" stroke-width="1"/>'
  if state in ['selected','complete']:body+=f'<path d="M{w-23} 13l4 4 7-8" stroke="#728a58" stroke-width="2"/>'
  emit(family,state,w,h,body,[r+2]*4,[10]*4,[10,10,w-20,h-20],[64,64] if family!='recipe-card' else [88,88])
for state in ['default','missing','complete','disabled']:
 fill={'default':'#f3e6c8','missing':'#f7d9c8','complete':'#dce8c9','disabled':'#e8e3d7'}[state]
 emit('quantity',state,64,28,rect(1,1,62,26,6,fill,'#c8b695',1)+'<circle cx="8" cy="14" r="1.6" fill="#b5a080"/>',[13]*4,[4,8,4,14],[14,4,42,20],[36,24])
emit('progress','track',96,16,rect(1,1,94,14,7,'#e8ddc4','#c9b696',1),[7]*4,[2]*4,[2,2,92,12],[40,12])
emit('progress','fill',96,16,rect(1,2,94,12,6,'#b1c988'),[6]*4,[0]*4,None,[12,12])
for state in ['info','missing','full','empty']:
 fill={'info':'#edf2df','missing':'#fff0e5','full':'#fff0e5','empty':'#f3efdf'}[state]
 emit('notice',state,96,64,rect(1,1,94,62,8,fill,'#d1b89b' if state in ['missing','full'] else '#bac69e',1)+'<path d="M5 15V10q0-5 5-5h6M80 5h6q5 0 5 5v5M5 49v5q0 5 5 5h6M80 59h6q5 0 5-5v-5" stroke="#b7b58b" stroke-width=".9" stroke-dasharray="2 3"/>',[15]*4,[10,12,10,12],[12,10,72,44],[160,44])
icons={
 'lock':'<path d="M10 15v-5a6 6 0 0 1 12 0v5"/><rect x="7" y="14" width="18" height="14" rx="4" fill="#e1d5b9"/><path d="M16 20v3"/>',
 'complete':'<path d="M7 16l6 6L26 9" stroke-width="3"/>',
 'clock':'<circle cx="16" cy="16" r="11"/><path d="M16 9v7l5 3"/>',
 'plus':'<path d="M16 8v16M8 16h16"/>',
 'warning':'<path d="M16 5 29 27H3Z" fill="#f4cbb0"/><path d="M16 12v7m0 4v.2"/>',
 'arrow':'<path d="m12 8 8 8-8 8"/>',
}
for name,b in icons.items():emit('symbol',name,32,32,f'<g stroke="{INK}" stroke-width="1.8">{b}</g>',None,[0]*4,None,[16,16])
canopy=''
for i in range(12):
 x=i*32;fill='#edc09d' if i%2==0 else '#fff3d6'
 canopy+=f'<path d="M{x+1} 2h32v15q-2 9-16 9t-16-9Z" fill="{fill}" stroke="#c6a078" stroke-width="1"/>'
canopy+='<path d="M2 3H382" stroke="#ad8b64" stroke-width="2"/>'
emit('canopy','default',384,28,canopy,None,[0]*4,None,[280,20])
p=C/'canopy-default.svg';p.write_text(p.read_text().replace('viewBox=','preserveAspectRatio="none" viewBox='))
# Small stitched linen corner: separate decoration, never a full-panel image.
emit('linen-corner','default',32,32,'<path d="M2 2H30L2 30Z" fill="#d3dfba" stroke="#a5b286" stroke-width="1"/><path d="M5 5h17L5 22Z" stroke="#8fa16d" stroke-width=".8" stroke-dasharray="2 3"/>',None,[0]*4,None,[20,20])
exec((R/'source/build-extensions.py').read_text())
for component in manifest:
 component['scaling']='nine-slice' if component['nineSlice'] else ('stretch-x' if component['family']=='canopy' else 'uniform')
(R/'manifest.json').write_text(json.dumps({'version':'0.3-expanded','baseCommit':'6f195a1','scope':'P0 reusable UI expansion; see terrain/manifest.json and effects/manifest.json for P1/P2','units':'CSS px at 1x; nineSlice top right bottom left','components':manifest},ensure_ascii=False,indent=2))
ids=['bread','corn_bread','cookie','raspberry_muffin','blackberry_muffin','wheat','corn','egg','brown_sugar','raspberry','blackberry','coin','carrot','soybean','apple','milk','cream','plank','nail','screw','axe']
reuse=[]
for id in ids:
 p=GAME/'assets/farm/items'/f'{id}.svg';q=R/'reused'/p.name;copy2(p,q);reuse.append(dict(id=id,file=str(q.relative_to(R)),original=str(p.relative_to(GAME)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),change='none'))
p=GAME/'assets/farm-runtime/buildings/bakery.png';copy2(p,R/'reused/bakery.png');reuse.append(dict(id='bakery',file='reused/bakery.png',original=str(p.relative_to(GAME)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),change='none'))
for id in ['barn','npc-stall','order-board','dairy','feed-mill','sugar-mill','popcorn-pot','pie-oven']:
 p=GAME/'assets/farm-runtime/buildings'/f'{id}.png';q=R/'reused'/p.name;copy2(p,q);reuse.append(dict(id=id,file=str(q.relative_to(R)),original=str(p.relative_to(GAME)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),change='none'))
(R/'reuse-manifest.json').write_text(json.dumps(reuse,ensure_ascii=False,indent=2))
print('exported',len(manifest),'UI component states;',len(reuse),'unchanged reference assets')
