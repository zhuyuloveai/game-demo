/** Production scene adapter: every economic transition goes through the durable store. */
import * as config from './farm-config.mjs';
import * as core from './farm-core.mjs';
import * as layout from './farm-layout.mjs';
import * as save from './farm-save.mjs';
import * as stages from './farm-stage-data.mjs';
import {FARM_ASSETS,farmAsset,farmAssetUrl} from './farm-assets.mjs';
import {mountFarmDelight} from './farm-delight.mjs';
import {mountWorldScene} from './farm-scene-world.mjs';
import {mountTradeScene} from './farm-scene-trade.mjs';
import {mountManagementScene} from './farm-scene-management.mjs';
export const escapeScene=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles={P01:'我的农场',P02:'田间播种',P03:'果树',P04:'动物伙伴',P05:'生产加工',P06:'建筑落脚',P07:'商店',P08:'仓库',P09:'邻里货架',P10:'我的摊位',P11:'卡车订单',P12:'开垦土地',P13:'成长手记',P14:'牧场故事',P15:'故事牌局',P16:'布置农场',P17:'设置与帮助',P18:'种子补给',P19:'装点农场'};
const worldIds=new Set(['P01','P02','P03','P04','P05','P06','P12','P16']);
const tradeIds=new Set(['P07','P08','P09','P10','P11']);
const paths=new Set(FARM_ASSETS.map(a=>a.path));
export function farmSourceRoute(itemId,state){
 const field=state.entities.find(e=>e.kind==='field'&&e.crop?.itemId===itemId&&e.crop.readyAt<=state.now)||state.entities.find(e=>e.kind==='field'&&!e.crop)||state.entities.find(e=>e.kind==='field'&&e.crop?.itemId===itemId)||state.entities.find(e=>e.kind==='field');
 if(config.CROPS[itemId])return {id:'P02',focusItem:itemId,focusEntity:field?.id};
 if(config.FRUITS[itemId])return {id:'P03',focusItem:itemId,focusEntity:state.entities.find(e=>e.kind==='fruit'&&e.configId===itemId)?.id};
 const animal=Object.values(config.ANIMALS).find(a=>a.product===itemId);
 if(animal)return {id:'P04',focusItem:itemId,focusEntity:state.entities.find(e=>e.kind==='shelter'&&e.configId===animal.id)?.id};
 const recipe=Object.values(config.RECIPES).find(r=>r.outputs?.[itemId]);
 if(recipe)return {id:'P05',focusItem:itemId,focusRecipe:recipe.id,focusEntity:state.entities.find(e=>e.kind==='machine'&&e.machineType===recipe.machineType)?.id};
 return null;
}
/** Authoritative successful crop events only; never infer success from a command. */
export function committedCropFeedback(before,command,result){
 if(!result?.ok||!['plant','harvest'].includes(command.type))return [];
 const byId=new Map(before.entities.map(e=>[e.id,e]));
 return (result.delta?.events||[]).filter(event=>event.ok&&(byId.get(event.id)?.kind==='field'||command.type==='harvest'&&byId.get(event.id)?.kind==='fruit')).map(event=>({entityId:event.id,itemId:command.type==='plant'?command.itemId||command.cropId:byId.get(event.id).crop?.itemId||byId.get(event.id).configId,action:command.type})).filter(event=>event.itemId);
}
export function committedAnimalFeedback(before,command,result){
 if(!result?.ok||!['feed','collectAnimal'].includes(command.type))return [];
 const shelter=before.entities.find(e=>e.id===command.entityId&&e.kind==='shelter'),animalConfig=config.ANIMALS[shelter?.configId];
 if(!animalConfig)return [];
 return (result.delta?.events||[]).filter(event=>event.ok&&shelter.animals.some(a=>a.id===event.id)).map(event=>({entityId:event.id,itemId:command.type==='feed'?animalConfig.feedItem:animalConfig.product,action:command.type}));
}
export function committedMachineFeedback(before,command,result){
 if(!result?.ok||command.type!=='collectMachine')return [];
 const machine=before.entities.find(e=>e.id===command.entityId&&e.kind==='machine');
 const jobs=new Map((machine?.completed||[]).map(job=>[job.id,job]));
 return (result.delta?.events||[]).filter(event=>event.ok&&jobs.has(event.id)).flatMap(event=>Object.entries(jobs.get(event.id).outputs||{}).filter(([,count])=>count>0).map(([itemId])=>({entityId:event.id,itemId,action:'collectMachine'})));
}
/** Resolve batch feedback by committed target ID, never by DOM order. */
export function feedbackSourceElement(feedback,id){
 const keyed=feedback.sourceElementsById||feedback.sourceElements;
 return (keyed instanceof Map?keyed.get(id):keyed?.[id])||feedback.sourceElement||null;
}
export function mountFarm({root,store,onExit=()=>{},onStartStage=()=>{},getMusicVolume=()=>.35,onMusicVolumeChange=()=>{},onSound=()=>{},profile=null}){
 const doc=root.ownerDocument,win=doc.defaultView,cleanups=new Set(),refreshers=new Set(),deactivators=new Set(),confirmClosers=new Set(),confirmResumers=new Set();let destroyed=false,active=true,lastResult=null;
 // The store already emits detached snapshots. Keep one read-only presentation
 // snapshot per notification instead of deep-cloning the entire farm on every
 // ctx.state access (including every animal animation frame).
 const freezeSnapshot=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeSnapshot(child);Object.freeze(value);}return value;};
 let snapshot=freezeSnapshot(store.getState());
 const readSnapshot=value=>{snapshot=freezeSnapshot(value??store.getState());};
 const refreshScenes=()=>{for(const render of [...refreshers])render();};
 root.classList.add('farm-scenes');root.innerHTML='<div class="farm-scene-base"></div><div class="farm-scene-feedback" role="status" aria-live="polite" aria-atomic="true"></div><div class="farm-scene-save-warning" hidden></div>';
 for(const [file,key] of [[new URL('./farm-coop-panel.css',import.meta.url).href,'farmCoopCss'],[new URL('./farm-factory-panel.css',import.meta.url).href,'farmFactoryCss']])if(!doc.querySelector('link[data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+']')){const link=doc.createElement('link');link.rel='stylesheet';link.href=file;link.dataset[key]='';doc.head.append(link);}
 const base=root.querySelector('.farm-scene-base'),feedback=root.querySelector('.farm-scene-feedback'),warning=root.querySelector('.farm-scene-save-warning');
 const delight=mountFarmDelight(root,{reducedMotion:snapshot.settings.reducedMotion});
 const name=id=>({coin:'金币',construction_voucher:'建设券',material_choice_voucher:'材料补给券',xp:'经验'})[id]||config.ITEMS[id]?.name||config.CROPS[id]?.name||config.FRUITS[id]?.name||config.BUILDINGS[id]?.name||config.ANIMALS[id]?.name||config.DECORATIONS[id]?.name||id;
 const asset=path=>paths.has(path)?new URL(`./assets/farm/${path}`,import.meta.url).href:farmAssetUrl(path);
 const say=text=>{feedback.textContent=String(text??'');};
 function confirm(options){
  for(const fn of deactivators)fn('confirm');
  const blocked=[...root.querySelectorAll('.farm-scene-base,.farm-scene-layer')].map(el=>({el,inert:el.inert}));for(const {el} of blocked)el.inert=true;
  const previous=doc.activeElement,overlay=doc.createElement('div');overlay.className='farm-scene-confirm-backdrop';
  overlay.innerHTML='<section class="farm-scene-confirm" role="dialog" aria-modal="true" aria-label="'+escapeScene(options.title||'确认操作')+'"><h2>'+escapeScene(options.title||'确认操作')+'</h2><div>'+String(options.body||'')+'</div><footer><button data-no>取消</button><button data-yes>确认</button></footer></section>';root.append(overlay);
  let busy=false;const close=()=>{overlay.remove();for(const {el,inert} of blocked)el.inert=inert;confirmClosers.delete(close);cleanups.delete(close);if(active&&!destroyed)for(const resume of [...confirmResumers])resume();for(const render of refreshers)render();if(previous?.isConnected)previous.focus({preventScroll:true});};cleanups.add(close);confirmClosers.add(close);
  overlay.querySelector('[data-no]').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close();};
  overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const b=overlay.querySelectorAll('button');if(e.shiftKey&&doc.activeElement===b[0]){e.preventDefault();b[b.length-1].focus();}else if(!e.shiftKey&&doc.activeElement===b[b.length-1]){e.preventDefault();b[0].focus();}}};
  overlay.querySelector('[data-yes]').onclick=async()=>{if(busy)return;busy=true;const b=overlay.querySelector('[data-yes]');b.disabled=true;try{const r=await options.onConfirm?.();if(r?.ok===false){say(r.message||r.error?.message||'操作未完成');busy=false;b.disabled=false;return;}close();}catch(e){say(e.message);busy=false;b.disabled=false;}};
  overlay.querySelector('[data-no]').focus();return close;
 }
 function mount(ctx){return (worldIds.has(ctx.id)?mountWorldScene:tradeIds.has(ctx.id)?mountTradeScene:mountManagementScene)(ctx);}
 function context(id,target,options={},ownerCleanups=cleanups){
  const localDeactivators=new Set();
  const ctx={...options,id,root:target,doc,win,profile,config,core,layout,save,stages,store,preserveState:true,
   get effectsPaused(){return !active||doc.hidden||target.inert||!!target.closest('[inert]');},refreshPresentation(){delight.refresh();},
   get state(){return snapshot;},get camera(){return snapshot.camera;},
   asset,assetMeta:farmAsset,art:(id,v,c)=>farmAssetUrl(id,v,c),name,esc:escapeScene,
   img:(p,alt='',cls='')=>'<img src="'+asset(p)+'" alt="'+escapeScene(alt)+'" class="'+escapeScene(cls)+'" draggable="false">',
   item:(id,cls='item-art')=>'<img src="'+farmAssetUrl(id)+'" alt="'+escapeScene(name(id))+'" class="'+escapeScene(cls)+'" draggable="false">',
   say,confirm,getMusicVolume,onMusicVolumeChange,exitFarm:onExit,startStage:onStartStage,
   clearFeedback(){delight.clear();},
   act(command,feedback={}){
    const hasSources=!!(feedback.sourceElement||feedback.sourceElementsById||feedback.sourceElements);
    const before=snapshot,cropCommand=['plant','harvest'].includes(command.type),animalCommand=['feed','collectAnimal'].includes(command.type)&&hasSources,machineCommand=command.type==='collectMachine'&&hasSources,sources=new Map();
    // Capture real positions before synchronous store subscribers can patch the DOM.
    const capture=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    let destination=null;
    if(cropCommand||animalCommand||machineCommand){
     const nodeFor=key=>key?target.querySelector('[data-entity='+JSON.stringify(String(key))+']'):null;
     for(const key of command.jobIds||command.animalIds||command.entityIds||command.ids||(command.entityId?[command.entityId]:[])){
      const source=feedback.sourcePoint?{left:feedback.sourcePoint.x,top:feedback.sourcePoint.y,width:0,height:0}:capture(feedbackSourceElement(feedback,key)||nodeFor(key));if(source)sources.set(key,source);
     }
     const silo=before.entities.find(e=>e.kind===(animalCommand||machineCommand?'barn':'silo')&&!e.stored),el=feedback.targetElement||nodeFor(silo?.id);
     if(el){const r=capture(el),view=capture(feedback.targetElement?root:el.closest?.('.fw-map')||target);if(r?.width&&r?.height&&r.left<view.right&&r.right>view.left&&r.top<view.bottom&&r.bottom>view.top)destination=r;}
    }
    const r=store.dispatch(command);lastResult=r;
    if(!r.ok){say(r.message||'未保存，本次操作未执行');onSound('soft-error');return r;}
    say(''); // A successful retry must not leave an earlier error over the world.
    const cue=({plant:'plant',harvest:'harvest',feed:'feed',collectAnimal:'harvest',collectMachine:'harvest',listNpcStall:'coin',deliverOrder:'coin'})[command.type];
    const skipped=r.skipped||r.delta?.skipped||[],changed=!(skipped.length&&!r.delta?.events?.length);
    if(cue&&changed){
     onSound(cue);
     const cropEvents=machineCommand?committedMachineFeedback(before,command,r):animalCommand?committedAnimalFeedback(before,command,r):committedCropFeedback(before,command,r);
     if((cropCommand||animalCommand||machineCommand)&&cropEvents.length){for(const event of cropEvents){const source=sources.get(event.entityId);if(source)delight.play(event.action,{sourceElements:[source],targetElement:destination,itemId:event.itemId,committed:true,crop:cropCommand&&before.entities.find(e=>e.id===event.entityId)?.kind==='field'});}}
     else if(!animalCommand&&!machineCommand&&(!cropCommand||!before.entities.some(e=>(command.entityIds||command.ids||[command.entityId]).includes(e.id)&&e.kind==='field')))delight.play(cue,{itemId:command.itemId});
    }
    if(r.state.level>before.level)onSound('upgrade');return r;
   },
   subscribe(fn){const render=()=>{if(active&&!target.inert&&!target.closest?.('[inert]'))fn(snapshot,lastResult);};refreshers.add(render);const stop=()=>{refreshers.delete(render);ownerCleanups.delete(stop);};ownerCleanups.add(stop);return stop;},
   onConfirmClosed(fn){confirmResumers.add(fn);const off=()=>{confirmResumers.delete(fn);ownerCleanups.delete(off);};ownerCleanups.add(off);return off;},
   onExit(fn){ownerCleanups.add(fn);return()=>ownerCleanups.delete(fn);},
   onDeactivate(fn){deactivators.add(fn);localDeactivators.add(fn);const off=()=>{deactivators.delete(fn);localDeactivators.delete(fn);};ownerCleanups.add(off);return off;},
   saveCamera(camera){queueMicrotask(()=>{if(store.readOnly)return;const old=snapshot.camera;if(JSON.stringify(old)!==JSON.stringify(camera))store.dispatch({type:'setCamera',camera});});},
   restoreDefaultSkin(entityId){return ctx.act({type:'setSkin',entityId,skinId:null});},
   openSource(itemId){const route=farmSourceRoute(itemId,snapshot);if(!route){say(name(itemId)+'可通过商店、订单或成长奖励获得。');return false;}return ctx.openScene(route.id,route);},
   openChapter(target){return ctx.openScene(target);},
   openScene(next,opts={}){
    if(!titles[next]){say('此入口暂不可用');return false;}
    for(const fn of localDeactivators)fn();
    const layer=doc.createElement('section'),header=doc.createElement('header'),back=doc.createElement('button'),title=doc.createElement('span'),home=doc.createElement('button'),content=doc.createElement('div'),owned=new Set(),previous=doc.activeElement;
    layer.className='farm-scene-layer';header.className='farm-scene-layer-header';content.className='farm-scene-layer-content';back.textContent='← 返回原操作';back.type='button';title.textContent=titles[next];home.type='button';home.className='farm-scene-home';home.textContent='⌂ 回首页';home.setAttribute('aria-label','返回小院首页');home.onclick=()=>ctx.exitFarm();header.append(back,title,home);layer.append(header,content);target.inert=true;root.append(layer);let closed=false;
    const close=()=>{if(closed)return;closed=true;for(const fn of [...owned])fn();owned.clear();layer.remove();target.inert=false;ownerCleanups.delete(close);if(previous?.isConnected)previous.focus({preventScroll:true});opts.onReturn?.();for(const render of refreshers)render();};
    back.onclick=close;ownerCleanups.add(close);const child=context(next,content,{...opts,returnToOrigin:close},owned);
    try{const dispose=mount(child);if(typeof dispose==='function')owned.add(dispose);back.focus({preventScroll:true});return true;}catch(e){close();say('未能打开：'+e.message);return false;}
   }
  };return ctx;
 }
 function status(){const s=store.getStatus();delight.setReducedMotion(snapshot.settings.reducedMotion);warning.hidden=!s.readOnly&&!s.error&&!s.recoveryRequired;warning.replaceChildren();if(!warning.hidden){const text=doc.createElement('span');text.textContent=s.message||(s.readOnly?'当前为只读，未执行的操作不会扣除资源。':'存档需要处理。');const button=doc.createElement('button');button.textContent='存档与接管';button.onclick=()=>rootCtx.openScene('P17');warning.append(text,button);}}
 const off=store.subscribe(value=>{if(destroyed)return;readSnapshot(value);status();refreshScenes();});
 const rootCtx=context('P01',base);const dispose=mount(rootCtx);if(typeof dispose==='function')cleanups.add(dispose);status();
 return {refresh(){readSnapshot();status();refreshScenes();},setActive(value){active=!!value;if(!value){for(const fn of deactivators)fn();for(const close of [...confirmClosers])close();}root.dataset.active=String(active);delight.pause(!active);if(active)for(const render of refreshers)render();},destroy(){destroyed=true;off();for(const fn of [...cleanups])fn();cleanups.clear();refreshers.clear();confirmResumers.clear();delight.destroy();root.replaceChildren();}};
}
