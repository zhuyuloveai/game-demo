/** Township-inspired factory interaction. Presentation only; ctx.act owns durable commands. */
import {patchFarmMarkup} from './farm-dom-patch.mjs';

export function factoryRecipes(state,entityId,config){
 const machine=state.entities.find(e=>e.id===entityId&&e.kind==='machine'&&!e.stored);
 return machine?Object.values(config.RECIPES).filter(r=>r.machineType===machine.machineType):[];
}
export function factoryStartCheck(state,entityId,recipeId,config){
 const machine=state.entities.find(e=>e.id===entityId&&e.kind==='machine'&&!e.stored),recipe=config.RECIPES[recipeId];
 if(!machine||!recipe||recipe.machineType!==machine.machineType)return {ok:false,message:'请选择本工厂的配方'};
 if(!machine.built)return {ok:false,message:'工厂尚未建成'};
 if(recipe.level>state.level)return {ok:false,message:`${recipe.level}级解锁`};
 if(machine.queue.length>=machine.slots)return {ok:false,message:'生产箱已满，请等待当前批次完成'};
 if(Object.entries(recipe.inputs).some(([id,n])=>(state.inventory[id]||0)<n))return {ok:false,message:'原料不足，请先收获或生产'};
 return {ok:true,command:{type:'enqueue',entityId,recipeId}};
}
export function factoryCollectCommand(state,entityId,jobId){
 const machine=state.entities.find(e=>e.id===entityId&&e.kind==='machine'&&!e.stored);
 return machine?.completed.some(j=>j.id===jobId)?{type:'collectMachine',entityId,jobIds:[jobId]}:null;
}
export function factoryPresentationKey(state,entityId,selected){
 const e=state.entities.find(e=>e.id===entityId);
 return JSON.stringify([e?.built,e?.slots,e?.queue?.map(j=>[j.id,j.recipeId,j.startAt,j.readyAt]),e?.completed?.map(j=>[j.id,j.recipeId,j.outputs]),state.features?.constructionVouchersEnabled,state.level,state.inventory,selected]);
}
export function factoryDropInside(point,rect){return !!rect&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.top&&point.y<=rect.bottom;}
/** The UI shows exactly the slots the durable machine owns, never upgrade placeholders. */
export function factorySlots(machine){return Array.from({length:machine?.slots||0},(_,index)=>{const job=machine.queue[index];return {index:index+1,job:job||null,state:job?job.startAt!==null?'running':'waiting':'empty'};});}
/** All recipes are visible: any intentional drag may lift one, without axis traps. */
export function factoryDragIntent(from,to){
 const dx=to.x-from.x,dy=to.y-from.y;return ![dx,dy].every(Number.isFinite)||Math.hypot(dx,dy)<8?'pending':'drag';
}
export function factoryCrossedTargets(from,to,targets){
 if(![from?.x,from?.y,to?.x,to?.y].every(Number.isFinite))return [];
 const dx=to.x-from.x,dy=to.y-from.y;
 return targets.map((r,index)=>{if(![r.left,r.right,r.top,r.bottom].every(Number.isFinite)||r.right<=r.left||r.bottom<=r.top)return null;let lo=0,hi=1;
  for(const [p,q] of [[-dx,from.x-r.left],[dx,r.right-from.x],[-dy,from.y-r.top],[dy,r.bottom-from.y]]){if(!p){if(q<0)return null;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}return {r,index,t:lo};
 }).filter(Boolean).sort((a,b)=>a.t-b.t||a.index-b.index).map(v=>v.r);
}
const duration=ms=>{const seconds=Math.max(0,Math.ceil(ms/1000));return seconds>=60?`${Math.floor(seconds/60)}分${seconds%60?`${seconds%60}秒`:''}`:`${seconds}秒`;};

export function factoryFocusable(root){
 return [...root.querySelectorAll('button:not(:disabled),summary')].filter(el=>{
  const closed=el.closest('details:not([open])');
  return !el.hidden&&!el.closest('[hidden],[inert]')&&(!closed||closed.querySelector('summary')===el)&&(!el.getClientRects||el.getClientRects().length>0);
 });
}
export function mountFactoryPanel(ctx,{entityId,onClose=()=>{},onAction=()=>{}}={}){
 const doc=ctx.doc||ctx.root.ownerDocument,win=ctx.win||doc.defaultView,esc=ctx.esc||String;
 const initial=ctx.state.entities.find(e=>e.id===entityId&&e.kind==='machine');
 if(!initial)return {destroy(){},dispose(){},refresh(){},update(){},open(){},suspend(){},resume(){}};
 if(!doc.querySelector('link[data-farm-factory-css]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./farm-factory-panel.css',import.meta.url).href;link.dataset.farmFactoryCss='';doc.head.append(link);}
 const overlay=doc.createElement('section');overlay.className='ff-backdrop';
 overlay.innerHTML='<section class="ff-panel" role="dialog" aria-modal="true"><header><div><small>我的生产工坊</small><h2></h2></div><button class="ff-close" aria-label="关闭工厂">×</button></header><div class="ff-workshop"><section class="ff-shelf" aria-label="成品货架"></section><section class="ff-production"><h3>生产槽 <span class="ff-capacity"></span></h3><button class="ff-box" aria-label="将选中的配方放入生产槽"></button><p class="ff-clock"></p></section></div><section class="ff-recipe-workspace" aria-label="选择与制作"><div class="ff-recipe-heading"><h3>选择配方</h3><span>向上拖入生产槽 · 一次一批</span></div><div class="ff-recipes" aria-label="工厂配方"></div><div class="ff-details" aria-label="配方原料详情"></div></section><div class="ff-main-footer"><p class="ff-help">点配方看原料，拖入生产槽即制作一批；成品点收或连续划收。</p><div class="ff-cargo" aria-label="成品收入货仓">📦 货仓</div></div><p class="ff-status" role="status" aria-live="polite"></p><details class="ff-queue-management"><summary>生产管理与设施设置</summary><div class="ff-waiting"></div><footer><button class="ff-edit">布置工厂</button><button class="ff-upgrade">扩展生产位置</button></footer></details><div class="ff-cursor" hidden></div></section>';
 const panel=overlay.querySelector('.ff-panel'),shelf=overlay.querySelector('.ff-shelf'),box=overlay.querySelector('.ff-box'),clock=overlay.querySelector('.ff-clock'),details=overlay.querySelector('.ff-details'),recipes=overlay.querySelector('.ff-recipes'),status=overlay.querySelector('.ff-status'),waiting=overlay.querySelector('.ff-waiting'),cargo=overlay.querySelector('.ff-cargo'),cursor=overlay.querySelector('.ff-cursor');
 const title=ctx.config.BUILDINGS[initial.configId]?.name||'生产工坊';panel.setAttribute('aria-label',title);overlay.querySelector('h2').textContent=title;
 const previous=doc.activeElement,oldInert=ctx.root.inert;ctx.root.inert=true;(ctx.root.parentElement||doc.body).append(overlay);
 let dead=false,suspended=false,resumeFocus=null,selected=null,key=null,gesture=null,busy=false,suppressClick=false;const pointers=new Set(),listeners=[];
 const machine=()=>ctx.state.entities.find(e=>e.id===entityId&&e.kind==='machine'&&!e.stored);
 const on=(target,event,fn,options)=>{target.addEventListener(event,fn,options);listeners.push(()=>target.removeEventListener(event,fn,options));};
 function updateClock(){const e=machine(),job=e?.queue[0],blocked=!!e&&e.completed.length>=(ctx.config.FARM_CONFIG?.queue?.completedBatchCap||9);const text=blocked?'货架已满 · 收取成品后继续':job?`${ctx.name(job.recipeId)} · ${job.startAt!==null?duration(job.readyAt-ctx.state.now):'等待开工'}`:`空闲 · ${e?.slots||0} 个位置可用`;if(clock.textContent!==text)clock.textContent=text;}
 function refresh(){if(dead||suspended)return;const e=machine();if(!e){close();return;}const next=factoryPresentationKey(ctx.state,entityId,selected);if(key!==next){key=next;
   const jobs=gesture?.mode==='collect'?gesture.slots:e.completed,completed=new Set(e.completed.map(j=>j.id)),cap=ctx.config.FARM_CONFIG?.queue?.completedBatchCap||9;
   patchFarmMarkup(shelf,`<h3>成品 <span>${e.completed.length} / ${cap} 批</span></h3><div class="ff-goods">${jobs.length?jobs.map(j=>{const count=Object.values(j.outputs||{}).reduce((n,v)=>n+v,0),label=esc(ctx.name(j.recipeId));return completed.has(j.id)?`<button data-render-key="goods:${esc(j.id)}" data-ff-collect="${esc(j.id)}" aria-label="收取${label} ×${count}">${ctx.item(j.recipeId)}<span>${label}</span><small>×${count} · 收取</small></button>`:`<span class="ff-collected" data-render-key="collected:${esc(j.id)}">✓<small>已收取</small></span>`;}).join(''):'<p class="ff-empty">还没有成品<br>完成后在此收取</p>'}</div>`);
   patchFarmMarkup(box,factorySlots(e).map(slot=>`<span class="ff-slot ff-slot-${slot.state}" data-ff-slot="${slot.index}" data-slot-state="${slot.state}">${slot.job?`${ctx.item(slot.job.recipeId)}<strong>${esc(ctx.name(slot.job.recipeId))}</strong><small>${slot.state==='running'?'制作中':'等待中'}</small>`:`<span class="ff-box-symbol" aria-hidden="true">＋</span><strong>空位 ${slot.index}</strong><small>拖入配方</small>`}</span>`).join(''));
   box.style.setProperty('--ff-cols',String(Math.min(3,e.slots)));overlay.querySelector('.ff-capacity').textContent=`${e.queue.length} / ${e.slots}`;
   box.setAttribute('aria-disabled',String(e.queue.length>=e.slots));box.setAttribute('aria-label',`生产槽已用 ${e.queue.length} / ${e.slots}，${selected?'点击制作'+ctx.name(selected):'先选择配方再点此制作'}`);box.dataset.uiState=e.queue.length?'running':'empty';details.dataset.uiState=selected?'selected':'empty';
   const upgrade=overlay.querySelector('.ff-upgrade'),enabled=ctx.state.features?.constructionVouchersEnabled!==false;upgrade.disabled=!enabled||e.slots>=9;upgrade.textContent=!enabled?'扩槽功能关闭':e.slots>=9?'生产位置已满':'扩展生产位置';
   recipes.style.setProperty('--ff-recipe-cols',String(Math.min(5,factoryRecipes(ctx.state,entityId,ctx.config).length)));
   patchFarmMarkup(recipes,factoryRecipes(ctx.state,entityId,ctx.config).map(r=>`<button data-render-key="recipe:${esc(r.id)}" data-ff-recipe="${esc(r.id)}" data-ui-state="${r.level>ctx.state.level?'locked':Object.entries(r.inputs).some(([id,n])=>(ctx.state.inventory[id]||0)<n)?'missing':'ready'}" aria-pressed="${selected===r.id}" aria-label="查看${esc(r.name)}配方${r.level>ctx.state.level?'，'+r.level+'级解锁':''}">${ctx.item(r.id)}<strong>${esc(r.name)}</strong><small>${r.level>ctx.state.level?r.level+'级解锁':duration(r.durationMs)+' · ×'+Object.values(r.outputs).reduce((n,v)=>n+v,0)}</small></button>`).join(''));
   patchFarmMarkup(waiting,e.queue.length?e.queue.map(j=>`<div data-render-key="waiting:${esc(j.id)}"><span>${esc(ctx.name(j.recipeId))} · ${j.startAt!==null?'制作中':'等待中'}</span>${j.startAt===null?`<button data-ff-job="${esc(j.id)}" data-ff-direction="-1" aria-label="${esc(ctx.name(j.recipeId))}往前一格">↑</button><button data-ff-job="${esc(j.id)}" data-ff-direction="1" aria-label="${esc(ctx.name(j.recipeId))}往后一格">↓</button><button data-ff-cancel="${esc(j.id)}">取消并返料</button>`:''}</div>`).join(''):'<p>暂无生产安排</p>');
   const recipe=ctx.config.RECIPES[selected];patchFarmMarkup(details,recipe?`<h3>${esc(recipe.name)} <small>仓内 ${ctx.state.inventory[recipe.id]||0} · ${duration(recipe.durationMs)}</small></h3><div class="ff-ingredients">${Object.entries(recipe.inputs).map(([id,n])=>`<span class="${(ctx.state.inventory[id]||0)<n?'ff-missing':''}">${ctx.item(id)}<span>${esc(ctx.name(id))}<strong>${ctx.state.inventory[id]||0} / ${n}</strong></span>${(ctx.state.inventory[id]||0)<n?`<button data-ff-source="${esc(id)}" aria-label="去获取${esc(ctx.name(id))}">去获取</button>`:''}</span>`).join('')}</div><p>${esc(factoryStartCheck(ctx.state,entityId,selected,ctx.config).message||'拖入生产槽，或点击生产槽，才会消耗以上原料')}</p>`:'<p>选择一个配方查看原料，再拖入上方生产槽。</p>');
  }updateClock();
 }
 function select(id){selected=id;refresh();}
 function commit(recipeId,allowSeedReserve=false){if(dead||busy)return;const check=factoryStartCheck(ctx.state,entityId,recipeId,ctx.config);if(!check.ok){status.textContent=check.message;return;}busy=true;try{const result=ctx.act({...check.command,...(allowSeedReserve?{allowSeedReserve:true}:{})},{sourceElement:box});status.textContent=result?.ok?'已加入 1 批制作，完成后到成品区收取':result?.message||'未开始制作，原料未消耗';const code=result?.error?.code||result?.code||result?.error;if(!result?.ok&&code==='KEEP_SEED_RESERVE'&&!allowSeedReserve)ctx.confirm({title:'本次使用最后一份种子？',body:'<p>本批制作将用掉至少一种作物的最后一份库存。请确认田间或待收作物足够继续播种。</p><p>仅本次解除留种保护；取消不会扣料。</p>',onConfirm:()=>commit(recipeId,true)});return result;}finally{busy=false;refresh();}}
 function collect(id,source){if(dead||busy)return;const command=factoryCollectCommand(ctx.state,entityId,id);if(!command)return;busy=true;try{const result=ctx.act(command,{sourceElement:source,targetElement:cargo});const done=result?.ok&&result.delta?.events?.some(e=>e.id===id&&e.ok!==false);status.textContent=done?'成品已收入货仓':result?.message||result?.skipped?.[0]?.message||result?.delta?.skipped?.[0]?.message||'货仓空间不足，请先整理货仓';return done;}finally{busy=false;refresh();}}
 function stop(message){const g=gesture;gesture=null;cursor.hidden=true;box.classList.remove('ff-drop-ready','ff-drop-committed');overlay.classList.remove('ff-dragging');
  // Clear ownership before release; native lostpointercapture can fire synchronously.
  if(g?.id!==undefined)try{if(overlay.hasPointerCapture?.(g.id))overlay.releasePointerCapture(g.id);}catch{}
  if(message&&g?.active){status.textContent=g.done?'已停止，已完成的操作保留':message;ctx.clearFeedback?.();}
  if(g?.mode==='collect'){key=null;refresh();}
 }
 const point=e=>({x:e.clientX,y:e.clientY});
 const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
 const clip=(a,b)=>({left:Math.max(a.left,b.left),right:Math.min(a.right,b.right),top:Math.max(a.top,b.top),bottom:Math.min(a.bottom,b.bottom)});
 const visibleBounds=()=>{const bounds=rect(panel),header=overlay.querySelector('header');if(header)bounds.top=Math.max(bounds.top,Math.min(bounds.bottom,rect(header).bottom));return bounds;};
 const insidePanel=p=>factoryDropInside(p,rect(panel));
 const capture=id=>{try{overlay.setPointerCapture?.(id);}catch{}};
 function visit(g,p){
  if(g.mode==='recipe'){
   if(!g.attempted&&factoryDropInside(p,clip(rect(box),visibleBounds()))){
    g.attempted=true;const result=commit(g.recipeId);if(gesture!==g)return;
    if(result?.ok){g.done=1;box.classList.add('ff-drop-committed');cursor.hidden=true;}
   }
   return;
  }
  const bounds=clip(rect(shelf),visibleBounds()),targets=[...shelf.querySelectorAll('[data-ff-collect]')].map(el=>({id:el.dataset.ffCollect,el,...clip(rect(el),bounds)}));
  // Snapshot hits before dispatch patches/removes a product. Temporary receipts
  // hold the original grid positions until release, so fast swipes cannot skip.
  for(const hit of factoryCrossedTargets(g.last,p,targets)){if(g.seen.has(hit.id)||!g.ids.has(hit.id))continue;g.seen.add(hit.id);if(collect(hit.id,hit.el)){g.done++;status.textContent=`本次已收取 ${g.done} 批，收入货仓`;}}
  g.last=p;
 }
 function move(event){const g=gesture;if(!g||g.id!==event.pointerId)return;const p=point(event);if(!insidePanel(p)){stop('已取消拖动');return;}
  if(!g.active){const intent=factoryDragIntent(g.start,p,g.pointerType);if(intent==='pending')return;g.active=true;suppressClick=true;capture(g.id);cursor.innerHTML=ctx.item(g.recipeId);overlay.classList.add('ff-dragging');}
  if(g.mode==='recipe'&&!g.done){cursor.hidden=false;cursor.style.transform=`translate(${p.x}px,${p.y}px)`;box.classList.toggle('ff-drop-ready',!g.attempted&&factoryDropInside(p,clip(rect(box),visibleBounds())));}
  visit(g,p);event.preventDefault();
 }
 on(doc,'pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;pointers.add(event.pointerId);if(pointers.size>1){suppressClick=true;stop('已取消拖动');}},true);
 on(overlay,'pointerdown',event=>{
  if(event.button!==undefined&&event.button!==0||event.isPrimary===false||pointers.size>1)return;
  const recipe=event.target.closest('[data-ff-recipe]'),goods=event.target.closest('[data-ff-collect]');if(!recipe&&!goods)return;
  const start=point(event);
  if(recipe){select(recipe.dataset.ffRecipe);gesture={id:event.pointerId,pointerType:event.pointerType,mode:'recipe',recipeId:recipe.dataset.ffRecipe,start,active:false,attempted:false,done:0};}
  else{const slots=machine().completed.map(j=>({...j}));gesture={id:event.pointerId,mode:'collect',start,last:start,active:true,slots,ids:new Set(slots.map(j=>j.id)),seen:new Set(),done:0};suppressClick=true;capture(event.pointerId);event.preventDefault();visit(gesture,start);}
 },{passive:false});
 on(doc,'pointermove',move,{capture:true,passive:false});
 on(doc,'pointerup',event=>{pointers.delete(event.pointerId);const g=gesture;if(!g||g.id!==event.pointerId){if(!pointers.size)win.setTimeout(()=>{suppressClick=false;},0);return;}if(insidePanel(point(event)))move(event);else stop('已取消拖动');const active=g.active;stop();if(active){suppressClick=true;win.setTimeout(()=>{suppressClick=false;},0);}},true);
 on(doc,'pointercancel',event=>{pointers.delete(event.pointerId);if(gesture?.id===event.pointerId)stop('已取消拖动');if(!pointers.size)suppressClick=false;},true);
 on(overlay,'lostpointercapture',event=>{if(gesture?.id===event.pointerId)stop('已取消拖动');});
 on(overlay,'dragstart',event=>event.preventDefault());
 on(win,'blur',()=>{pointers.clear();stop('已取消拖动');});on(win,'resize',()=>stop('已取消拖动'));on(doc,'visibilitychange',()=>{if(doc.hidden){pointers.clear();stop('已取消拖动');}});
 on(overlay,'click',event=>{if(event.target.closest('.ff-close')){close();return;}if(suppressClick){suppressClick=false;return;}// Captured recipe pointers retarget click to overlay; backdrop clicks never dismiss.
 const source=event.target.closest('[data-ff-source]');if(source){close();onAction('source:'+source.dataset.ffSource);return;}
 const cancel=event.target.closest('[data-ff-cancel]'),move=event.target.closest('[data-ff-job]');
 if(cancel){const job=machine()?.queue.find(j=>j.id===cancel.dataset.ffCancel&&j.startAt===null);if(job)ctx.confirm({title:'取消等待中的这一批？',body:'<p>原料会退回仓库；空间不足则保留任务。</p>',onConfirm:()=>{if(dead)return {ok:false};const result=ctx.act({type:'cancelJob',entityId,jobId:job.id});refresh();return result;}});return;}
 if(move){const ids=machine().queue.filter(j=>j.startAt===null).map(j=>j.id),from=ids.indexOf(move.dataset.ffJob),to=from+Number(move.dataset.ffDirection);if(from>=0&&to>=0&&to<ids.length){[ids[from],ids[to]]=[ids[to],ids[from]];ctx.act({type:'reorderQueue',entityId,jobIds:ids});refresh();}return;}
 const r=event.target.closest('[data-ff-recipe]'),g=event.target.closest('[data-ff-collect]');if(r)select(r.dataset.ffRecipe);else if(g&&event.detail===0)collect(g.dataset.ffCollect,g);else if(event.target.closest('.ff-box')){if(selected)commit(selected);else status.textContent='先选择一个配方';}else if(event.target.closest('.ff-edit')){close();onAction('edit');}else if(event.target.closest('.ff-upgrade')){close();onAction('upgrade-machine');}});
 on(overlay,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const nodes=factoryFocusable(overlay);if(event.shiftKey&&doc.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&doc.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}});
 function suspend(){if(dead||suspended)return;suspended=true;resumeFocus=doc.activeElement;pointers.clear();suppressClick=false;stop();ctx.clearFeedback?.();overlay.hidden=true;ctx.root.inert=oldInert;}
 function resume(){if(dead||!suspended)return;suspended=false;ctx.root.inert=true;overlay.hidden=false;refresh();if(resumeFocus?.isConnected&&overlay.contains(resumeFocus))resumeFocus.focus({preventScroll:true});else overlay.querySelector('.ff-close').focus();resumeFocus=null;}
 let timer,unsubscribe;function destroy(){if(dead)return;dead=true;stop();ctx.clearFeedback?.();win.clearInterval(timer);unsubscribe?.();listeners.splice(0).forEach(off=>off());overlay.remove();ctx.root.inert=oldInert;if(previous?.isConnected)previous.focus({preventScroll:true});}
 function close(){destroy();onClose();}
 unsubscribe=ctx.subscribe?.(refresh);timer=win.setInterval(refresh,1000);refresh();overlay.querySelector('.ff-close').focus();
 return {destroy,dispose:destroy,refresh,update:refresh,open:refresh,suspend,resume};
}
export const createFactoryPanel=mountFactoryPanel;
