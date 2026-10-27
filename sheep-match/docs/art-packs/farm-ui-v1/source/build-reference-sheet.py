from pathlib import Path
import json,hashlib,html
R=Path(__file__).resolve().parents[1];P=R.parent/'sumikko-farm-v1/environment'
m=json.loads((P/'manifest.json').read_text());items=m['assets']
ids=['grass-0','grass-1','accent-0','accent-4','natural-tree','natural-bush','rocks-0','rocks-1','rocks-2','unopened-fog','boundary-expandable','boundary-locked']
a=[x for x in items if x['id'] in ids]
refs=[];cards=[]
for x in a:
 p=P/'svg'/f'{x["id"]}.svg';src='../sumikko-farm-v1/environment/svg/'+p.name
 refs.append({'id':x['id'],'source':src,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'anchor':x.get('anchor'),'canvas':[x['width'],x['height']],'status':'existing; retain; not newly authored'})
 cards.append(f'<article><div><img src="{src}" alt="{x["label"]}"></div><b>{x["label"]}</b><small>{x["id"]} · {x["width"]}×{x["height"]} · 锚点 {x["anchor"]}</small></article>')
(R/'environment-reuse-review.json').write_text(json.dumps(refs,ensure_ascii=False,indent=2))
(R/'environment-review.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>已有环境资源 · 复用核对</title><style>body{background:#f1eddf;color:#64523e;font:14px/1.7 'PingFang SC',sans-serif;margin:0;padding:28px}main{max-width:1160px;margin:auto}h1{font-size:26px}p{max-width:900px;color:#84725c}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}article{background:#fff9ec;padding:14px;border:1px solid #d5c6ab;border-radius:16px}article div{height:128px;display:grid;place-items:center;background:#c2d49e;border-radius:12px}img{max-height:114px;max-width:170px}b,small{display:block}small{font-size:10px;color:#94816a}a{color:inherit}@media(max-width:650px){.grid{grid-template-columns:repeat(2,1fr)}}</style><main><a href="./">← 返回 UI 样板</a><h1>已有环境资源，继续复用</h1><p>以下均直接引用当前 main 的既有文件，没有重绘。草地、草芽、落叶、树、灌木和石头可继续使用；土地边界图内已有锁或加号，只作为独立 UI 提示参考；后续取用纯边框时需分离符号，不能并入新地形。现有薄雾是带菱形底色的单格图，需要在 P1 的连续边缘组合中检查方块感，不能直接把整片区域放大成一张图。</p><div class="grid">'''+''.join(cards)+'''</div><p>下一阶段先测试土草交界的直边、转角与疏密变化。只有现有组件无法自然衔接的位置才补透明过渡片；不新增矿场、不把锁或材料提示画进地形。</p></main></html>''')
print('12 existing environment resources inventoried')
