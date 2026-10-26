import {project,roadNetworkMarkup,fenceNetworkPieces,fieldPatchMarkup} from './components.mjs';
const map=document.querySelector('#map'),status=document.querySelector('#map-status');
const options={unit:36,origin:[460,80]},cells=new Map();let tool='road';
const key=(x,y)=>`${x},${y}`;
function reset(){cells.clear();for(let i=1;i<9;i++){cells.set(key(4,i),'road');cells.set(key(i,5),'road');}for(let u=1;u<=3;u++)for(let v=6;v<=8;v++)cells.set(key(u,v),'field');for(let i=6;i<=9;i++){cells.set(key(i,1),'fence');cells.set(key(i,4),'fence');}for(let i=2;i<4;i++){cells.set(key(6,i),'fence');cells.set(key(9,i),'fence');}cells.delete('7,4');render();}
function render(){
 const byType=t=>[...cells].filter(([k,v])=>v===t).map(([k])=>k.split(',').map(Number));
 const roads=byType('road'),fences=byType('fence'),fields=byType('field');
 let html='<rect width="920" height="490" fill="#c6dea4"/>';
 html+=roadNetworkMarkup(roads,options)+fieldPatchMarkup(fields,{...options,state:document.querySelector('#field-state').value});
 html+=fenceNetworkPieces(fences,options).map(p=>p.markup).join('');
 for(let u=0;u<11;u++)for(let v=0;v<11;v++){
  const vertices=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,y])=>{const p=project(u+x,v+y,options);return `${p.x},${p.y}`;}).join(' ');
  html+=`<polygon data-cell="${u},${v}" points="${vertices}" fill="transparent" stroke="#a9c58c" stroke-opacity=".3" stroke-width=".6" role="button" tabindex="0" aria-label="格子 ${u},${v}，${cells.get(key(u,v))||'草地'}"/>`;
 }
 map.innerHTML=html;status.textContent=`道路 ${roads.length} 格 · 围栏 ${fences.length} 个节点 · 田地 ${fields.length} 格`;
}
function edit(target){if(!target.dataset.cell)return;const k=target.dataset.cell;if(tool==='erase')cells.delete(k);else cells.set(k,tool);render();}
map.addEventListener('click',e=>edit(e.target));
map.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const cell=e.target.dataset.cell;edit(e.target);map.querySelector(`[data-cell="${cell}"]`)?.focus();}});
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelector('#field-state').onchange=render;document.querySelector('#reset').onclick=reset;
const names={empty:'空田',sown:'已播种',fertilized:'已施肥'};
const m=await fetch('manifest.json').then(r=>{if(!r.ok)throw new Error('地形清单读取失败');return r.json();});
for(const a of m.assets){const card=document.createElement('figure');card.className='tile';const art=document.createElement('div');art.className='art';const img=document.createElement('img');img.src=a.path;img.alt=a.id;art.append(img);const caption=document.createElement('figcaption');caption.textContent=a.kind==='field'?names[a.state]:'连接 '+a.mask.toString(16).toUpperCase();const note=document.createElement('small');note.textContent=a.directions?.join(' · ')|| (a.kind==='field'?'同一落地锚点':'独立节点');caption.append(note);card.append(art,caption);document.querySelector('#'+({road:'roads',fence:'fences',field:'fields'}[a.kind])).append(card);}
reset();document.body.dataset.ready='true';
