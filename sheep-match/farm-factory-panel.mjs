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
 return JSON.stringify([e?.built,e?.slots,e?.queue?.map(j=>[j.id,j.recipeId,j.startAt,j.readyAt]),e?.completed?.map(j=>[j.id,j.recipeId]),state.level,state.inventory,selected]);
}
export function factoryDropInside(point,rect){return !!rect&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=rect.left&&point.x<=rect.right&&point.y>=rect.top&&point.y<=rect.bottom;}
const duration=ms=>{const seconds=Math.max(0,Math.ceil(ms/1000));return seconds>=60?`${Math.floor(seconds/60)}分${seconds%60?`${seconds%60}秒`:''}`:`${seconds}秒`;};

export function mountFactoryPanel(ctx,{entityId,onClose=()=>{},onAction=()=>{}}={}){
 const doc=ctx.doc||ctx.root.ownerDocument,win=ctx.win||doc.defaultView,esc=ctx.esc||String;
 const initial=ctx.state.entities.find(e=>e.id===entityId&&e.kind==='machine');
 if(!initial)return {destroy(){},dispose(){},refresh(){},update(){},open(){},suspend(){},resume(){}};
 if(!doc.querySelector('link[data-farm-factory-css]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./farm-factory-panel.css',import.meta.url).href;link.dataset.farmFactoryCss='';doc.head.append(link);}
 const overlay=doc.createElement('section');overlay.className='ff-backdrop';
 overlay.innerHTML='<section class="ff-panel" role="dialog" aria-modal="true"><header><div><small>我的生产工坊</small><h2></h2></div><button class="ff-close" aria-label="关闭工厂">×</button></header><div class="ff-workshop"><section class="ff-shelf" aria-label="成品货架"></section><section class="ff-production"><h3>生产箱</h3><button class="ff-box" aria-label="将选中的配方放入生产箱"></button><p class="ff-clock"></p></section></div><details class="ff-queue-management"><summary>生产安排</summary><div class="ff-waiting"></div></details><div class="ff-details" aria-label="配方原料详情"></div><div class="ff-recipes" aria-label="工厂配方"></div><p class="ff-help">点配方查看原料；拖进生产箱开始制作。成品点一下收入货仓。</p><footer><button class="ff-edit">布置工厂</button><button class="ff-upgrade">扩展生产位置</button><div class="ff-cargo" aria-label="成品收入货仓">📦 货仓</div></footer><p class="ff-status" role="status" aria-live="polite"></p><div class="ff-cursor" hidden></div></section>';
 const panel=overlay.querySelector('.ff-panel'),shelf=overlay.querySelector('.ff-shelf'),box=overlay.querySelector('.ff-box'),clock=overlay.querySelector('.ff-clock'),details=overlay.querySelector('.ff-details'),recipes=overlay.querySelector('.ff-recipes'),status=overlay.querySelector('.ff-status'),waiting=overlay.querySelector('.ff-waiting'),cargo=overlay.querySelector('.ff-cargo'),cursor=overlay.querySelector('.ff-cursor');
 const title=ctx.config.BUILDINGS[initial.configId]?.name||'生产工坊';panel.setAttribute('aria-label',title);overlay.querySelector('h2').textContent=title;
 const previous=doc.activeElement,oldInert=ctx.root.inert;ctx.root.inert=true;(ctx.root.parentElement||doc.body).append(overlay);
 let dead=false,suspended=false,resumeFocus=null,selected=null,key=null,gesture=null,busy=false,suppressClick=false;const pointers=new Set(),listeners=[];
 const machine=()=>ctx.state.entities.find(e=>e.id===entityId&&e.kind==='machine'&&!e.stored);
 const on=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
 function updateClock(){const job=machine()?.queue[0];const text=job?`${ctx.name(job.recipeId)} · ${job.readyAt?duration(job.readyAt-ctx.state.now):'等待开工'}`:`空闲 · 可用 ${machine()?.slots||0} 个位置`;if(clock.textContent!==text)clock.textContent=text;}
 function refresh(){if(dead||suspended)return;const e=machine();if(!e){close();return;}const next=factoryPresentationKey(ctx.state,entityId,selected);if(key!==next){key=next;
   patchFarmMarkup(shelf,`<h3>成品货架</h3><div class="ff-goods">${e.completed.length?e.completed.map(j=>`<button data-render-key="goods:${esc(j.id)}" data-ff-collect="${esc(j.id)}" aria-label="收取${esc(ctx.name(j.recipeId))}">${ctx.item(j.recipeId)}<span>${esc(ctx.name(j.recipeId))}</span><small>点击收取</small></button>`).join(''):'<p class="ff-empty">完成的产品会放在这里</p>'}</div>`);
   patchFarmMarkup(box,e.queue.length?`${ctx.item(e.queue[0].recipeId)}<strong>制作中</strong><small>生产安排 ${e.queue.length} / ${e.slots}</small>${e.queue.length<e.slots?'<small>可继续拖入配方</small>':''}`:'<span class="ff-box-symbol" aria-hidden="true">＋</span><strong>拖配方到这里</strong><small>或选配方后点此放入</small>');
   box.setAttribute('aria-disabled',String(e.queue.length>=e.slots));
   const upgrade=overlay.querySelector('.ff-upgrade'),enabled=ctx.state.features?.constructionVouchersEnabled!==false;upgrade.disabled=!enabled||e.slots>=9;upgrade.textContent=!enabled?'扩槽功能关闭':e.slots>=9?'生产位置已满':'扩展生产位置';
   patchFarmMarkup(recipes,factoryRecipes(ctx.state,entityId,ctx.config).map(r=>`<button data-render-key="recipe:${esc(r.id)}" data-ff-recipe="${esc(r.id)}" aria-pressed="${selected===r.id}" aria-label="查看${esc(r.name)}配方${r.level>ctx.state.level?'，'+r.level+'级解锁':''}">${ctx.item(r.id)}<strong>${esc(r.name)}</strong><small>${r.level>ctx.state.level?r.level+'级解锁':duration(r.durationMs)}</small></button>`).join(''));
   patchFarmMarkup(waiting,e.queue.length?e.queue.map(j=>`<div data-render-key="waiting:${esc(j.id)}"><span>${esc(ctx.name(j.recipeId))} · ${j.startAt!==null?'制作中':'等待中'}</span>${j.startAt===null?`<button data-ff-job="${esc(j.id)}" data-ff-direction="-1" aria-label="${esc(ctx.name(j.recipeId))}往前一格">↑</button><button data-ff-job="${esc(j.id)}" data-ff-direction="1" aria-label="${esc(ctx.name(j.recipeId))}往后一格">↓</button><button data-ff-cancel="${esc(j.id)}">取消并返料</button>`:''}</div>`).join(''):'<p>暂无生产安排</p>');
   const recipe=ctx.config.RECIPES[selected];patchFarmMarkup(details,recipe?`<h3>${esc(recipe.name)} <small>仓内 ${ctx.state.inventory[recipe.id]||0} · ${duration(recipe.durationMs)}</small></h3><div class="ff-ingredients">${Object.entries(recipe.inputs).map(([id,n])=>`<span class="${(ctx.state.inventory[id]||0)<n?'ff-missing':''}">${ctx.item(id)}<span>${esc(ctx.name(id))}<strong>${ctx.state.inventory[id]||0} / ${n}</strong></span></span>`).join('')}</div><p>${esc(factoryStartCheck(ctx.state,entityId,selected,ctx.config).message||'原料齐全，拖入生产箱后才会消耗')}</p>`:'<p>选择下方配方，查看所需原料、库存和制作时间</p>');
  }updateClock();
 }
 function select(id){selected=id;refresh();}
 function commit(recipeId,allowSeedReserve=false){if(dead||busy)return;const check=factoryStartCheck(ctx.state,entityId,recipeId,ctx.config);if(!check.ok){status.textContent=check.message;return;}busy=true;try{const result=ctx.act({...check.command,...(allowSeedReserve?{allowSeedReserve:true}:{})},{sourceElement:box});status.textContent=result?.ok?'已放入生产箱，完成后到货架收取':result?.message||'未开始制作，原料未消耗';const code=result?.error?.code||result?.code||result?.error;if(!result?.ok&&code==='KEEP_SEED_RESERVE'&&!allowSeedReserve)ctx.confirm({title:'本次使用最后一份种子？',body:'<p>本批制作将用掉至少一种作物的最后一份库存。请确认田间或待收作物足够继续播种。</p><p>仅本次解除留种保护；取消不会扣料。</p>',onConfirm:()=>commit(recipeId,true)});return result;}finally{busy=false;refresh();}}
 function collect(id,source){if(dead||busy)return;const command=factoryCollectCommand(ctx.state,entityId,id);if(!command)return;busy=true;try{const result=ctx.act(command,{sourceElement:source,targetElement:cargo});const done=result?.ok&&result.delta?.events?.some(e=>e.id===id&&e.ok!==false);status.textContent=done?'成品已收入货仓':result?.message||result?.skipped?.[0]?.message||result?.delta?.skipped?.[0]?.message||'货仓空间不足，请先整理货仓';}finally{busy=false;refresh();}}
 function stop(){gesture=null;cursor.hidden=true;box.classList.remove('ff-drop-ready');overlay.classList.remove('ff-dragging');}
 const point=e=>({x:e.clientX,y:e.clientY});
 on(overlay,'pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;pointers.add(event.pointerId);if(pointers.size>1){stop();suppressClick=true;return;}const recipe=event.target.closest('[data-ff-recipe]');if(!recipe)return;select(recipe.dataset.ffRecipe);gesture={id:event.pointerId,recipeId:recipe.dataset.ffRecipe,start:point(event),active:false,rect:box.getBoundingClientRect()};overlay.setPointerCapture?.(event.pointerId);event.preventDefault();});
 on(overlay,'pointermove',event=>{const g=gesture;if(!g||g.id!==event.pointerId)return;const p=point(event);if(!g.active&&Math.hypot(p.x-g.start.x,p.y-g.start.y)<8)return;if(!g.active){g.active=true;cursor.innerHTML=ctx.item(g.recipeId);overlay.classList.add('ff-dragging');}cursor.hidden=false;cursor.style.transform=`translate(${p.x}px,${p.y}px)`;box.classList.toggle('ff-drop-ready',factoryDropInside(p,g.rect));event.preventDefault();});
 on(overlay,'pointerup',event=>{pointers.delete(event.pointerId);const g=gesture;if(!g||g.id!==event.pointerId)return;const shouldCommit=g.active&&factoryDropInside(point(event),g.rect);suppressClick=g.active;win.setTimeout(()=>{suppressClick=false;},0);stop();box.classList.remove('ff-drop-ready');if(shouldCommit)commit(g.recipeId);});
 on(overlay,'pointercancel',event=>{pointers.delete(event.pointerId);suppressClick=false;stop();});
 on(overlay,'lostpointercapture',event=>{if(gesture?.id===event.pointerId)stop();});
 on(win,'blur',()=>{pointers.clear();stop();});on(win,'resize',stop);on(doc,'visibilitychange',()=>{if(doc.hidden){pointers.clear();stop();}});
 on(overlay,'click',event=>{if(event.target.closest('.ff-close')){close();return;}if(suppressClick){suppressClick=false;return;}// Captured recipe pointers retarget click to overlay; backdrop clicks never dismiss.
 const cancel=event.target.closest('[data-ff-cancel]'),move=event.target.closest('[data-ff-job]');
 if(cancel){const job=machine()?.queue.find(j=>j.id===cancel.dataset.ffCancel&&j.startAt===null);if(job)ctx.confirm({title:'取消等待中的这一批？',body:'<p>原料会退回仓库；空间不足则保留任务。</p>',onConfirm:()=>{if(dead)return {ok:false};const result=ctx.act({type:'cancelJob',entityId,jobId:job.id});refresh();return result;}});return;}
 if(move){const ids=machine().queue.filter(j=>j.startAt===null).map(j=>j.id),from=ids.indexOf(move.dataset.ffJob),to=from+Number(move.dataset.ffDirection);if(from>=0&&to>=0&&to<ids.length){[ids[from],ids[to]]=[ids[to],ids[from]];ctx.act({type:'reorderQueue',entityId,jobIds:ids});refresh();}return;}
 const r=event.target.closest('[data-ff-recipe]'),g=event.target.closest('[data-ff-collect]');if(r)select(r.dataset.ffRecipe);else if(g)collect(g.dataset.ffCollect,g);else if(event.target.closest('.ff-box')){if(selected)commit(selected);else status.textContent='先选择一个配方';}else if(event.target.closest('.ff-edit')){close();onAction('edit');}else if(event.target.closest('.ff-upgrade')){close();onAction('upgrade-machine');}});
 on(overlay,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not(:disabled),summary')];if(event.shiftKey&&doc.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&doc.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}});
 function suspend(){if(dead||suspended)return;suspended=true;resumeFocus=doc.activeElement;pointers.clear();suppressClick=false;stop();ctx.clearFeedback?.();overlay.hidden=true;ctx.root.inert=oldInert;}
 function resume(){if(dead||!suspended)return;suspended=false;ctx.root.inert=true;overlay.hidden=false;refresh();if(resumeFocus?.isConnected&&overlay.contains(resumeFocus))resumeFocus.focus({preventScroll:true});else overlay.querySelector('.ff-close').focus();resumeFocus=null;}
 let timer,unsubscribe;function destroy(){if(dead)return;dead=true;stop();ctx.clearFeedback?.();win.clearInterval(timer);unsubscribe?.();listeners.splice(0).forEach(off=>off());overlay.remove();ctx.root.inert=oldInert;if(previous?.isConnected)previous.focus({preventScroll:true});}
 function close(){destroy();onClose();}
 unsubscribe=ctx.subscribe?.(refresh);timer=win.setInterval(refresh,1000);refresh();overlay.querySelector('.ff-close').focus();
 return {destroy,dispose:destroy,refresh,update:refresh,open:refresh,suspend,resume};
}
export const createFactoryPanel=mountFactoryPanel;
