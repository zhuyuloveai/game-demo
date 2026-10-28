// Isolated art review page. Never imports game code or reads browser storage.
const $=s=>document.querySelector(s),list=[];
const get=async p=>{const r=await fetch(p);if(!r.ok)throw Error(`${p}: ${r.status}`);return r.json();};
let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,phase=0,start=performance.now();
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{for(const c of document.querySelectorAll('[data-tab]'))c.classList.toggle('active',c===b);for(const id of ['p0','p1','p2'])$('#'+id).hidden=id!==b.dataset.tab;};
$('#size').onclick=()=>{$('#goods').classList.toggle('small');$('#size').textContent=$('#goods').classList.contains('small')?'恢复 96px 预览':'检查 32px 小尺寸';};
$('#contrast').onclick=()=>document.body.classList.toggle('dark');
$('#play').textContent=playing?'暂停动作':'播放动作';
$('#play').onclick=()=>{if(playing)for(const it of list)it.phase=Number(it.el.dataset.phase)||0;playing=!playing;start=performance.now();$('#play').textContent=playing?'暂停动作':'播放动作';};
$('#phase').oninput=e=>{phase=Number(e.target.value)/100;for(const it of list)it.phase=phase;playing=false;$('#play').textContent='播放动作';};
try{
const icons=await get('icons-manifest.json');
for(const i of icons.icons){const el=document.createElement('article');el.className='icon';el.innerHTML=`<img src="${i.svg}" alt="${i.name}"><p>${i.name}</p><code>${i.id}</code>`;$(i.category==='achievements'||i.category==='branch'?'#badges':'#goods').append(el);}
const skins=await get('skins-manifest.json');for(const s of skins.sets){const el=document.createElement('article');el.className='scene';el.innerHTML=`<h3>${s.id==='chicken-floral'?'花卉鸡舍 · 6 只鸡':'花卉绵羊棚 · 5 只羊'}</h3><div class="paired"><img src="${s.path}/previews/empty.png" alt="空栏组合"><img src="${s.path}/previews/full.png" alt="满栏组合"></div><p>3 个花饰层 + 5 个复用设施层 · <a href="${s.path}/editable.svg">可编辑分层源图</a></p>`;$('#skins').append(el);}
const kits=await get('machines-manifest.json');
for(const k of kits.sets){const d=await get(k.path+'/motion-data.json'),s=d.spec;
const external=v=>v.replaceAll('href="sources/','href="'+k.path+'/sources/').replaceAll('id="','id="'+k.id+'-').replaceAll('url(#','url(#'+k.id+'-');
const el=document.createElement('article');el.className='scene';el.innerHTML=`<h3>${k.name}</h3><svg viewBox="0 0 1600 1500" role="img" aria-label="${k.name}循环动作"><g data-static>${external(d.stationary)}</g><g transform="translate(144 150)"><g data-move>${external(d.partSource)}</g></g><g data-front>${external(d.front)}</g></svg><p>${(s.cycleMs/1000).toFixed(2)} 秒循环 · <a href="${k.path}/previews/phases.png">12 相位联系图</a> · <a href="${k.path}/editable.svg">分层源图</a></p>`;$('#machines').append(el);
list.push({el,s,moving:el.querySelector('[data-move]'),statics:[...el.querySelectorAll('[data-static],[data-front]')]});}
$('#status').textContent='93 个图标、2 套花舍、5 组机械已载入。';
function tick(now){for(const it of list){const {el,s,moving,statics}=it;const t=playing?((now-start)/s.cycleMs+(it.phase??phase))%1:(it.phase??phase);
let transform;
if(s.kind==='rotor')transform=`translate(${s.pivot.join(' ')}) matrix(${s.plane.join(' ')} 0 0) rotate(${360*t}) scale(${s.radius/256})`;
else if(s.kind==='shuttle'){const n=Math.sin(2*Math.PI*t)*105;transform=`translate(${s.pivot[0]+n} ${s.pivot[1]+.5*n}) matrix(1 .5 -.7 .35 0 0)`;}
else transform=`translate(0 ${(s.kind==='needle'?-28:20)*(.5-.5*Math.cos(2*Math.PI*t))})`;
moving.setAttribute('transform',transform);el.dataset.phase=t.toFixed(4);for(const g of statics)g.style.visibility=$('#parts').checked?'hidden':'visible';}
requestAnimationFrame(tick);}
requestAnimationFrame(tick);
}catch(error){$('#status').textContent='预览加载失败：'+error.message;console.error(error);}
