"""Editable SVG additions. Raster exports are rendered from these vectors, not AI cutouts."""
from pathlib import Path
import json,math,random,hashlib,re
R=Path(__file__).resolve().parents[1]
E=R.parent/'sumikko-farm-v1/environment/svg'
for p in ['terrain/svg','terrain/png','effects/svg','effects/frames','effects/atlases']:(R/p).mkdir(parents=True,exist_ok=True)
def svg(w,h,body):return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'
def layer(name,body):return f'<g id="{name}" inkscape:groupmode="layer" inkscape:label="{name}">{body}</g>'
def ellipse(x,y,rx,ry,c,opacity=1):return f'<ellipse cx="{x:.2f}" cy="{y:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="{c}" opacity="{opacity:.3f}"/>'
def grass(x,y,s=1,flip=1):
 return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.3f})"><path d="M-9 0Q-16-9-13-12Q-5-10-3-4Q-4-15 1-17Q6-11 5-3Q10-12 15-10Q14-3 8 2Q0 5-9 0Z" fill="#bad396" stroke="#8fa976" stroke-width="1.25"/><path d="M-5-5q5 4 8 5M1-11v6" stroke="#dce5b4" stroke-width="1.5"/></g>'
def strip(points,seed=1,dense=True,soil=False):
 rng=random.Random(seed);ground='';blades='';stones=''
 bush=re.sub(r'</svg>\s*$','',re.sub(r'^.*?<svg\b[^>]*>','',(E/'natural-bush.svg').read_text(),flags=re.S))
 # An uninterrupted soft ribbon under irregular tufts, not a row of disconnected ovals.
 for a,b in zip(points,points[1:]):
  dx=b[0]-a[0];dy=b[1]-a[1];dist=math.hypot(dx,dy);nx=-dy/dist;ny=dx/dist
  upper=[];lower=[]
  for j in range(13):
   t=j/12;x=a[0]+dx*t;y=a[1]+dy*t;th=6+rng.random()*3
   upper.append((x+nx*th,y+ny*th));lower.append((x-nx*th,y-ny*th))
  ribbon=upper+lower[::-1]
  ground+='<path d="M'+' '.join(f'{x:.2f},{y:.2f}' for x,y in ribbon)+'Z" fill="'+('#dcc399' if soil else '#acc58b')+'"/>'
  ground+=ellipse(*a,10,5,'#dcc399' if soil else '#acc58b')+ellipse(*b,10,5,'#dcc399' if soil else '#acc58b')
  n=10 if dense else 6
  for j in range(n+1):
   t=max(0,min(1,(j+rng.uniform(-.18,.18))/n));x=a[0]+dx*t;y=a[1]+dy*t
   if soil:ground+=ellipse(x+1,y-1,6,2.7,'#e2cca5')
   if dense and j in [2,5,8]:
    s=rng.uniform(.27,.36);blades+=f'<g transform="translate({x-64*s:.2f} {y-80*s:.2f}) scale({s:.3f})">{bush}</g>'
   elif j%3!=1:blades+=grass(x+rng.uniform(-5,5),y+rng.uniform(-4,4),rng.uniform(.32,.6))
   if soil and j in [2,6,9]:stones+=ellipse(x+5,y+3,2.2,1.1,'#bba882')
 return layer('ground-transition',ground)+layer('grass-fringe',blades)+layer('tiny-ground-detail',stones)
terrain=[]
def emit(id,body,ports,kind,canvas=[256,160],anchor=[128,80],note=''):
 p=R/'terrain/svg'/f'{id}.svg';p.write_text(svg(*canvas,body))
 terrain.append(dict(id=id,svg=str(p.relative_to(R)),png=f'terrain/png/{id}.png',canvas=canvas,anchor=anchor,pngPixelsPerUnit=2,recommendedDisplayScale=1,projection='2:1; ground axes slopes ±0.5',ports=ports,kind=kind,containsLogicOrText=False,note=note))
for axis in ['ne','nw']:
 pts=[(48,120),(208,40)] if axis=='ne' else [(48,40),(208,120)]
 for variant in ['dense','sparse']:
  emit(f'grass-edge-{axis}-{variant}',strip(pts,seed=1 if variant=='dense' else 9,dense=variant=='dense'),pts,'edge',note='Join matching ports; alternate dense/sparse. World step (160, ±80).')
 emit(f'soil-grass-{axis}',strip(pts,seed=15,dense=False,soil=True),pts,'soil-edge',note='Use only beside dirt; same port geometry as grass edges.')
# All corners share the same origin and 80:40 axes. Interior/exterior vary foliage side, not footprint.
vec={'n':[(-80,40),(80,40)],'e':[(-80,-40),(-80,40)],'s':[(-80,-40),(80,-40)],'w':[(80,-40),(80,40)]}
for i,(direction,arms) in enumerate(vec.items()):
 for kind in ['outer','inner']:
  pts=[(128+arms[0][0],80+arms[0][1]),(128,80),(128+arms[1][0],80+arms[1][1])]
  body=strip(pts,seed=30+i,dense=kind=='outer')
  if kind=='outer':body+=layer('corner-tuft',grass(128,77,.9))
  emit(f'grass-corner-{kind}-{direction}',body,[pts[0],pts[-1]],kind+'-corner',note='N/E/S/W names locate the corner vertex; place by ports, never rotate the image in screen space.')
