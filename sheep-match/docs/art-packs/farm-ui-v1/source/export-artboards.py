from pathlib import Path
import json,base64,html,re
R=Path(__file__).resolve().parents[1]
meta={x['id']:x for x in json.loads((R/'manifest.json').read_text())['components']}
esc=lambda s:html.escape(str(s),quote=True)
def uri(p):return 'data:'+('image/png' if p.suffix=='.png' else 'image/svg+xml')+';base64,'+base64.b64encode(p.read_bytes()).decode()
def inner(p):return re.sub(r'</svg>\s*$','',re.sub(r'^.*?<svg\b[^>]*>','',p.read_text(),flags=re.S))
font=R.parents[2]/'fonts/ZCOOLKuaiLe-Regular.woff2'
fontdata=base64.b64encode(font.read_bytes()).decode()
for f in (R/'source').glob('*-layout.json'):
 d=json.loads(f.read_text());parts=[];definitions=[];used=set()
 for i,l in enumerate(d['layers']):
  typ=l['type'];name=l['name'];x=l['x'];y=l['y'];w=l.get('w',0);h=l.get('h',0);body=''
  if typ=='component':
   m=meta[l['id']];sw,sh=m['canvas'];cid='asset-'+m['id']
   if cid not in used:definitions.append(f'<g id="{cid}" fill="none" stroke-linecap="round" stroke-linejoin="round">{inner(R/m["file"])}</g>');used.add(cid)
   sl=m['nineSlice']
   if sl and min(sl)>0:
    top,right,bottom,left=sl;edge=l['edge'];scale=min(1,w/(2*edge),h/(2*edge)) if edge else 1;e=edge*scale
    sx=[0,left,sw-right,sw];sy=[0,top,sh-bottom,sh];dx=[x,x+e,x+w-e,x+w];dy=[y,y+e,y+h-e,y+h]
    for a in range(3):
     for b in range(3):body+=f'<svg x="{dx[b]}" y="{dy[a]}" width="{dx[b+1]-dx[b]}" height="{dy[a+1]-dy[a]}" viewBox="{sx[b]} {sy[a]} {sx[b+1]-sx[b]} {sy[a+1]-sy[a]}" preserveAspectRatio="none" overflow="hidden"><use href="#{cid}"/></svg>'
   else:body=f'<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="0 0 {sw} {sh}" preserveAspectRatio="none"><use href="#{cid}"/></svg>'
   name=m['id']
  elif typ=='image':
   p=(R/l['src'].split('?')[0]).resolve();body=f'<image href="{uri(p)}" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid {"slice" if l.get("fit")=="cover" else "meet"}"/>'
  elif typ=='rect':body=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{l["radius"]}" fill="{esc(l["fill"])}" stroke="#c7ae82" stroke-width="1"/>'
  elif typ=='line':body=f'<path d="M{x} {y}h{w}" stroke="{esc(l["color"])}" stroke-width="1" stroke-dasharray="2 2"/>'
  elif typ=='text':
   lines=l['text'].split('\n');lh=l['lineHeight'];yy=y+(h-lh*len(lines))/2+lh/2
   body=''.join(f'<text x="{x}" y="{yy+j*lh}" font-family="{esc(l["font"])}" font-size="{l["size"]}" font-weight="{l["weight"]}" fill="{esc(l["color"])}" dominant-baseline="central">{esc(t)}</text>' for j,t in enumerate(lines))
  parts.append(f'<g id="layer-{i:03d}" inkscape:groupmode="layer" inkscape:label="{esc(name)}"><title>{esc(name)}</title>{body}</g>')
 out=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="{d["width"]}" height="{d["height"]}" viewBox="0 0 {d["width"]} {d["height"]}"><title>生产面板 · 可编辑美术组合</title><desc>每个组件、文字、复用物品、截图参考单独分层。界面文字为可编辑 text，数值仅为样板。截图参考不是运行时 UI 背景。</desc><defs>{"".join(definitions)}</defs><style>@font-face{{font-family:FarmHappy;src:url(data:font/woff2;base64,{fontdata})}}</style>{"".join(parts)}</svg>'
 out=out.replace('http://www.inkscape.org/namespaces/inkscape','http://www.inkscape.org/namespaces/inkscape')
 target=f.with_name(f.name.replace('-layout.json','.svg'));target.write_text(out)
 print(target.name,'editable layers',len(parts))
