/** Chicken coop close-up. Only ctx.act changes the farm; gestures commit per animal. */
import {patchFarmMarkup} from './farm-dom-patch.mjs';
import {createAnimalAnimationController} from './farm-animal-animation.mjs';
import {resolveShelterAnimal} from './farm-runtime-shelters.mjs';

export function coopCommand(state,entityId,animalId,mode){
 if(!['feed','collect'].includes(mode))return null;
 const shelter=state.entities.find(e=>e.id===entityId&&e.kind==='shelter');
 const animal=shelter?.animals.find(a=>a.id===animalId);
 if(!animal||animal.status!==(mode==='feed'?'hungry':'ready'))return null;
 return {type:mode==='feed'?'feed':'collectAnimal',entityId,animalIds:[animalId]};
}
export function coopBatchCommand(state,entityId,animalIds,mode){
 const ids=[...new Set(animalIds)].filter(id=>coopCommand(state,entityId,id,mode));
 return ids.length?{type:mode==='feed'?'feed':'collectAnimal',entityId,animalIds:ids}:null;
}
export function coopCrossedTargets(from,to,targets){
 if(![from?.x,from?.y,to?.x,to?.y].every(Number.isFinite))return [];
 const dx=to.x-from.x,dy=to.y-from.y;
 return targets.map((r,index)=>{if(![r.left,r.right,r.top,r.bottom].every(Number.isFinite)||r.right<=r.left||r.bottom<=r.top)return null;let lo=0,hi=1;
  for(const [p,q] of [[-dx,from.x-r.left],[dx,r.right-from.x],[-dy,from.y-r.top],[dy,r.bottom-from.y]]){
   if(!p){if(q<0)return null;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;
  }return {r,index,t:lo};
 }).filter(Boolean).sort((a,b)=>a.t-b.t||a.index-b.index).map(v=>v.r);
}
export function mountChickenCoop(ctx,{entityId,onClose=()=>{},onAction=()=>{}}){
 const doc=ctx.doc||ctx.root.ownerDocument,win=ctx.win||doc.defaultView,esc=ctx.esc||String;
 if(!doc.querySelector('link[data-farm-coop-css]')){const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./farm-coop-panel.css',import.meta.url).href;link.dataset.farmCoopCss='';doc.head.append(link);}
 const overlay=doc.createElement('section');overlay.className='fc-backdrop';overlay.setAttribute('aria-label','鸡舍');
 overlay.innerHTML='<section class="fc-panel" role="dialog" aria-modal="true" aria-label="鸡舍"><header><div><h2>鸡舍</h2><p>喂饱小鸡，收好新鲜鸡蛋</p></div><button class="fc-close" aria-label="关闭鸡舍">×</button></header><div class="fc-animals"></div><footer><button class="fc-feed" aria-label="拖动饲料袋喂鸡"></button><p class="fc-instruction">拖饲料袋经过饿了的小鸡；点鸡蛋或划过鸡蛋收取</p><div class="fc-cargo" aria-label="鸡蛋收入货仓"></div></footer><p class="fc-status" role="status" aria-live="polite"></p><div class="fc-cursor" hidden></div></section>';
 const initial=ctx.state.entities.find(e=>e.id===entityId),animalConfig=ctx.config.ANIMALS[initial.configId],product=animalConfig.product,feedItem=animalConfig.feedItem;
 overlay.setAttribute('aria-label',animalConfig.name+'舍');overlay.querySelector('[role=dialog]').setAttribute('aria-label',animalConfig.name+'舍');overlay.querySelector('h2').textContent=animalConfig.name+'舍';overlay.querySelector('.fc-close').setAttribute('aria-label','关闭'+animalConfig.name+'舍');overlay.querySelector('header p').textContent='照顾伙伴，收好新鲜产物';overlay.querySelector('.fc-instruction').textContent='拖饲料袋经过饿了的伙伴；点产物或划过产物收取';overlay.querySelector('.fc-feed').setAttribute('aria-label','拖动饲料袋喂养');overlay.querySelector('.fc-cargo').setAttribute('aria-label','产物收入货仓');
 const management=doc.createElement('div');management.className='fc-management';management.innerHTML='<button data-coop-action="adopt">领养伙伴</button><button data-coop-action="move-animal-panel">迁移伙伴</button><button data-coop-action="edit">布置设施</button><button data-coop-action="source:'+feedItem+'">制作饲料</button>';overlay.querySelector('.fc-status').before(management);
 const oldInert=ctx.root.inert,previous=doc.activeElement;ctx.root.inert=true;(ctx.root.parentElement||doc.body).append(overlay);
 const panel=overlay.querySelector('.fc-panel'),rows=overlay.querySelector('.fc-animals'),feed=overlay.querySelector('.fc-feed'),cargo=overlay.querySelector('.fc-cargo'),status=overlay.querySelector('.fc-status'),cursor=overlay.querySelector('.fc-cursor');
 let dead=false,gesture=null,keyboardFeed=false,edgeRaf=null,edgeStamp=null;const pointers=new Set(),listeners=[];
 const shelter=()=>ctx.state.entities.find(e=>e.id===entityId),animal=id=>shelter()?.animals.find(a=>a.id===id);
 const on=(node,event,fn,options)=>{node.addEventListener(event,fn,options);listeners.push(()=>node.removeEventListener(event,fn,options));};
 const animation=createAnimalAnimationController({root:rows,getAnimal:id=>({animal:animal(id),shelter:shelter()}),getStaticArt:a=>resolveShelterAnimal(a),isReduced:()=>!!ctx.state.settings.reducedMotion,isPaused:()=>dead,document:doc,requestFrame:win.requestAnimationFrame.bind(win),cancelFrame:win.cancelAnimationFrame.bind(win),matchMedia:win.matchMedia.bind(win),Image:win.Image,maxVisible:6});
 function render(){if(dead)return;const e=shelter();if(!e){close();return;}
  patchFarmMarkup(rows,e.animals.map((a,index)=>{const art=resolveShelterAnimal(a),seconds=Math.max(0,Math.ceil((a.readyAt-ctx.state.now)/1000)),label=a.status==='hungry'?'饿了':a.status==='ready'?'产物待收':`生产中 · ${Math.floor(seconds/60)}分${seconds%60}秒`;
   return `<div class="fc-animal" data-animal="${esc(a.id)}" data-shelter="${esc(entityId)}"><button type="button" class="fc-bird" data-feed-target="${esc(a.id)}" aria-label="${esc(animalConfig.name)}${index+1}，${label}"><span class="fc-shadow"></span><svg class="fw-animal-art" viewBox="0 0 360 280" aria-hidden="true"><image href="${art?.src||''}" width="360" height="280"/></svg></button>${a.status==='ready'?`<button class="fc-egg" data-egg="${esc(a.id)}" aria-label="收取${esc(animalConfig.name)}${index+1}的产物">${ctx.item(product)}<span>收取</span></button>`:`<span class="fc-animal-label">${label}</span>`}</div>`;
  }).join(''));
  patchFarmMarkup(feed,`${ctx.item(feedItem)}<span>饲料 ×${ctx.state.inventory[feedItem]||0}</span>`);feed.disabled=!(ctx.state.inventory[feedItem]>0);
  management.querySelector('[data-coop-action=adopt]').disabled=e.animals.length>=animalConfig.capacity;management.querySelector('[data-coop-action=move-animal-panel]').disabled=!e.animals.length;
  patchFarmMarkup(cargo,`${ctx.item(product)}<strong>货仓</strong><span>${esc(ctx.name(product))} ${ctx.state.inventory[product]||0}</span>`);animation.sync();
 }
 function stop(message){const g=gesture;gesture=null;stopEdgeScroll();cursor.hidden=true;overlay.classList.remove('fc-feeding');
  // Clear the gesture before releasing: lostpointercapture may fire immediately.
  if(g?.id!==undefined)try{if(overlay.hasPointerCapture?.(g.id))overlay.releasePointerCapture(g.id);}catch{}
  if(message&&g){ctx.clearFeedback?.();status.textContent=message;}
 }
 function targets(mode){const clip=rect(rows),bounds=rect(panel);return [...rows.querySelectorAll(mode==='feed'?'[data-feed-target]':'[data-egg]')].map(el=>{const r=rect(el);return {id:el.dataset.feedTarget||el.dataset.egg,el,left:Math.max(r.left,clip.left,bounds.left),right:Math.min(r.right,clip.right,bounds.right),top:Math.max(r.top,clip.top,bounds.top),bottom:Math.min(r.bottom,clip.bottom,bounds.bottom)};});}
 function rect(el){const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}
 function visit(g,p){const candidates=coopCrossedTargets(g.last,p,targets(g.mode));g.last=p;
  const fresh=candidates.filter(t=>{if(g.seen.has(t.id))return false;g.seen.add(t.id);return !!coopCommand(ctx.state,entityId,t.id,g.mode);});
  if(!fresh.length)return;
  // Same pointer event is one durable partial-success batch. Nothing waits for
  // pointerup, and core still validates each animal against the preceding result.
  const command=coopBatchCommand(ctx.state,entityId,fresh.map(t=>t.id),g.mode);
  const result=ctx.act(command,{sourceElementsById:Object.fromEntries(fresh.map(t=>[t.id,t.el])),targetElement:g.mode==='collect'?cargo:undefined});
  if(dead||gesture!==g)return;
  const successful=result?.ok?(result.delta?.events||[]).filter(e=>e.ok!==false&&fresh.some(t=>t.id===e.id)).map(e=>e.id):[];
  render();g.done+=successful.length;
  if(successful.length&&g.mode==='feed')animation.playEat(successful);
  if(!result?.ok){stop(result?.message||'当前无法操作，未消耗资源');return;}
  const skips=result.skipped||result.delta?.skipped||[];
  status.textContent=(g.mode==='feed'?`已喂 ${g.done} 只`:`已收 ${g.done} 只的产物`)+(skips.length?` · 跳过 ${skips.length} 只`:'');
 }
 const point=e=>({x:e.clientX,y:e.clientY});
 const outside=p=>{const r=rect(panel);return p.x<r.left||p.x>r.right||p.y<r.top||p.y>r.bottom;};
 function edgeDirection(){const g=gesture;if(dead||doc.hidden||!g?.active||g.mode==='feed'&&!(ctx.state.inventory[feedItem]>0))return 0;
  const p=g.last,r=rect(rows),bounds=rect(panel),left=Math.max(r.left,bounds.left),right=Math.min(r.right,bounds.right),max=Math.max(0,rows.scrollWidth-rows.clientWidth);
  if(!max||p.y<Math.max(r.top,bounds.top)-8||p.y>Math.min(r.bottom,bounds.bottom)+8||p.x<left||p.x>right)return 0;
  return p.x<left+48&&rows.scrollLeft>0?-1:p.x>right-48&&rows.scrollLeft<max?1:0;
 }
 function stopEdgeScroll(){if(edgeRaf!==null)win.cancelAnimationFrame(edgeRaf);edgeRaf=null;edgeStamp=null;}
 function updateEdgeScroll(){if(!edgeDirection()){stopEdgeScroll();return;}if(edgeRaf===null)edgeRaf=win.requestAnimationFrame(scrollAtEdge);}
 function scrollAtEdge(time){edgeRaf=null;const g=gesture,direction=edgeDirection();if(!direction){edgeStamp=null;return;}
  const dt=edgeStamp===null?0:Math.max(0,Math.min(50,time-edgeStamp));edgeStamp=time;
  const before=rows.scrollLeft,max=Math.max(0,rows.scrollWidth-rows.clientWidth);rows.scrollLeft=Math.max(0,Math.min(max,before+direction*220*dt/1000));
  // Re-read clipped target boxes after scrolling. A stationary finger visits
  // only the animal that actually moves underneath it, never hidden siblings.
  if(rows.scrollLeft!==before)visit(g,g.last);
  if(gesture===g)updateEdgeScroll();
 }
 // Track releases on the document, including non-tool touches that end outside
 // the dialog. Otherwise a stale pointer ID blocks every subsequent feed drag.
 on(doc,'pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;pointers.add(event.pointerId);if(pointers.size>1)stop('已停止，已完成的操作保留');},true);
 on(overlay,'pointerdown',event=>{
  if(event.button!==undefined&&event.button!==0||event.isPrimary===false||pointers.size>1)return;
  const start=point(event),egg=event.target.closest('[data-egg]'),bag=event.target.closest('.fc-feed');if(!egg&&!bag)return;if(bag&&feed.disabled)return;
  gesture={id:event.pointerId,mode:bag?'feed':'collect',start,last:start,seen:new Set(),done:0,active:!bag};
  // Capture the stable overlay, never an egg that a successful collect removes.
  // Document handlers remain a fallback if capture is unavailable or rejected.
  try{overlay.setPointerCapture?.(event.pointerId);}catch{}
  event.preventDefault();
  if(egg){visit(gesture,start);updateEdgeScroll();}
 },{passive:false});
 on(doc,'pointermove',event=>{const g=gesture;if(!g||g.id!==event.pointerId)return;const p=point(event);
  if(outside(p)){stop('已停止，已完成的操作保留');return;}
  if(!g.active){if(Math.hypot(p.x-g.start.x,p.y-g.start.y)<8)return;g.active=true;cursor.innerHTML=ctx.item(feedItem);overlay.classList.add('fc-feeding');}
  if(g.mode==='feed'){cursor.hidden=false;cursor.style.transform=`translate(${p.x}px,${p.y}px)`;}visit(g,p);updateEdgeScroll();event.preventDefault();
 },{capture:true,passive:false});
 on(doc,'pointerup',event=>{pointers.delete(event.pointerId);const g=gesture;if(!g||g.id!==event.pointerId)return;const p=point(event);if(outside(p)){stop('已停止，已完成的操作保留');return;}if(g.active)visit(g,p);stop();},true);
 on(doc,'pointercancel',event=>{pointers.delete(event.pointerId);if(gesture?.id===event.pointerId)stop('已停止，已完成的操作保留');},true);
 on(overlay,'lostpointercapture',event=>{if(gesture?.id===event.pointerId)stop('已停止，已完成的操作保留');});
 on(win,'blur',()=>{pointers.clear();stop('已停止，已完成的操作保留');});on(win,'resize',()=>stop('已停止，已完成的操作保留'));on(doc,'visibilitychange',()=>{if(doc.hidden){pointers.clear();stop('已停止，已完成的操作保留');}});
 on(overlay,'click',event=>{if(event.target.closest('.fc-close'))close();else if(event.target.closest('[data-coop-action]')){const action=event.target.closest('[data-coop-action]').dataset.coopAction;close();onAction(action);}else if(event.detail===0){const bag=event.target.closest('.fc-feed'),bird=event.target.closest('[data-feed-target]'),egg=event.target.closest('[data-egg]');if(bag&&!feed.disabled){keyboardFeed=true;status.textContent='已选择饲料，使用 Tab 选择饿了的伙伴并按回车喂养';}else if(egg||bird&&keyboardFeed){const target=egg||bird;gesture={mode:egg?'collect':'feed',last:pointFrom(target),seen:new Set(),done:0};visit(gesture,gesture.last);stop();}}});
 function pointFrom(el){const r=rect(el);return {x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};}
 on(overlay,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const nodes=[...overlay.querySelectorAll('button:not(:disabled)')];if(event.shiftKey&&doc.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&doc.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}});
 function destroy(){if(dead)return;dead=true;ctx.clearFeedback?.();stop();win.clearInterval(timer);unsubscribe?.();listeners.splice(0).forEach(off=>off());animation.destroy();overlay.remove();ctx.root.inert=oldInert;if(previous?.isConnected)previous.focus({preventScroll:true});}
 function close(){destroy();onClose();}
 const unsubscribe=ctx.subscribe?.(render),timer=win.setInterval(render,1000);render();overlay.querySelector('.fc-close').focus();return {destroy,refresh:render};
}

export const mountAnimalFarm=mountChickenCoop;