for axis in ['ne','nw']:
 for side in ['start','end']:
  full=[(48,120),(208,40)] if axis=='ne' else [(48,40),(208,120)]
  a=full[0] if side=='start' else full[1];p=(128,80)
  emit(f'grass-cap-{axis}-{side}',strip([a,p] if side=='start' else [p,a],seed=44,dense=False),[a],'cap',note='Free end tapers into one small tuft; attach the single port to an edge.')
# Reuse the existing cloud silhouettes; omit only its unwanted diamond base.
fog=(E/'unopened-fog.svg').read_text();fog=re.sub(r'<polygon\b[^>]*/>','',fog,count=1)
(R/'terrain/svg/fog-overlay-reused.svg').write_text(fog)
terrain.append(dict(id='fog-overlay-reused',svg='terrain/svg/fog-overlay-reused.svg',png='terrain/png/fog-overlay-reused.png',canvas=[128,64],anchor=[64,32],pngPixelsPerUnit=2,recommendedDisplayScale=1,ports=[],kind='derived-reuse',containsLogicOrText=False,original=str((E/'unopened-fog.svg').relative_to(R.parent.parent.parent)),originalSha256=hashlib.sha256((E/'unopened-fog.svg').read_bytes()).hexdigest(),note='Existing cloud group unchanged; only first diamond polygon omitted. Place above scenery; UI badges remain separate.'))
(R/'terrain/manifest.json').write_text(json.dumps(dict(version='1.0',coordinateSystem='Top-left canvas; anchors and ports in SVG units; PNG @2x',reusedMotif={'source':'../sumikko-farm-v1/environment/svg/natural-bush.svg','sha256':hashlib.sha256((E/'natural-bush.svg').read_bytes()).hexdigest(),'use':'unchanged vector motif scaled into dense fringes'},placement={'origin':[128,80],'edgeStepNE':[160,-80],'edgeStepNW':[160,80],'overlap':'approximately 10 units beyond ports; overlap opaque same-color ground, avoid stacking translucent fog','zOrder':['existing ground','new ground fringe','existing rocks/bush/tree','fog overlay','separate game UI']},assets=terrain),ensure_ascii=False,indent=2))
fx=[]
for kind in ['clear-dust','stone-chips','wood-chips','land-open']:
 frames=[]
 for frame in range(8):
  t=frame/7;fade=math.sin(math.pi*t)**.7;parts=''
  if kind=='clear-dust':
   for j in range(5):
    ang=math.pi*(j/4);x=64+math.cos(ang)*(9+23*t);y=74-math.sin(ang)*(3+17*t)-8*t
    parts+=ellipse(x,y,(5+7*t),3+4*t,['#dfc9a2','#e9d9b9','#d9c29c'][j%3],fade*.6)
  elif kind in ['stone-chips','wood-chips']:
   for j in range(6):
    angle=(j/6)*math.tau; x=64+math.cos(angle)*(8+29*t);y=76+math.sin(angle)*(4+12*t)-math.sin(math.pi*t)*18
    color='#b8b09c' if kind=='stone-chips' else '#c69d6c';stroke='#9e967e' if kind=='stone-chips' else '#ad865a'
    body='<path d="M-3 1-2-3 2-4 4 0 1 3Z"/>' if kind=='stone-chips' else '<path d="M-4-2 4-1 3 2-4 1Z"/>'
    parts+=f'<g transform="translate({x:.2f} {y:.2f}) rotate({j*53+t*65:.2f})" fill="{color}" stroke="{stroke}" stroke-width=".65" opacity="{fade:.3f}">{body}</g>'
   parts+=ellipse(64,76,12+12*t,4,'#dfc9a2',fade*.15)
  else:
   for j in range(5):
    x=64+(j-2)*17;y=68-abs(j-2)*5-13*t;size=(2.2+(j%2)*1.5)*fade
    parts+=f'<path d="M{x:.2f} {y-size*2:.2f}Q{x+size*.5:.2f} {y-size*.4:.2f} {x+size*1.5:.2f} {y:.2f}Q{x+size*.4:.2f} {y+size*.4:.2f} {x:.2f} {y+size*2:.2f}Q{x-size*.4:.2f} {y+size*.4:.2f} {x-size*1.5:.2f} {y:.2f}Q{x-size*.5:.2f} {y-size*.4:.2f} {x:.2f} {y-size*2:.2f}Z" fill="#fff1b9" stroke="#cdb377" stroke-width=".7" opacity="{fade:.3f}"/>'
  p=R/'effects/svg'/f'{kind}-{frame:02}.svg';p.write_text(svg(128,96,layer(kind+'-particles',parts)))
  frames.append({'index':frame,'svg':str(p.relative_to(R)),'png':f'effects/frames/{kind}-{frame:02}.png','atlasRect':[2+(frame%4)*132,2+(frame//4)*100,128,96]})
 fx.append(dict(id=kind,canvas=[128,96],anchor=[64,76],recommendedDisplaySize=[128,96],fps=16 if kind=='land-open' else 12,frameCount=8,durationMs=500 if kind=='land-open' else 667,loop=False,blend='source-over',atlas=f'effects/atlases/{kind}.png',atlasCanvas=[528,200],atlasPadding=2,frames=frames,reducedMotion='Skip effect; update the underlying object directly.',zOrder='Local ground plane under UI and neighboring objects. Do not put this in the center of the screen.'))
(R/'effects/manifest.json').write_text(json.dumps({'version':'1.0','frameOrder':'0 through 7, then hide; transparent first/last frames','effects':fx},ensure_ascii=False,indent=2))
print(len(terrain),'terrain pieces (includes 1 derived fog);',len(fx),'effects / 32 editable frames')
