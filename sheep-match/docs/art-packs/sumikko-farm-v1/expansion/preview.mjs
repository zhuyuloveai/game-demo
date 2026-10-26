import {environmentInstance,waterPatchMarkup} from '../environment/components.mjs';
import {buildingBadgeMarkup} from '../building-states/components.mjs';
import {roadPathsMarkup,fenceLinePieces,fieldPatchMarkup,project} from '../terrain/components.mjs';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
let animalManifest,environmentManifest,buildingManifest,base,active='environment';
const names={grass:'草地底纹',accent:'草间点缀',water:'小河与水岸',gate:'可以推开的木门',boundary:'土地边界',placement:'布置反馈',scroll:'移动方向',nature:'树丛与石头',utility:'施工与阴影'};
function croppedImage(asset,width,x=0,y=0,prefix='../animal-states/'){
 const [l,t,r,b]=asset.opaqueBounds||asset.bounds,h=width*(b-t)/(r-l),src=asset.src||prefix+asset.path,size=asset.size;
 return `<svg x="${x-width/2}" y="${y-h}" width="${width}" height="${h}" viewBox="${l} ${t} ${r-l} ${b-t}" preserveAspectRatio="xMidYMax meet"><image href="${src}" width="${size[0]}" height="${size[1]}"/></svg>`;
}
function open(a,src){$('detail-name').textContent=a.label+(a.stateLabel?' · '+a.stateLabel:'');$('detail-image').src=src;$('detail-image').alt=$('detail-name').textContent;$('download').href=src;$('detail').showModal();}
function card(a,folder,animal=false,badge=false){
 const button=document.createElement('button');button.className='card';button.setAttribute('aria-label','查看'+a.label+(a.stateLabel?'·'+a.stateLabel:''));
 const art=document.createElement('div');art.className='art';const src=folder+a.path;
 if(animal){const [l,t,r,b]=a.opaqueBounds,w=145*a.displayScale;art.innerHTML=`<svg width="${w}" height="${w*(b-t)/(r-l)}" viewBox="${l} ${t} ${r-l} ${b-t}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><image href="${src}" width="${a.size[0]}" height="${a.size[1]}"/></svg>`;}
 else{const img=document.createElement('img');img.src=src;img.alt='';art.append(img);if(badge)for(const cls of ['small','tiny']){const mini=img.cloneNode();mini.className=cls;art.append(mini);}}
 const caption=document.createElement('span');caption.className='caption';caption.textContent=animal?a.stateLabel:a.label;
 const small=document.createElement('small');small.textContent=animal?(a.status==='existing'?'沿用日常姿态':'新增状态'):badge?'64 / 32 / 24 px':a.id;caption.append(small);
 button.append(art,caption);button.onclick=()=>open(a,src);return button;
}
function group(title,entries,folder,animal=false,badge=false){const s=document.createElement('section');s.className='group';const h=document.createElement('h3');h.textContent=title;const grid=document.createElement('div');grid.className='grid';entries.forEach(a=>grid.append(card(a,folder,animal,badge)));s.append(h,grid);return s;}
function gallery(){const root=$('gallery');root.replaceChildren();root.className=active;
 if(active==='environment'){for(const g of Object.keys(names))root.append(group(names[g],environmentManifest.assets.filter(a=>a.group===g),'../environment/'));$('hint').textContent='42 项环境细节。小河可以连续拼接，木门保留相同的门柱位置。';}
 else if(active==='animals'){for(const f of animalManifest.families)root.append(group(f.label,f.states.map(k=>animalManifest.assets.find(a=>a.key===k)),'../animal-states/',true));$('hint').textContent='每一行是同一个伙伴：日常 → 生产中 → 可收取。新增 10 张状态图，沿用 5 张日常图。';}
 else {root.append(group('施工、加工与收取',buildingManifest.assets.filter(a=>a.kind==='status'),'../building-states/',false,true));root.append(group('从种子到开花的四级熟练度',buildingManifest.assets.filter(a=>a.kind==='mastery'),'../building-states/',false,true));$('hint').textContent='每个标记同时展示三种大小。状态标记与小屋分开绘制，可以换位置、调整大小。';}
}
function drawScene(){
 const options={unit:36,origin:[500,120]},g=[],layers=[];
 const instance=(id,u,v,layer=true,unit=36)=>{const a=environmentInstance(id,u,v,{...options,scale:unit/options.unit});if(layer)layers.push(a);else g.push(a.markup);};
 g.push('<rect width="1000" height="600" fill="#c6dea4"/><path d="M130 225Q180 80 405 100Q640 65 843 231Q948 356 779 465Q548 552 276 461Q68 390 130 225Z" fill="#cee2ac"/>');
 for(let i=0;i<24;i++)instance('accent-'+i%6,1+(i*3.17)%10,1+(i*7.29)%10,false,30);
 g.push(roadPathsMarkup(['M5 1.3V11.3','M1.8 3.8H5','M5 5.3H10.6','M8.6 3.5V5.3'],{...options,width:.95}));
 g.push(fieldPatchMarkup([[1,4],[2,4],[3,4],[1,5],[2,5],[3,5]],options));
 const pond=[];for(let u=1;u<=3;u++)for(let v=7;v<=9;v++)pond.push([u,v]);g.push(waterPatchMarkup(pond,options));
 instance('water-ripple',2,8,false);instance('natural-bush',.5,7);instance('rocks-1',3.4,9.1);
 const boundary=$('boundary-state').value==='fog'?'unopened-fog':'boundary-'+$('boundary-state').value;
 for(const u of [1,2,3])for(const v of [10,11])instance(boundary,u,v,false);
 for(const [u,v,size] of [[0,1,44],[1,0,44],[4,0,48],[7,0,46],[10,1,45],[11,3,43],[12,7,45],[12.8,9.5,40],[7,12,39],[4,12,38],[0,10,40],[-.5,5,43]])instance('natural-tree',u,v,true,size);
 for(const [u,v] of [[2,.8],[6,.7],[10.8,4.5],[11,9],[6,11.5],[-.5,8]])instance('natural-bush',u,v);
 for(const [id,u,v] of [['rocks-0',.2,5.7],['rocks-2',10.7,10.3]])instance(id,u,v);
 const addSprite=(asset,u,v,width)=>{const p=project(u,v,options);instance('ground-shadow',u,v,false,width/2);layers.push({depth:p.y,markup:croppedImage(asset,width,p.x,p.y)});};
 addSprite(base.farmhouse,2.5,2.6,174);addSprite(base.barn,8.4,3.3,150);addSprite(base['hay-bales'],10,3.9,55);addSprite(base['flower-pot'],3.6,3.1,30);
 for(const [a,b] of [[[6,6],[10.3,6]],[[10.3,6],[10.3,10]],[[6,6],[6,10]],[[6,10],[7.25,10]],[[8.75,10],[10.3,10]]])layers.push(...fenceLinePieces(a,b,options));
 instance('gate-horizontal-'+$('gate-state').value,8,10);
 const state=$('animal-state').value;
 for(const [key,u,v,w] of [['chicken',6.8,7.2,42],['cow',8.3,7.2,71],['pig',9.4,8.4,63],['sheep',7.1,8.4,62],['lamb',8.7,9.5,46]]){const a=animalManifest.assets.find(a=>a.key===key+'-'+state);addSprite(a,u,v,w*a.displayScale);}
 addSprite(base.trough,9.6,6.8,50);
 const building=$('building-state').value,barn=project(8.4,3.3,options);
 if(building==='constructing')instance('construction-scaffold',8.4,3.3,true,48);
 layers.sort((a,b)=>a.depth-b.depth);$('scene').innerHTML=g.join('')+layers.map(x=>x.markup).join('')+buildingBadgeMarkup(building,{x:barn.x,y:barn.y-132,size:42});
 $('scene').dataset.animalState=state;$('scene').dataset.gateState=$('gate-state').value;$('scene').dataset.buildingState=building;
 $('scene-status').textContent=`伙伴：${$('animal-state').selectedOptions[0].text} · 木门：${$('gate-state').selectedOptions[0].text} · 小屋：${$('building-state').selectedOptions[0].text}`;
}
async function exportScene(){
 const button=$('export');button.disabled=true;try{
  const svg=$('scene').cloneNode(true);svg.setAttribute('width','1600');svg.setAttribute('height','960');
  const data=new Map();for(const img of svg.querySelectorAll('image')){const src=img.getAttribute('href');if(!data.has(src)){const r=await fetch(src);if(!r.ok)throw new Error('素材加载失败');const blob=await r.blob();data.set(src,await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(blob);}));}img.setAttribute('href',data.get(src));}
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
  try{const image=new Image();await new Promise((ok,no)=>{image.onload=ok;image.onerror=no;image.src=url;});const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=960;canvas.getContext('2d').drawImage(image,0,0);const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));if(!blob)throw new Error('导出失败');const out=URL.createObjectURL(blob),a=document.createElement('a');a.href=out;a.download='羊羊牧场-环境与伙伴.png';a.click();setTimeout(()=>URL.revokeObjectURL(out),10000);}finally{URL.revokeObjectURL(url);}
  $('scene-status').textContent='场景图已保存';
 }catch(e){$('scene-status').textContent=e.message;console.error(e);}finally{button.disabled=false;}
}
$('close').onclick=()=>$('detail').close();$('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('background').onclick=()=>{const on=document.querySelector('.detail-art').classList.toggle('checker');$('background').setAttribute('aria-pressed',String(on));};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));gallery();});
for(const id of ['animal-state','gate-state','building-state','boundary-state'])$(id).onchange=drawScene;
$('export').onclick=exportScene;
try{
 [animalManifest,environmentManifest,buildingManifest,base]=await Promise.all(['../animal-states/manifest.json','../environment/manifest.json','../building-states/manifest.json','../scene/assets.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('素材清单读取失败');return r.json();}));
 $('count').textContent=`${environmentManifest.count} 环境 · ${animalManifest.counts.generated} 动物状态 · ${buildingManifest.count} 建筑标记`;
 drawScene();gallery();
 const urls=[...new Set([...document.querySelectorAll('img,image')].map(e=>e.getAttribute('src')||e.getAttribute('href')).filter(Boolean))];
 await Promise.all(urls.map(src=>new Promise((ok,no)=>{const im=new Image();im.onload=ok;im.onerror=()=>no(new Error('素材未加载：'+src));im.src=src;})));
 document.body.dataset.ready='true';
}catch(e){$('count').textContent=e.message;console.error(e);}
