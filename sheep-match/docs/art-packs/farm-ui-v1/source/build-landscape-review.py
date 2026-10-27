from pathlib import Path
import json,base64,html
R=Path(__file__).resolve().parents[1];E=R.parent/'sumikko-farm-v1/environment/svg'
def uri(p):return 'data:'+('image/png' if p.suffix=='.png' else 'image/svg+xml')+';base64,'+base64.b64encode(p.read_bytes()).decode()
def image(p,x,y,w,h,label):return f'<g inkscape:groupmode="layer" inkscape:label="{label}"><title>{label}</title><image href="{uri(p)}" x="{x}" y="{y}" width="{w}" height="{h}"/></g>'
def wrap(body,w=800,h=460):return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
base='<g inkscape:groupmode="layer" inkscape:label="preview-only-ground"><rect width="800" height="460" rx="22" fill="#b5ca90"/></g>'
base+='<path d="m0 355 185-92 296 148" stroke="#efe0b6" stroke-width="25" fill="none" stroke-linejoin="round"/>'
for i,(x,y) in enumerate([(80,390),(200,398),(450,400),(611,372),(33,265)]):base+=image(E/'accent-0.svg',x-64,y-32,128,64,f'existing-ground-accent-{i}')
# Repeated edge joins form an unoutlined, open boundary. Their port coordinates match exactly.
placements=[('grass-edge-ne-sparse',240,260),('grass-corner-outer-n',400,180),('grass-edge-nw-dense',560,260),('grass-cap-ne-end',80,340),('grass-cap-nw-start',720,340)]
for id,x,y in placements:base+=image(R/f'terrain/svg/{id}.svg',x-128,y-80,256,160,id)
base+=image(R/'reused/bakery.png',56,205,142,126,'existing-bakery')+image(R/'reused/barn.png',223,302,116,120,'existing-barn')
for i,(id,x,y,w,h,ax,ay) in enumerate([('natural-tree',490,193,160,200,80,180),('natural-tree',660,187,160,200,80,180),('natural-bush',365,163,128,100,64,82),('rocks-1',565,218,128,100,64,82),('natural-bush',709,252,128,100,64,82),('rocks-0',298,218,128,100,64,82)]):base+=image(E/(id+'.svg'),x-ax,y-ay,w,h,f'existing-{id}-{i}')
fog=''
for i,(x,y) in enumerate([(375,72),(560,82),(703,137)]):fog+=image(R/'terrain/svg/fog-overlay-reused.svg',x-64,y-32,128,64,f'existing-fog-silhouette-{i}')
(R/'source/terrain-composition.svg').write_text(wrap(base))
(R/'source/terrain-composition-fog.svg').write_text(wrap(base+fog))
guides=''
for id,x,y in placements:
 guides+=f'<path d="M{x-5} {y}h10M{x} {y-5}v10" stroke="#bc764f" stroke-width="1.4"/><text x="{x+7}" y="{y-7}" fill="#70583d" font-size="10">{id}</text>'
(R/'source/terrain-composition-anchors.svg').write_text(wrap(base+f'<g inkscape:groupmode="layer" inkscape:label="reference-only-anchors">{guides}</g>'))
seam='<rect width="800" height="500" fill="#b5ca90"/>'
for j,axis in enumerate(['nw','ne']):
 for i in range(4):
  x=140+i*160;y=80+i*80 if axis=='nw' else 430-i*80
  id=f'grass-edge-{axis}-'+('dense' if i%2==0 else 'sparse')
  seam+=image(R/f'terrain/svg/{id}.svg',x-128,y-80,256,160,f'{axis}-repeat-{i}')
(R/'source/terrain-seam-study.svg').write_text(wrap(seam,800,500))
terrain=json.loads((R/'terrain/manifest.json').read_text());fx=json.loads((R/'effects/manifest.json').read_text())
cards=''.join(f'<article><div class="asset"><img src="{a["png"]}" alt="{a["id"]}"></div><strong>{a["id"]}</strong><small>{a["canvas"][0]} × {a["canvas"][1]} · 锚点 {a["anchor"]}</small><a href="{a["svg"]}">SVG</a> · <a href="{a["png"]}">PNG @2x</a></article>' for a in terrain['assets'])
effects=''.join(f'<article class="effect-card"><div class="effect-stage"><i class="fx" data-effect="{e["id"]}"></i><span class="landing"></span></div><h3>{dict(zip(["clear-dust","stone-chips","wood-chips","land-open"],["清障扬尘","石头碎屑","木屑","土地开放"]))[e["id"]]}</h3><p>{e["frameCount"]} 帧 · {e["fps"]} fps · {e["durationMs"]} ms · 播完隐藏</p><button data-play="{e["id"]}">播放一次</button><a href="{e["atlas"]}">透明图集</a><details><summary>逐帧查看</summary><img style="width:100%;background:#e9e4d4" src="{e["atlas"]}" alt="{e["id"]} 八帧顺序图"></details></article>' for e in fx['effects'])
document='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>农场边缘与清障效果</title><link rel="stylesheet" href="source/review.css"><header><div><p class="eyebrow">FARM WORKSHOP / TERRAIN & EFFECTS</p><h1>让农场边缘自然长出来</h1><p>已有的树、灌木与石头继续用，只补它们之间的连接。</p></div><a href="expansion.html">← 回扩展总览</a></header><section class="landscape"><div><div class="toolbar"><button data-view="plain" aria-pressed="true">普通组合</button><button data-view="fog">薄雾叠放</button><button data-view="anchors">锚点参考</button></div><img class="land-view" src="source/terrain-composition.svg" alt="农场到待开拓区域的组合参考"></div><aside><h2>地形层保持独立</h2><p>草边、土草、内外转角和收尾小片按端口拼接。地面两轴保持 ±0.5。</p><p>树、灌木、石头沿用现有 SVG。薄雾沿用原云团，仅移除原有菱形底板。</p><p>这些图层没有锁、按钮和文案，状态交给代码叠加。</p><a href="source/terrain-composition.svg">可编辑组合源 →</a><br><a href="terrain/manifest.json">锚点与拼接参数 →</a></aside></section><details><summary>查看连续拼接检查</summary><img class="seam-view" src="source/terrain-seam-study.svg" alt="两条方向连续四段疏密交替拼接"></details><h2>18 个新增连接件 + 1 个薄雾复用件</h2><div class="asset-grid">__CARDS__</div><h2>落在清理位置的小效果</h2><p>只播放一次，落点固定；不叠加全屏白光，不遮挡操作。减少动态效果时可直接跳过。</p><div class="effects-grid">__FX__</div><footer><a href="terrain/manifest.json">地形清单</a> · <a href="effects/manifest.json">帧序、帧率与落点</a> · <a href="EXPANSION.md">交付说明</a></footer><script type="module" src="source/landscape-review.js"></script></html>'''.replace('__CARDS__',cards).replace('__FX__',effects)
(R/'landscape.html').write_text(document)
print('Landscape composition, seam study and effects review generated.')
