/* Art-review interaction only. No game modules, saves, commands or network writes. */
const params=new URLSearchParams(location.search),scenario=params.get('state')||'normal';
const recipes=[{id:'bread',name:'面包',time:'5 分钟',inputs:[['wheat','小麦',3]]},{id:'corn_bread',name:'玉米面包',time:'30 分钟',inputs:[['corn','玉米',2],['egg','鸡蛋',2]]},{id:'cookie',name:'饼干',time:'60 分钟',inputs:[['wheat','小麦',2],['egg','鸡蛋',2],['brown_sugar','红糖',1]]}];
const stock={wheat:18,corn:12,egg:scenario==='missing'?1:6,brown_sugar:3};if(scenario==='empty')Object.keys(stock).forEach(k=>stock[k]=0);
let selected='corn_bread',filter=scenario==='empty'?'available':'all';
function skin(root=document){root.querySelectorAll('[data-art]').forEach(el=>{const id=el.dataset.art;el.style.setProperty('--art',`url('${new URL('components/'+id+'.svg',location.href).href}')`);let n=id.startsWith('panel')?26:id.startsWith('title')?20:id.startsWith('recipe-card')?19:id.startsWith('quantity')?13:id.startsWith('notice')?15:16;if(id.startsWith('progress'))n=id.endsWith('fill')?6:7;el.style.setProperty('--slice',n);el.style.setProperty('--edge',n+'px');});}
function img(id,cls=''){return `<img class="${cls}" data-export-image src="reused/${id}.svg" alt="">`;}
function enough(r){return r.inputs.every(([id,,n])=>stock[id]>=n);}
function toast(s){document.querySelector('.review-feedback').textContent='美术样板：'+s;}
function render(){
 const r=recipes.find(x=>x.id===selected),missing=!enough(r),empty=scenario==='empty';
 document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===filter;b.setAttribute('aria-selected',active);b.querySelector('.skin').dataset.art='tab-'+(active?'selected':'default');});
 const shown=recipes.filter(x=>filter==='all'||enough(x));
 document.querySelector('.recipe-list').innerHTML=shown.length?shown.map(x=>`<button class="recipe-card" data-recipe="${x.id}" aria-label="选择${x.name}" aria-pressed="${x.id===selected}"><i class="skin" data-art="recipe-card-${x.id===selected?'selected':!enough(x)?'missing':'default'}"></i>${img(x.id)}<span class="recipe-name" data-export-text>${x.name}</span><span class="recipe-time" data-export-text>${enough(x)?x.time:'材料不足'}</span></button>`).join(''):`<div class="empty-recipes"><i class="skin" data-art="notice-empty"></i>${img('wheat')}<div><strong data-export-text>暂时没有可以制作的配方</strong><p data-export-text>先备些原料，再回来开工。</p></div></div>`;
 document.querySelector('.selected-name').textContent=r.name;document.querySelector('.duration').textContent=r.time;
 document.querySelector('.ingredient-row').innerHTML=r.inputs.map(([id,name,n])=>`<div class="ingredient ${stock[id]<n?'missing':''}"><div class="ingredient-art"><i class="skin" data-art="item-slot-${stock[id]<n?'missing':'default'}"></i>${img(id)}</div><div class="ingredient-copy"><span class="ingredient-name" data-export-text>${name}</span><span class="ingredient-value" data-export-text>${stock[id]} / ${n}</span></div></div>`).join('');
 const note=document.querySelector('.material-note');note.hidden=!missing;note.querySelector('span').textContent=empty?'原料还没备齐':`还差 ${r.inputs.filter(([id,,n])=>stock[id]<n).map(([id,name,n])=>`${n-stock[id]} 份${name}`).join('、')}`;
 document.querySelector('.storage-notice').hidden=scenario!=='full';document.querySelector('.completion').hidden=scenario==='full';
 const action=document.querySelector('[data-action="produce"]');action.disabled=missing;action.querySelector('.skin').dataset.art='button-primary-'+(missing?'disabled':'default');action.querySelector('span').textContent=missing?'材料不足':'加入队列';
 document.querySelector('.primary-note').textContent=missing?'先准备好原料':'材料齐了';document.querySelector('.secondary-note').textContent=missing?'配方和队列都会保留':'加入队列后依次制作';
 if(scenario==='long'){document.querySelector('h1').textContent='小麦与果香的面包房';document.querySelector('.subtitle').textContent='今天也有新鲜出炉的好味道';action.querySelector('span').textContent='加入生产队列';}
 skin();
}
document.addEventListener('click',e=>{const r=e.target.closest('[data-recipe]');if(r){selected=r.dataset.recipe;render();return;}const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;render();return;}const a=e.target.closest('[data-action]');if(a&&!a.disabled){toast(({produce:'已演示加入队列按钮，未更改游戏数据。',collect:scenario==='full'?'货仓已满，成品保留；可前往仓库。':'已演示领取按钮，未更改游戏数据。',source:'这里将返回缺少原料的获取入口。',warehouse:'这里将进入仓库腾出空间。'})[a.dataset.action]);}if(e.target.closest('.locked'))toast('未解锁槽位会展示真实解锁条件。');if(e.target.closest('.empty'))toast('空槽接受选中的配方。');if(e.target.closest('.close')){document.querySelector('.production-panel').hidden=true;document.querySelector('.reopen').hidden=false;}if(e.target.closest('.reopen')){document.querySelector('.production-panel').hidden=false;document.querySelector('.reopen').hidden=true;}});
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.action-button,.close');if(b&&!b.disabled){const s=b.querySelector('.skin');s.dataset.art=s.dataset.art.replace('default','pressed');skin(b);}});document.addEventListener('pointerup',()=>{document.querySelectorAll('[data-art$="pressed"]').forEach(x=>x.dataset.art=x.dataset.art.replace('pressed','default'));skin();});
if(matchMedia('(max-width:600px)').matches)document.querySelector('.farm-context').src='evidence/farm-context-portrait.png';
render();
