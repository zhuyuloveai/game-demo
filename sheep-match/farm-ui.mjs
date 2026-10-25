/** Independent accessible orthographic farm UI. Economic changes are store commands only. */
import {FARM_CONFIG,ITEMS,CROPS,FRUITS,ANIMALS,BUILDINGS,RECIPES,DECORATIONS,REWARD_DECORATIONS,COSMETICS,decorationConfig,TOOLS,LEVELS,fieldAllowance} from './farm-config.mjs';
import * as Economy from './farm-core.mjs';
import {beginLayout,validateLayout,getFootprint,isCellOpen,canExpandLand,LAND_PATCHES,isFixedEntity,canStoreEntity} from './farm-layout.mjs';
import {createFarmStroke,extendFarmStroke,cancelFarmStroke,finishFarmStroke,previewFarmStroke,farmPointFromWorldRect,farmCameraAfterScroll,finishFarmToolDrop,isFarmToolTap,farmToolExitPoint} from './farm-gestures.mjs';
import {farmAssetUrl,farmAnimalUrl,FARM_ART_CREDITS} from './farm-assets.mjs';
import {farmMachineVisual,farmAnimalVisual} from './farm-visuals.mjs';
import {mountFarmDelight,delightAnimalActivity} from './farm-delight.mjs';
const TILE=48,WORLD=64*TILE;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=value=>esc(JSON.stringify(value));
const name=id=>ITEMS[id]?.name||BUILDINGS[id]?.name||ANIMALS[id]?.name||DECORATIONS[id]?.name||REWARD_DECORATIONS[id]?.name||({field:'田地',road:'道路',house:'牧场小屋',barn:'货仓',silo:'粮仓',natural_tree:'自然树',natural_bush:'自然灌木',rock:'石堆'}[id])||id;
const values=obj=>Object.values(obj||{});
const clone=value=>structuredClone(value);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const icon=(id,extra='')=>`<img class="farm-icon ${extra}" src="${esc(farmAssetUrl(id))}" alt="" draggable="false">`;
const itemImage=id=>`<img class="farm-large-art" src="${esc(farmAssetUrl(id))}" alt="" draggable="false">`;
const cmdButton=(label,command,options='')=>`<button type="button" data-command="${json(command)}" data-command-kind="${esc(command.type)}" ${options}>${label}</button>`;
const button=(label,action,options='')=>`<button type="button" data-action="${esc(action)}" ${options}>${label}</button>`;
const pill=text=>`<span class="farm-chip">${esc(text)}</span>`;
// Small hand-drawn UI accents; no additional image request or economic state.
const doodle=(kind,extra='')=>{
  const shapes={
    seed:'<path d="m18 17 5-8h18l5 8-5 8c10 7 13 19 7 27-4 6-28 6-32 0-6-8-3-20 7-27Z" fill="#ecd399"/><path d="M23 25h18M24 17l3 8m13-8-3 8"/><path d="M32 46V35m0 4c-10 0-11-9-11-9 10-1 12 6 11 9Zm0-2c0-8 10-10 10-10s1 10-10 10Z" fill="#98b872" stroke="#5d7847"/>',
    basket:'<path d="M17 29c0-23 30-23 30 0" fill="none"/><path d="m10 28 6 26h32l6-26Z" fill="#dab47b"/><path d="M10 28h44M16 38h32M19 47h26M25 30l2 24m12-24-2 24"/><path d="M29 27c-9-8-2-20 6-13 8-8 16 2 8 13" fill="#edb678"/><path d="m33 16 4-9m-1 8c-6 0-9-4-9-4" stroke="#6e904f"/>',
    hand:'<path d="m16 35 3-14c1-5 7-4 7 1V13c0-6 7-6 7 0v8-10c0-5 7-5 7 0v12-6c0-5 7-5 7 1v20l4-7c3-5 9-2 6 4l-9 17c-5 8-27 6-30-3l-7-9c-4-6 1-10 5-5Z" fill="#f6d7a6"/>',
    tools:'<path d="m16 48 28-30" stroke="#b18557" stroke-width="9"/><path d="m32 10 9 9 10 8c8-12 0-21-9-19Z" fill="#adb6a1"/><path d="m17 12 35 38" stroke="#bf9361" stroke-width="8"/><path d="m10 9 13 2 3 13-9 8-10-9Z" fill="#e7d2a6"/>',
    flower:'<path d="M32 56V31m0 17c-16 0-17-11-17-11 15-1 17 11 17 11Zm0-5c1-13 16-13 16-13s0 13-16 13Z" fill="#91b276" stroke="#5b7d49"/><path d="M32 17c-8-19-25-3-13 7-20 2-13 23 4 16 2 19 23 14 20-2 18 5 23-16 6-21-2-17-19-16-17 0Z" fill="#fff4c6"/><circle cx="32" cy="27" r="9" fill="#e6ad57"/>',
    sheep:'<path d="M17 48v8m27-8v8"/><path d="M17 44C2 38 8 25 14 25 6 12 23 7 27 14 32 2 44 8 44 15 60 10 63 29 53 33c8 16-14 24-23 17-8 6-17 1-13-6Z" fill="#fff9e8"/><path d="M22 29c0-14 24-14 24 0v9c0 15-24 15-24 0Z" fill="#ddc4a0"/><circle cx="29" cy="32" r="1.5" fill="#725940"/><circle cx="40" cy="32" r="1.5" fill="#725940"/><path d="m31 39 3 2 3-2" fill="none"/>'
  };
  return `<svg class="farm-doodle ${extra}" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="#785c40" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${shapes[kind]||shapes.flower}</svg>`;
};
const guideNote=(title,body,id=title)=>`<details class="farm-guide-note" data-guide="${esc(id)}"><summary>${esc(title)}</summary><div class="farm-reading">${body}</div></details>`;
const intro=(title,text,kind='flower')=>`<div class="farm-panel-intro">${doodle(kind)}<div><strong>${esc(title)}</strong><p>${text}</p></div></div>`;

const duration=ms=>{
  const seconds=Math.max(0,Math.ceil(ms/1000));
  if(seconds<60)return `${seconds}秒`;
  if(seconds<3600)return `${Math.floor(seconds/60)}分${seconds%60?`${seconds%60}秒`:''}`;
  if(seconds<86400)return `${Math.floor(seconds/3600)}小时${Math.floor(seconds%3600/60)?`${Math.floor(seconds%3600/60)}分`:''}`;
  return `${Math.floor(seconds/86400)}天${Math.floor(seconds%86400/3600)}小时`;
};
const timer=(readyAt,now,label='剩余')=>`<span data-ready-at="${readyAt}" data-timer-label="${label}">${label}${duration(readyAt-now)}</span>`;
const decorIds={
  sign:'wood-sign',
  flowerpot:'flower-pot',
  haystack:'hay-bales',
  stone_stool:'stone-seat',
  flagpole:'flag',
  flower_fence:'flower-fence',
  wood_fence:'wood-fence',
  water_trough:'trough',
  flowerbed:'flower-bed',
  statue:'stone-statue',
  picnic_mat:'picnic',
  decor_flag:'meadow-banner',
  decor_windmill:'festival-windmill',
  decor_memorial:'land-memorial',
  decor_bridge:'reward-bridge'
};
function decorAssetId(id){
  if(id.startsWith('badge_')){
    const keys=['fieldHarvests','machineBatches','feeds','trucks','npcSales','storageUpgrades','landExpansions','machineTypes','layoutSaves','stageVictories'],match=id.match(/^badge_(.+)_([123])$/);
    if(match)return `decor.badge.g${String(keys.indexOf(match[1])+1).padStart(2,'0')}-${['bronze','silver','gold'][Number(match[2])-1]}`;
  }
  return `decor.${decorIds[id]||id.replaceAll('_','-')}`;
}
export function farmCropPhase(crop,now) {
  if(!crop)return 'empty';
  if(now>=crop.readyAt)return 'ripe';
  return now-crop.plantedAt>=(crop.readyAt-crop.plantedAt)/2?'grown':'sprout';
}
function entityArt(e,now){
  if(e.kind==='road')return farmAssetUrl('terrain.road.f');
  if(e.kind==='field')return e.crop?farmAssetUrl(e.crop.itemId,farmCropPhase(e.crop,now),'crop'):farmAssetUrl('terrain.field.empty');
  if(e.kind==='fruit')return farmAssetUrl(e.configId,({ready:'fruit_ready',growing:'growing',revive:'wilt_help',withered:'wilt_final'})[e.status]||'young','fruit_plant');
  if(e.kind==='decoration')return farmAssetUrl(decorAssetId(e.configId));
  if(e.kind==='obstacle')return farmAssetUrl(e.configId==='rock'?'terrain.rocks.0':`terrain.${e.configId.replaceAll('_','.')}`);
  if(e.kind==='shelter')return farmAssetUrl(`${e.configId}_shelter${e.skinId?'_floral':''}`,e.skinId?'floral':'base','building');
  return farmAssetUrl(e.kind==='house'?'Farmhouse':e.configId,'base','building');
}
function entityName(e){
  return e.kind==='shelter'?`${name(e.configId)}舍`:e.kind==='fruit'?`${name(e.configId)}${FRUITS[e.configId]?.clearTool==='axe'?'灌木':'树'}`:name(e.configId);
}
function readyCount(e,now){
  if(e.kind==='field')return e.crop?.readyAt<=now?1:0;
  if(e.kind==='fruit')return e.status==='ready'?1:0;
  if(e.kind==='shelter')return e.animals.filter(a=>a.status==='ready').length;
  if(e.kind==='machine')return !e.built&&e.buildReadyAt<=now?1:e.completed.length;
  return 0;
}
function entityStatus(e,now){
  if(e.kind==='field')return !e.crop?'空田':e.crop.readyAt<=now?'可以收获':`${name(e.crop.itemId)} · ${duration(e.crop.readyAt-now)}`;
  if(e.kind==='fruit')return ({ready:'可以采收',growing:`${duration(e.readyAt-now)}后成熟`,revive:'需要园丁帮忙',withered:'已经枯萎'})[e.status];
  if(e.kind==='shelter')return `${e.animals.length}/${ANIMALS[e.configId].capacity}只 · ${e.animals.filter(a=>a.status==='hungry').length}待喂`;
  if(e.kind==='machine')return !e.built?(e.buildReadyAt<=now?'建造完成':`建造 ${duration(e.buildReadyAt-now)}`):e.completed.length?`${e.completed.length}批待领`:e.queue.length?`加工中 · ${e.queue.length}/${e.slots}槽`:'等你开工';
  return '';
}
function used(s,storage){
  return Economy.storageUsed(s,storage);
}
export {traceFarmSegment} from './farm-gestures.mjs';
export function farmChangeMessage(result){
  const d=result.delta||{};
  const parts=[];
  if(d.coins)parts.push(`${d.coins>0?'+':''}${d.coins}金币`);
  if(d.xp)parts.push(`+${d.xp}经验`);
  if(d.vouchers)parts.push(`建设券${d.vouchers>0?'+':''}${d.vouchers}`);
  for(const [id,q]of Object.entries(d.items||{}))if(q)parts.push(`${name(id)}${q>0?'+':''}${q}`);
  return parts.join('，');
}

export function mountFarm({root,store,onExit=()=>{},onStartStage=()=>{},getMusicVolume=()=>0.5,onMusicVolumeChange=()=>{},onSound=()=>{}}){
  if(!root||!store?.getState)throw new Error('农场界面缺少存档容器');
  const ui={
    mode:'pan',
    cropId:'wheat',
    panel:null,
    panelTab:'',
    entityId:null,
    selected:null,
    draft:null,
    undo:[],
    redo:[],
    placing:null,
    confirm:null,
    previousPanel:null,
    pointers:new Map(),
    gesture:null,
    stroke:null,
    zoom:1,
    camera:{x:0,y:0},
    destroyed:false,
    busy:false,
    lastMessage:'种下一点期待，收获满满的小确幸。选种子后划过空田吧！',
    toastTimer:null,
    draftTimer:null,
    feedSpecies:null,
    edgeStart:0,
    lastFrame:0
  };
  let s=store.getState();
  root.innerHTML=`<section class="farm-app" data-hud="compact" aria-label="羊羊牧场经营" data-reduced-motion="${!!s.settings?.reducedMotion}"><header class="farm-header"></header><div class="farm-error-bar" role="alert" hidden></div><div class="farm-viewport" role="region" aria-label="64乘64格牧场地图，方向键移动地图，固定按钮和田地列表可替代手势" tabindex="0" data-mode="pan"><div class="farm-world"><div class="farm-land-layer"></div><div class="farm-entities"></div></div><div class="farm-map-label"></div><div class="farm-object-tools" role="group" aria-label="物件快捷工具" hidden></div><div class="farm-camera-tools"><div class="farm-camera-popover" id="farm-camera-popover" role="group" aria-label="缩放与回田" hidden>${button(icon('ui.zoom_in'),'zoom-in','aria-label="放大地图" class="farm-icon-only"')}${button(icon('ui.zoom_out'),'zoom-out','aria-label="缩小地图" class="farm-icon-only"')}${button('回田','center','aria-label="回到田地中心"')}</div>${button(icon('ui.zoom_in'),'camera-menu','aria-label="地图工具，展开缩放与回田" aria-controls="farm-camera-popover" aria-expanded="false" class="farm-icon-only farm-camera-toggle"')}</div></div><div class="farm-status" role="status" aria-live="polite"></div><nav class="farm-toolbar" aria-label="地图操作模式"></nav><div class="farm-overlay" hidden><section class="farm-panel" role="dialog" aria-modal="true" aria-labelledby="farm-panel-title"><div class="farm-panel-head"></div><div class="farm-panel-content"></div></section></div><div class="farm-toast" aria-live="polite"></div><div class="farm-effect-layer" data-farm-effect-layer aria-hidden="true"></div><div class="farm-drag-tool" aria-hidden="true" hidden></div></section>`;
  const app=root.querySelector('.farm-app'),view=app.querySelector('.farm-viewport'),world=app.querySelector('.farm-world'),entityLayer=app.querySelector('.farm-entities'),landLayer=app.querySelector('.farm-land-layer'),overlay=app.querySelector('.farm-overlay'),content=app.querySelector('.farm-panel-content');
  const abort=new AbortController(),listen=(target,event,fn,options={})=>target.addEventListener(event,fn,{...options,signal:abort.signal});
  const now=()=>s.now;
  const delight=mountFarmDelight(app,{reducedMotion:!!s.settings?.reducedMotion,enabled:true});
  const syncDelightVisibility=()=>delight.pause(!!ui.inactive||root.hidden||document.hidden);
  const hiddenObserver=new MutationObserver(syncDelightVisibility);
  hiddenObserver.observe(root,{attributes:true,attributeFilter:['hidden']});
  listen(document,'visibilitychange',syncDelightVisibility);
  function status(message,error=false){
    ui.lastMessage=message;
    const el=app.querySelector('.farm-status');
    el.textContent=message;
    el.classList.toggle('is-error',error);
    el.classList.toggle('is-visible',!!ui.stroke);
    if(!ui.stroke&&message)toast(message);
  }
  function toast(message){
    const el=app.querySelector('.farm-toast');
    el.textContent=message;
    clearTimeout(ui.toastTimer);
    ui.toastTimer=setTimeout(()=>{
        el.textContent='';
      },4200);
  }
  async function dispatch(command,{success,close=false}={}){
    if(ui.busy)return {ok:false};
    if(ui.mode==='layout'&&!['applyLayout','saveLayoutSlot','setSettings'].includes(command.type)){
      toast('布置期间仅调整位置，请先保存或取消布置');
      return {ok:false};
    }
    ui.busy=true;
    const beforeLevel=s.level;
    const sourceIds=command.entityIds||[command.entityId||ui.entityId].filter(Boolean);
    const sourceElements=sourceIds.slice(0,8).map(id=>entityLayer.querySelector(`[data-entity="${CSS.escape(id)}"]`)?.getBoundingClientRect()).filter(Boolean);
    try{
      const result=await store.dispatch(command);
      if(result?.ok===false){
        const error=result.message||result.error?.message||(typeof result.error==='string'?result.error:'操作未执行');
        const code=result.error?.code||result.code||result.error;
        playCue('soft-error');
        if(code==='KEEP_SEED_RESERVE'&&!command.allowSeedReserve){
          ask('解除本次留种保护？','这次操作会用掉至少一种作物的最后一份库存。请确认在田或待收资产足够继续种植；这不会更改后续操作的默认保护。',()=>dispatch({...command,allowSeedReserve:true},{success,close}),'本次全部使用');
        } else{
          status(error,true);
        }
        return result;
      }
      s=store.getState();
      if(command.type==='feed'||command.type==='collectAnimal'){
        const start=performance.now(),state=command.type==='feed'?'eat':'collect';
        for(const event of result.delta?.events||[])animalEffects.set(event.id,{state,start,until:start+(state==='eat'?3000:500)});
      }
      if(close)closePanel();
      const message=success||farmChangeMessage(result)||'好啦，已经保存';
      status(message);
      const cue=({
          plant:'sow',
          harvest:'harvest',
          feed:'feed',
          enqueue:'processing',
          sell:'sale',
          claimStall:'sale',
          collectAnimal:'harvest',
          collectMachine:'harvest'
        })[command.type];
      if(cue)playCue(cue);
      else if(['submitOrder','claimReward'].includes(command.type))playCue('coin');
      else if(command.type==='completeBuilding')playCue('product-ready');
      render();
      const itemId=Object.entries(result.delta?.items||{}).find(([,quantity])=>quantity>0)?.[0]||command.itemId;
      const visual=({plant:'plant',harvest:'harvest',feed:'feed',collectAnimal:'collectAnimal',collectMachine:'collectMachine',sell:'sale',claimStall:'coins',submitOrder:'coins',upgradeStorage:'upgrade',upgradeMachine:'upgrade',upgradeStall:'upgrade',completeBuilding:'complete',reviveTree:'revive',claimReward:'collect',buy:'complete'})[command.type];
      if(visual)delight.play(s.level>beforeLevel?'upgrade':visual,{sourceElements,itemId,count:result.delta?.events?.length||1,targetElement:app.querySelector(result.delta?.coins>0?'.farm-stat-coins':`[data-action="storage:${ITEMS[itemId]?.storage||'barn'}"]`)});
      if(s.level>beforeLevel||command.type.startsWith('upgrade'))playCue('upgrade');
      return result;
    }catch(error){
      playCue('soft-error');
      status(error.message||'未执行，请重试',true);
      return {ok:false,error};
    }finally{
      ui.busy=false;
    }
  }
  const animalEffects=new Map();
  const reducedMotionQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reduceAnimalMotion=()=>!!s.settings?.reducedMotion||!!reducedMotionQuery?.matches;
  function playCue(id){
    if(root.hidden||document.hidden||s.settings?.sound===false)return;
    onSound(({sow:'plant',sale:'coin',processing:'button'})[id]||id);
  }
  function setMusic(){ /* The application owns the one background music player. */ }
  function animalMarkup(animal,rotation=0,className='') {
    const visual=farmAnimalVisual(animal,{time:performance.now(),rotation,reducedMotion:reduceAnimalMotion(),transient:animalEffects.get(animal.id),activity:delightAnimalActivity(animal.id,performance.now(),{reducedMotion:reduceAnimalMotion(),eligible:animal.status!=='ready'})});
    return `<img class="${className} farm-animal-frame" src="${esc(visual.src)}" data-animal-id="${esc(animal.id)}" data-animal-rotation="${rotation}" data-animal-state="${visual.state}" data-mirror="${visual.mirror}" alt="" draggable="false">`;
  }
  function updateAnimalAnimations() {
    if(ui.destroyed||root.hidden||document.hidden)return;
    const time=performance.now(),reducedMotion=reduceAnimalMotion();
    const animals=new Map(s.entities.filter(e=>e.kind==='shelter').flatMap(e=>e.animals.map(animal=>[animal.id,animal])));
    for(const [id,effect] of animalEffects)if(time>=effect.until)animalEffects.delete(id);
    for(const img of app.querySelectorAll('[data-animal-id]')){
      const animal=animals.get(img.dataset.animalId);
      if(!animal)continue;
      const visual=farmAnimalVisual(animal,{time,reducedMotion,rotation:Number(img.dataset.animalRotation)||0,transient:animalEffects.get(animal.id),activity:delightAnimalActivity(animal.id,time,{reducedMotion,eligible:animal.status!=='ready'})});
      if(img.getAttribute('src')!==visual.src)img.setAttribute('src',visual.src);
      img.dataset.animalState=visual.state;
      img.dataset.mirror=String(visual.mirror);
    }
  }
  function machineOverlays(machine) {
    if(machine.kind!=='machine')return '';
    const visual=farmMachineVisual(machine,now(),Economy.masteryStars(s,machine.machineType));
    return (visual.overlay?`<img class="farm-machine-overlay" data-machine-state="${visual.state}" src="${esc(farmAssetUrl(visual.overlay))}" alt="" aria-hidden="true">`:'') +(visual.mastery?`<img class="farm-machine-overlay farm-machine-mastery" src="${esc(farmAssetUrl(visual.mastery))}" alt="" aria-hidden="true">`:'');
  }
  if(reducedMotionQuery?.addEventListener)listen(reducedMotionQuery,'change',updateAnimalAnimations);
  function renderHeader(){
    const l=LEVELS[s.level-1],xp=Math.max(0,s.xp-l.totalXp);
    app.querySelector('.farm-header').innerHTML=`${button(`${icon('coin')}<span class="farm-stat-text"><span class="farm-stat-name">金币</span><b class="farm-number">${s.coins}</b></span>`,'shop',`class="farm-stat farm-stat-coins" aria-label="金币 ${s.coins}，打开商店"`)}${button(`${icon('construction_voucher')}<span class="farm-stat-text"><span class="farm-stat-name">建设券</span><b class="farm-number">${s.vouchers}</b></span>`,'shop-tab:vouchers',`class="farm-stat farm-stat-vouchers" aria-label="建设券 ${s.vouchers}，打开建设券页面"`)}${button(`<span class="farm-stat-level-text">${s.level}级</span><progress value="${xp}" max="${l.xpToNext}" aria-hidden="true"></progress>`,'tasks',`class="farm-stat farm-stat-level" aria-label="牧场${s.level}级，经验${xp}/${l.xpToNext}，打开成长任务"`)}${button(`${doodle('tools')}<span>更多</span>`,'more','class="farm-more-button" aria-label="更多，打开牧场工具菜单" aria-haspopup="dialog"')}${button(`${icon('silo')}<span>粮仓</span><b class="farm-number">${used(s,'silo')}/${s.storage.silo.capacity}</b>`,'storage:silo',`class="farm-stat farm-stat-silo" aria-label="粮仓 ${used(s,'silo')}/${s.storage.silo.capacity}，打开粮仓"`)}${button(`${icon('barn')}<span>货仓</span><b class="farm-number">${used(s,'barn')}/${s.storage.barn.capacity}</b>`,'storage:barn',`class="farm-stat farm-stat-barn" aria-label="货仓 ${used(s,'barn')}/${s.storage.barn.capacity}，打开货仓"`)}`;
    const statusInfo=store.status||{},errors=[];
    if(statusInfo.recoveryRequired)errors.push('农场存档暂时无法恢复，原始文件已保留。请在设置中导入有效备份，不会以初始状态覆盖旧档');else if(store.readOnly||statusInfo.readOnly)errors.push('此窗口为只读，请关闭另一牧场窗口或接管');
    if(statusInfo.error)errors.push(statusInfo.message||statusInfo.error?.message||String(statusInfo.error));
    if(s.clockWarning)errors.push('设备时间曾倒退，生产进度不会倒退');
    const errorBar=app.querySelector('.farm-error-bar');
    errorBar.hidden=!errors.length;
    const summary=statusInfo.recoveryRequired?'存档需要恢复，原文件已保留':store.readOnly||statusInfo.readOnly?'此窗口只读，暂不能保存':statusInfo.error?'保存遇到问题，请查看详情':'设备时间有变化，进度已保护';
    errorBar.innerHTML=errors.length?`<span aria-label="${esc(errors.join('；'))}">${esc(summary)}</span>${button('查看','settings','aria-label="查看存档或设备提示"')}`:'';
  }
  function worldEntities(){
    if(!ui.draft)return s.entities;
    const byId=new Map(ui.draft.positions.map(p=>[p.id,p]));
    return s.entities.map(e=>({...e,...byId.get(e.id)}));
  }
  function renderMap(){
    const focusedEntity=entityLayer.contains(document.activeElement)?document.activeElement?.closest('[data-entity]')?.dataset.entity:null;
    const owned=new Set(s.openedLand||[]);
    landLayer.innerHTML=`<div class="farm-land" style="left:768px;top:768px;width:1536px;height:1536px"></div>`+LAND_PATCHES.map(p=>`<div class="farm-land ${owned.has(p.id)?'':'locked'}" style="left:${p.x*TILE}px;top:${p.y*TILE}px;width:384px;height:384px"></div>`).join('')+`<div class="farm-path" style="left:1056px;top:1152px;width:48px;height:192px"></div><div class="farm-path" style="left:1056px;top:1296px;width:576px;height:48px"></div>`;
    const conflicts=new Set(ui.draft?validateLayout(s,ui.draft).errors.map(e=>e.id):[]);
    entityLayer.innerHTML=worldEntities().filter(e=>!e.stored).sort((a,b)=>a.y-b.y||a.x-b.x).map(e=>{
        const {w,h}=getFootprint(e),ready=readyCount(e,now()),label=entityName(e),selected=ui.selected===e.id;
        let animals='';
        if(e.kind==='shelter')animals=`<span class="farm-animal-preview">${e.animals.slice(0,3).map(a=>animalMarkup(a,e.rotation||0)).join('')}</span>`;
        return `<button type="button" class="farm-entity kind-${e.kind} ${selected?'is-selected':''} ${conflicts.has(e.id)?'layout-conflict':''}" data-entity="${esc(e.id)}" aria-label="${esc(`${label}，${entityStatus(e,now())}，位置${e.x}，${e.y}`)}" style="left:${e.x*TILE}px;top:${e.y*TILE}px;width:${w*TILE}px;height:${h*TILE}px;z-index:${e.kind==='road'?1:e.y+2}"><img class="farm-sprite" src="${esc(entityArt(e,now()))}" alt="" draggable="false">${machineOverlays(e)}${animals}${ready?`<span class="farm-ready-badge" aria-hidden="true">✓${ready>1?ready:''}</span>`:''}${e.kind==='field'?'':`<span class="farm-entity-label">${esc(label)}</span>`}</button>`;
      }).join('');
    if(ui.placing){
      const p=ui.placing,{w,h}=getFootprint(p);
      entityLayer.insertAdjacentHTML('beforeend',`<div class="farm-entity is-ghost" style="left:${p.x*TILE}px;top:${p.y*TILE}px;width:${w*TILE}px;height:${h*TILE}px"><img class="farm-sprite" src="${esc(entityArt(p,now()))}" alt=""></div>`);
    }
    renderStroke();
    transform();
    renderQuickTools();
    if(focusedEntity)entityLayer.querySelector(`[data-entity="${CSS.escape(focusedEntity)}"]`)?.focus({preventScroll:true});
  }
  function renderToolbar(){
    const toolbar=app.querySelector('.farm-toolbar');
    if(ui.placing){
      const p=ui.placing;
      toolbar.innerHTML=`<div class="farm-placement-toolbar"><span>${esc(p.label)} · ${p.cost}金币<br>选空地摆放 · 购买后 ${s.coins-p.cost}金币</span>${button('旋转','rotate-placement')}${button('取消','cancel-placement')}${button('确认购买','confirm-placement','class="farm-primary"')}</div>`;
      return;
    }
    if(ui.mode==='layout'){
      toolbar.innerHTML=`<div class="farm-placement-toolbar">${button(icon('ui.undo')+'<span>撤销</span>','undo','aria-label="撤销布局" '+(!ui.undo.length?'disabled':''))}${button('调整物件','layout-details')}${button('取消','cancel-layout')}${button('保存','save-layout','class="farm-primary"')}</div>`;
      return;
    }
    const modes=[['pan','hand','逛一逛'],['plant','seed','种下去'],['harvest','basket','收获啦'],['layout','tools','布置家']];
    toolbar.innerHTML=modes.map(([m,i,l])=>button(`${doodle(i)}<span>${l}</span>`,`mode:${m}`,`aria-pressed="${ui.mode===m}" aria-label="${l}，${({pan:'移动地图',plant:'种植作物',harvest:'收获作物',layout:'布置牧场'})[m]}"`)).join('');
  }
  function renderMapHint(){
    const label=app.querySelector('.farm-map-label');
    label.hidden=!!ui.quickEntityId||(!ui.placing&&ui.mode==='pan');
    label.innerHTML=ui.placing?'选好空地，再确认购买':ui.mode==='plant'?`${icon(ui.cropId)}<span>${esc(name(ui.cropId))} ×${s.inventory[ui.cropId]||0} · 划过空田</span>`:ui.mode==='harvest'?`${icon('ui.harvest')}<span>划过成熟作物，松手收获</span>`:ui.mode==='feed'?`${icon('ui.feed')}<span>划过同类栏舍，松手喂养</span>`:ui.mode==='layout'?'拖动物件布置 · 保存后生效':'';
  }
  function setCameraTools(open){
    app.querySelector('.farm-camera-popover').hidden=!open;
    app.querySelector('[data-action="camera-menu"]').setAttribute('aria-expanded',String(open));
  }
  function businessKey(){
    return JSON.stringify(s,(key,value)=>['now','revision','commandLog','accountedMs','mastery'].includes(key)?undefined:value)+s.entities.map(e=>`${e.id}:${readyCount(e,now())}:${farmCropPhase(e.crop,now())}${e.kind==='machine'?':'+Economy.masteryStars(s,e.machineType):''}`).join('|');
  }
  function render(){
    if(ui.destroyed)return;
    const focusedAction=!overlay.contains(document.activeElement)?document.activeElement?.dataset?.action:null;
    s=store.getState();
    app.dataset.reducedMotion=!!s.settings?.reducedMotion;
    delight.setReducedMotion(!!s.settings?.reducedMotion);
    syncDelightVisibility();
    const key=businessKey(),changed=ui.businessKey!==key;
    renderHeader();
    if(changed||ui.draft||ui.placing||ui.stroke||ui.selected!==ui.lastSelected){
      renderMap();
      ui.lastSelected=ui.selected;
    }
    renderToolbar();
    renderMapHint();
    view.dataset.mode=ui.mode;
    if(ui.panel&&changed)renderPanel();
    ui.businessKey=key;
    const readyEntities=s.entities.filter(e=>readyCount(e,now())>0),readyTotal=readyEntities.reduce((n,e)=>n+readyCount(e,now()),0);
    if(ui.readyTotal!==undefined&&readyTotal>ui.readyTotal&&!root.hidden&&!document.hidden){
      playCue('product-ready');
      delight.play('complete',{sourceElements:readyEntities.slice(0,8).map(e=>entityLayer.querySelector(`[data-entity="${CSS.escape(e.id)}"]`)).filter(Boolean),count:1});
    }
    ui.readyTotal=readyTotal;
    updateAnimalAnimations();
    delight.refresh();
    if(focusedAction)[...app.querySelectorAll('[data-action]')].find(el=>el.dataset.action===focusedAction)?.focus({preventScroll:true});
  }
  function saveCamera(){
    clearTimeout(ui.cameraTimer);
    ui.cameraTimer=setTimeout(()=>{
        if(ui.destroyed||root.hidden||store.readOnly)return;
        if(ui.pointers.size){
          saveCamera();
          return;
        }
        normalizeNativeScroll();
        const r=view.getBoundingClientRect(),camera={
          centerX:clamp((r.width/2-ui.camera.x)/(TILE*ui.zoom),0,63.999),
          centerY:clamp((r.height/2-ui.camera.y)/(TILE*ui.zoom),0,63.999),
          zoom:ui.zoom
        };
        if(JSON.stringify(camera)!==JSON.stringify(store.getState().camera))store.dispatch({type:'setCamera',camera});
      },250);
  }
  function normalizeNativeScroll(){
    const left=view.scrollLeft,top=view.scrollTop;
    if(!left&&!top)return;
    ui.camera=farmCameraAfterScroll(ui.camera,left,top);
    view.scrollLeft=0;
    view.scrollTop=0;
    world.style.transform=`translate(${ui.camera.x}px,${ui.camera.y}px) scale(${ui.zoom})`;
  }
  function transform(){
    normalizeNativeScroll();
    const rect=view.getBoundingClientRect();
    ui.camera.x=clamp(ui.camera.x,Math.min(0,rect.width-WORLD*ui.zoom),0);
    ui.camera.y=clamp(ui.camera.y,Math.min(0,rect.height-WORLD*ui.zoom),0);
    world.style.transform=`translate(${ui.camera.x}px,${ui.camera.y}px) scale(${ui.zoom})`;
    delight.refresh();
    positionQuickTools();
  }
  function center(x=29.5,y=28.5){
    normalizeNativeScroll();
    const rect=view.getBoundingClientRect();
    ui.camera.x=rect.width/2-x*TILE*ui.zoom;
    ui.camera.y=rect.height/2-y*TILE*ui.zoom;
    transform();
  }
  function screenToWorld(clientX,clientY){
    normalizeNativeScroll();

    // The DOM box is authoritative: browser focus/scrollIntoView can scroll an
    // overflow:hidden ancestor even without a visible scrollbar. Camera-only
    // arithmetic would otherwise miss the user's visually selected fields.
    const rect=world.getBoundingClientRect();
    return farmPointFromWorldRect(clientX,clientY,rect);
  }
  function zoomTo(value,clientX,clientY){
    const r=view.getBoundingClientRect(),sx=clientX??r.left+r.width/2,sy=clientY??r.top+r.height/2,point=screenToWorld(sx,sy);
    ui.zoom=clamp(value,.75,1.75);
    ui.camera.x=sx-r.left-point.x*TILE*ui.zoom;
    ui.camera.y=sy-r.top-point.y*TILE*ui.zoom;
    transform();
    saveCamera();
  }
  function entityAt(point,entities=worldEntities()){
    return entities.filter(e=>!e.stored).reverse().sort((a,b)=>Number(a.kind==='road')-Number(b.kind==='road')).find(e=>{
        const{w,h}=getFootprint(e);
        return point.x>=e.x&&point.y>=e.y&&point.x<e.x+w&&point.y<e.y+h;
      });
  }
  function cancelGesture(message){
    if(ui.gesture?.type==='edit'&&ui.draft)ui.draft.positions=ui.gesture.original;
    const pending=!!ui.stroke||!!ui.gesture?.type?.startsWith('tool');
    cancelFarmStroke(ui.stroke,message||'cancelled');
    ui.stroke=null;
    ui.gesture=null;
    ui.edgeStart=0;
    app.querySelector('.farm-drag-tool').hidden=true;
    renderStroke();
    if(pending&&message)status(message);
  }
  function strokePreview(){
    return previewFarmStroke(s,ui.stroke);
  }
  function addStroke(point){
    if(!ui.stroke)return;
    extendFarmStroke(ui.stroke,point,cell=>{
        const e=entityAt({x:cell.x+.5,y:cell.y+.5},s.entities);
        if(!e)return null;
        const target=ui.mode==='plant'?e.kind==='field':ui.mode==='harvest'?['field','fruit'].includes(e.kind):e.kind==='shelter'&&e.configId===ui.feedSpecies;
        return target?e.id:null;
      });
    renderStroke();
  }
  function renderStroke(){
    app.querySelector('.farm-status').classList.toggle('is-visible',!!ui.stroke);
    for(const el of entityLayer.querySelectorAll('.stroke-valid,.stroke-skip'))el.classList.remove('stroke-valid','stroke-skip');
    if(!ui.stroke)return;
    const previews=strokePreview();
    for(const p of previews)entityLayer.querySelector(`[data-entity="${CSS.escape(p.id)}"]`)?.classList.add(p.valid?'stroke-valid':'stroke-skip');
    const valid=previews.filter(p=>p.valid).length;
    status(`已划 ${previews.length} 个目标 · 可执行 ${valid} · 跳过 ${previews.length-valid}。${previews.find(p=>!p.valid)?.reason||'抬手确认，双指或滑出地图取消。'}`);
  }
  function changedDraft(next){
    if(!ui.draft)return;
    ui.undo.push(clone(ui.draft.positions));
    if(ui.undo.length>50)ui.undo.shift();
    ui.redo=[];
    ui.draft.positions=next;
    clearTimeout(ui.draftTimer);
    ui.draftTimer=setTimeout(()=>store.saveDraft?.(ui.draft),250);
    renderMap();
    renderToolbar();
  }
  function hideQuickTools(){
    ui.quickEntityId=null;
    app.querySelector('.farm-object-tools').hidden=true;
    renderMapHint();
  }
  function positionQuickTools(){
    const tray=app.querySelector('.farm-object-tools');
    if(tray.hidden||!ui.quickEntityId)return;
    const anchor=entityLayer.querySelector(`[data-entity="${CSS.escape(ui.quickEntityId)}"]`);
    if(!anchor){hideQuickTools();return;}
    const r=anchor.getBoundingClientRect(),v=view.getBoundingClientRect();
    const width=tray.offsetWidth,height=tray.offsetHeight;
    const above=r.top-v.top-height-8;
    tray.style.left=`${clamp(r.left-v.left+r.width/2-width/2,7,Math.max(7,v.width-width-7))}px`;
    tray.style.top=`${clamp(above>=7?above:r.bottom-v.top+8,7,Math.max(7,v.height-height-7))}px`;
  }
  function quickTool(label,artId,tool,detail='',disabled=false){
    return `<button type="button" class="farm-quick-tool" data-farm-tool="${json({...tool,artId})}" aria-label="${esc(label)}${detail?'，'+esc(detail):''}，拖到目标或点选" ${disabled?'disabled':''}>${icon(artId)}<span>${esc(label)}</span>${detail?`<small>${esc(detail)}</small>`:''}</button>`;
  }
  function renderQuickTools(){
    if(!ui.quickEntityId)return;
    const e=s.entities.find(e=>e.id===ui.quickEntityId),tray=app.querySelector('.farm-object-tools');
    if(!e||ui.mode==='layout'||ui.placing){hideQuickTools();return;}
    let tools='',hint='拖动工具到目标，松手才执行。';
    if(e.kind==='field'||e.kind==='fruit'){
      if(e.kind==='field'&&!e.crop){
        tools=values(CROPS).filter(c=>c.level<=s.level).slice(0,4).map(c=>quickTool(c.name,c.id,{kind:'stroke',mode:'plant',itemId:c.id},`种子 ${s.inventory[c.id]||0}`,!(s.inventory[c.id]>0))).join('');
        tools+=button(`${doodle('seed')}<span>更多种子</span>`,'plant','class="farm-quick-more"');
        hint='拖种子扫过空田；点一下选好种子，再划田也可以。';
      }else if(readyCount(e,now())){
        tools=quickTool('收获啦','ui.harvest',{kind:'stroke',mode:'harvest'},`粮仓余 ${s.storage.silo.capacity-used(s,'silo')}`);
        hint='拖镰刀划过成熟作物，抬手一起收。';
      }else{
        tools=`<div class="farm-quick-growing">${icon(e.crop?.itemId||e.configId)}<span>${esc(entityStatus(e,now()))}</span></div>`;
        hint=e.kind==='fruit'&&['revive','withered'].includes(e.status)?'打开详情，请园丁帮忙或清理植株。':'小苗在慢慢长大，成熟后不会枯萎。';
      }
    }else if(e.kind==='shelter'){
      const animal=ANIMALS[e.configId],hungry=e.animals.filter(a=>a.status==='hungry').length,ready=e.animals.filter(a=>a.status==='ready').length;
      tools=quickTool('开饭啦',animal.feedItem,{kind:'stroke',mode:'feed',feedSpecies:e.configId},`饲料 ${s.inventory[animal.feedItem]||0} · 待喂 ${hungry}`,!hungry||!s.inventory[animal.feedItem]);
      tools+=quickTool('收进篮子',animal.product,{kind:'drop',command:{type:'collectAnimal',entityId:e.id}},`待收 ${ready} · 货仓余 ${s.storage.barn.capacity-used(s,'barn')}`,!ready);
      hint='饲料可划过同类栏舍；产物篮拖回本栏，或点一下收取。';
    }else if(e.kind==='machine'&&e.built){
      if(e.completed.length)tools+=quickTool('收成品',e.completed[0].recipeId,{kind:'drop',command:{type:'collectMachine',entityId:e.id}},`${e.completed.length} 批 · 货仓余 ${s.storage.barn.capacity-used(s,'barn')}`);
      tools+=values(RECIPES).filter(r=>r.machineType===e.machineType&&r.level<=s.level).slice(0,3).map(r=>quickTool(r.name,r.id,{kind:'drop',command:{type:'enqueue',entityId:e.id,recipeId:r.id}},Object.entries(r.inputs).map(([id,q])=>`${name(id)}${s.inventory[id]||0}/${q}`).join(' · '),e.queue.length>=e.slots)).join('');
      hint=`队列 ${e.queue.length}/${e.slots} · 拖配方到这台机器，或点一下入队。`;
    }else{hideQuickTools();return;}
    tray.innerHTML=`<div class="farm-quick-head"><strong>${esc(entityName(e))}</strong>${button('详情',`entity:${e.id}`)}${button('×','quick-close','aria-label="收起快捷工具"')}</div><div class="farm-quick-tools-row">${tools}</div><p>${esc(hint)}</p>`;
    tray.hidden=false;
    app.querySelector('.farm-map-label').hidden=true;
    positionQuickTools();
  }
  function showQuickTools(id){
    const e=s.entities.find(e=>e.id===id);
    if(!e||!['field','fruit','shelter','machine'].includes(e.kind)||e.kind==='machine'&&!e.built){openEntity(id);return;}
    ui.quickEntityId=id;
    renderQuickTools();
    playCue('button');
  }
  function selectQuickStroke(tool){
    ui.mode=tool.mode;
    if(tool.itemId)ui.cropId=tool.itemId;
    if(tool.feedSpecies)ui.feedSpecies=tool.feedSpecies;
    view.dataset.mode=ui.mode;
    renderToolbar();
    renderMapHint();
  }
  function moveToolGhost(tool,event){
    const ghost=app.querySelector('.farm-drag-tool');
    if(ghost.hidden)ghost.innerHTML=icon(tool.artId);
    ghost.hidden=false;
    ghost.style.left=`${event.clientX}px`;
    ghost.style.top=`${event.clientY}px`;
  }
  function activateToolDrag(gesture,event){
    const start=farmToolExitPoint({x:gesture.startX,y:gesture.startY},{x:event.clientX,y:event.clientY},gesture.trayRect);
    if(!start)return 'pending';
    hideQuickTools();
    if(!insideView(event)){cancelGesture('已取消，工具还没有使用');return 'cancelled';}
    if(gesture.tool.kind==='stroke'){
      selectQuickStroke(gesture.tool);
      // Trace the coalesced first segment, excluding land covered by the tool tray.
      ui.stroke=createFarmStroke(gesture.tool.mode,gesture.tool.itemId||ui.cropId,screenToWorld(start.x,start.y));
      gesture.type='stroke';gesture.fromTool=true;
      addStroke(screenToWorld(event.clientX,event.clientY));
    }else gesture.type='tool-drag';
    gesture.x=event.clientX;gesture.y=event.clientY;
    moveToolGhost(gesture.tool,event);
    return 'started';
  }
  function insideView(event){
    const r=view.getBoundingClientRect();
    return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom&&!document.elementFromPoint(event.clientX,event.clientY)?.closest('.farm-camera-tools,.farm-rail,.farm-overlay,.farm-toolbar,.farm-header,.farm-object-tools');
  }
  listen(document,'pointerdown',event=>{
    if(!ui.pointers.size||ui.pointers.has(event.pointerId))return;
    cancelGesture('第二根手指加入，整笔已取消，资源未扣除');
    ui.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    ui.gesture={type:'wait'};
  },{capture:true});
  listen(document,'pointerup',event=>{
    ui.pointers.delete(event.pointerId);
    if(ui.gesture?.type==='wait'&&!ui.pointers.size)ui.gesture=null;
  });
  listen(document,'pointercancel',()=>{
    if(!ui.pointers.size)return;
    ui.pointers.clear();cancelGesture('系统中断，工具已放回，资源未扣除');
  });
  listen(view,'pointerdown',event=>{
      if(event.target.closest('.farm-camera-tools,.farm-rail')||event.target.closest('.farm-object-tools')&&!event.target.closest('[data-farm-tool]'))return;
      const toolElement=event.target.closest('[data-farm-tool]');
      if(toolElement?.disabled)return;
      if(event.button&&event.pointerType==='mouse')return;
      setMusic();
      event.preventDefault();
      view.setPointerCapture(event.pointerId);
      ui.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(ui.pointers.size>1){
        cancelGesture('已取消整笔：双指只移动或缩放地图，不扣库存');
        const p=[...ui.pointers.values()];
        renderMap();
        ui.gesture={type:'multi',distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),cx:(p[0].x+p[1].x)/2,cy:(p[0].y+p[1].y)/2};
        return;
      }
      if(ui.gesture?.type==='wait')return;
      if(toolElement){
        const tool=JSON.parse(toolElement.dataset.farmTool);
        ui.gesture={type:'tool-pending',tool,toolKey:toolElement.dataset.farmTool,toolRect:toolElement.getBoundingClientRect(),trayRect:app.querySelector('.farm-object-tools').getBoundingClientRect(),startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY};
        return;
      }
      hideQuickTools();
      const point=screenToWorld(event.clientX,event.clientY),entity=entityAt(point);
      if(ui.placing){
        ui.placing.x=Math.floor(point.x);
        ui.placing.y=Math.floor(point.y);
        renderMap();
        ui.gesture={type:'placement',x:event.clientX,y:event.clientY};
        return;
      }
      if(['plant','harvest','feed'].includes(ui.mode)){
        ui.stroke=createFarmStroke(ui.mode,ui.cropId,point);
        ui.gesture={type:'stroke',x:event.clientX,y:event.clientY};
        addStroke(point);
        return;
      }
      if(ui.mode==='layout'&&entity&&!isFixedEntity(entity)){
        if(ui.selected===entity.id){
          ui.gesture={
            type:'edit',
            id:entity.id,
            start:point,
            original:clone(ui.draft.positions),
            position:ui.draft.positions.find(p=>p.id===entity.id),
            x:event.clientX,
            y:event.clientY
          };
          return;
        }
        ui.selected=entity.id;
        renderMap();
      }
      ui.gesture={
        type:'pan-pending',
        x:event.clientX,
        y:event.clientY,
        startX:event.clientX,
        startY:event.clientY,
        startAt:performance.now(),
        entityId:entity?.id
      };
    });
  listen(view,'pointermove',event=>{
      if(!ui.pointers.has(event.pointerId))return;
      ui.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      const g=ui.gesture;
      if(!g)return;
      if(g.type==='multi'&&ui.pointers.size>=2){
        const p=[...ui.pointers.values()],cx=(p[0].x+p[1].x)/2,cy=(p[0].y+p[1].y)/2,d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
        zoomTo(ui.zoom*d/Math.max(1,g.distance),g.cx,g.cy);
        ui.camera.x+=cx-g.cx;
        ui.camera.y+=cy-g.cy;
        Object.assign(g,{distance:d,cx,cy});
        transform();
        return;
      }
      if(g.type==='wait')return;
      if(g.type==='tool-pending'){
        if(Math.hypot(event.clientX-g.startX,event.clientY-g.startY)<8)return;
        const activation=activateToolDrag(g,event);
        if(activation!=='started'){if(activation==='cancelled')ui.gesture={type:'wait'};return;}
      }
      if(['stroke','edit','tool-drag'].includes(g.type)&&!insideView(event)){
        if(g.type==='edit')ui.draft.positions=g.original;
        cancelGesture('已取消：划动进入了工具栏或面板');
        renderMap();
        ui.gesture={type:'wait'};
        return;
      }
      const point=screenToWorld(event.clientX,event.clientY);
      if(g.type==='tool-drag'){g.x=event.clientX;g.y=event.clientY;moveToolGhost(g.tool,event);return;}
      if(g.type==='stroke'){
        if(g.fromTool)moveToolGhost(g.tool,event);
        g.x=event.clientX;
        g.y=event.clientY;
        addStroke(point);
        return;
      }
      if(g.type==='edit'){
        const e=g.position,dx=Math.round(point.x-g.start.x),dy=Math.round(point.y-g.start.y);
        ui.draft.positions=g.original.map(p=>p.id===g.id?{...p,x:e.x+dx,y:e.y+dy}:p);
        g.x=event.clientX;
        g.y=event.clientY;
        renderMap();
        return;
      }
      if(g.type==='placement'){
        ui.placing.x=Math.floor(point.x);
        ui.placing.y=Math.floor(point.y);
        renderMap();
        return;
      }
      if(g.type==='pan-pending'&&Math.hypot(event.clientX-g.startX,event.clientY-g.startY)>8)g.type='pan';
      if(g.type==='pan'){
        ui.camera.x+=event.clientX-g.x;
        ui.camera.y+=event.clientY-g.y;
        g.x=event.clientX;
        g.y=event.clientY;
        transform();
      }
    });
  listen(view,'pointerup',async event=>{
      const g=ui.gesture;
      ui.pointers.delete(event.pointerId);
      if(!g)return;
      if(['multi','wait'].includes(g.type)){
        ui.gesture=ui.pointers.size?{type:'wait'}:null;
        if(!ui.pointers.size)saveCamera();
        return;
      }
      if(ui.pointers.size)return;
      if(g.type==='tool-pending'&&Math.hypot(event.clientX-g.startX,event.clientY-g.startY)>=8){
        const activation=activateToolDrag(g,event);
        if(activation!=='started'){cancelGesture('工具还在小口袋里，这次没有执行');return;}
      }
      if(g.type==='tool-pending'){
        const end={x:event.clientX,y:event.clientY},target=document.elementFromPoint(end.x,end.y)?.closest('[data-farm-tool]');
        if(!isFarmToolTap({x:g.startX,y:g.startY},end,g.toolRect,view.getBoundingClientRect())||target?.dataset.farmTool!==g.toolKey){cancelGesture('已取消，工具还没有使用');return;}
        const tool=g.tool;
        cancelGesture();hideQuickTools();
        if(tool.kind==='stroke'){
          selectQuickStroke(tool);
          status(tool.mode==='plant'?`已选${name(tool.itemId)}，划过空田后松手播种。`:tool.mode==='feed'?'划过同类栏舍，松手喂养。':'划过成熟作物，松手一起收获。');
        }else await dispatch(tool.command);
        return;
      }
      if(g.type==='tool-drag'){
        const target=insideView(event)?entityAt(screenToWorld(event.clientX,event.clientY)):null;
        const command=finishFarmToolDrop(g.tool,target?.id,{dragged:true,inside:insideView(event)});
        cancelGesture();
        if(command)await dispatch(command);else status('工具放回啦。拖到刚才选中的设施才会执行。');
        return;
      }
      if(g.type==='stroke'&&!insideView(event)){
        cancelGesture('已取消：抬手位置在地图外，整笔未执行');
        return;
      }
      if(g.type==='stroke'){
        addStroke(screenToWorld(event.clientX,event.clientY));
        const command=finishFarmStroke(ui.stroke),ids=command?.entityIds||[];
        cancelGesture();
        if(command){
          const result=await dispatch(command);
          if(result.ok!==false){
            const count=result.delta?.events?.length??Math.max(0,ids.length-(result.skipped?.length||0));
            status(`本笔完成 ${count} ${ui.mode==='feed'?'只动物':'个目标'}${result.skipped?.length?`，跳过 ${result.skipped.length} 个`:''}。${farmChangeMessage(result)}`);
          }
        }else status('没有划到可操作目标，请从田地开始');
      } else if(g.type==='edit'){
        const next=clone(ui.draft.positions),check=validateLayout(s,{positions:next});
        ui.draft.positions=g.original;
        if(check.ok){
          changedDraft(next);
          status('位置已放入草稿，点击保存才应用');
        }else{
          renderMap();
          status(check.errors[0]?.message||'位置不合法，已回到上一个位置',true);
        }
      } else if(g.type==='pan-pending'&&performance.now()-g.startAt<=500){
        if(ui.mode==='layout'){
          if(g.entityId)ui.selected=g.entityId;
          renderMap();
        }else if(g.entityId)showQuickTools(g.entityId);else{
          const p=screenToWorld(event.clientX,event.clientY),patch=LAND_PATCHES.find(a=>p.x>=a.x&&p.x<a.x+8&&p.y>=a.y&&p.y<a.y+8&&!s.openedLand.includes(a.id));
          if(patch)openPanel('land',patch.id);
        }
      }
      if(g.type==='pan'){
        store.dispatch({type:'tutorialEvent',event:'cameraMoved'});
        saveCamera();
      }
      if(g.type==='stroke'||g.type==='edit')saveCamera();
      ui.gesture=null;
      ui.edgeStart=0;
    });
  listen(view,'pointercancel',()=>{
      if(ui.gesture?.type==='edit')ui.draft.positions=ui.gesture.original;
      ui.pointers.clear();
      cancelGesture('系统中断，整笔未执行');
      renderMap();
    });
  function cancelForBackground(){
    if(ui.gesture?.type==='edit')ui.draft.positions=ui.gesture.original;
    ui.pointers.clear();
    cancelGesture('操作已取消，尚未提交的预览不会扣除资源');
    renderMap();
  }
  listen(window,'blur',cancelForBackground);
  listen(document,'visibilitychange',()=>{
      if(document.hidden){
        cancelForBackground();
        syncDelightVisibility();
      }else {syncDelightVisibility();setMusic();}
    });
  listen(window,'orientationchange',cancelForBackground);
  listen(view,'wheel',event=>{
      event.preventDefault();
      if(event.ctrlKey)zoomTo(ui.zoom-event.deltaY*.003,event.clientX,event.clientY);else{
        ui.camera.x-=event.deltaX;
        ui.camera.y-=event.deltaY;
        transform();
        saveCamera();
      }
    },{passive:false});
  listen(view,'scroll',()=>{
      if(view.scrollLeft||view.scrollTop){
        normalizeNativeScroll();
        transform();
        saveCamera();
      }
    },{passive:true});
  listen(view,'focusin',event=>{
      const target=event.target.closest?.('[data-entity]');
      if(!target||ui.gesture||ui.stroke)return;
      normalizeNativeScroll();
      const rect=target.getBoundingClientRect(),viewport=view.getBoundingClientRect();
      if(rect.left<viewport.left+6||rect.top<viewport.top+6||rect.right>viewport.right-6||rect.bottom>viewport.bottom-6){
        const entity=worldEntities().find(e=>e.id===target.dataset.entity);
        if(entity){
          const {w,h}=getFootprint(entity);
          center(entity.x+w/2,entity.y+h/2);
          saveCamera();
        }
      }
    });
  listen(view,'keydown',event=>{
      if(event.target!==view)return;
      const d={ArrowLeft:[90,0],ArrowRight:[-90,0],ArrowUp:[0,90],ArrowDown:[0,-90]}[event.key];
      if(d){
        event.preventDefault();
        ui.camera.x+=d[0];
        ui.camera.y+=d[1];
        transform();
        saveCamera();
      }else if(event.key==='+'||event.key==='=')zoomTo(ui.zoom+.25);else if(event.key==='-')zoomTo(ui.zoom-.25);else if(event.key==='Home')center();
    });
  function edgeFrame(t){
    if(ui.destroyed)return;
    const g=ui.gesture;
    if(g&&['stroke','edit'].includes(g.type)){
      const r=view.getBoundingClientRect(),x=g.x-r.left,y=g.y-r.top,edge=24,dx=x<edge?-(1-x/edge):x>r.width-edge?1-(r.width-x)/edge:0,dy=y<edge?-(1-y/edge):y>r.height-edge?1-(r.height-y)/edge:0;
      if(dx||dy){
        if(!ui.edgeStart)ui.edgeStart=t;
        if(t-ui.edgeStart>=250){
          const dt=Math.min(32,t-(ui.lastFrame||t))/1000;
          ui.camera.x-=dx*180*dt;
          ui.camera.y-=dy*180*dt;
          transform();
          if(g.type==='stroke')addStroke(screenToWorld(g.x,g.y));else if(g.type==='edit'){
            const point=screenToWorld(g.x,g.y),dx=Math.round(point.x-g.start.x),dy=Math.round(point.y-g.start.y);
            ui.draft.positions=g.original.map(p=>p.id===g.id?{...p,x:g.position.x+dx,y:g.position.y+dy}:p);
            renderMap();
          }
        }
      }else ui.edgeStart=0;
    }
    ui.lastFrame=t;
    ui.frame=requestAnimationFrame(edgeFrame);
  }
  function openPanel(panel,id){
    cancelGesture();
    hideQuickTools();
    setCameraTools(false);
    if(panel==='market'&&ui.mode!=='layout'&&s.level>=7&&s.npc.budgetFieldAllowance===null&&s.features?.npcMarketEnabled!==false){
      store.dispatch({type:'openMarket'});
      s=store.getState();
    }
    ui.panel=panel;
    ui.entityId=id??null;
    ui.confirm=null;
    content.scrollTop=0;
    renderPanel();
    overlay.hidden=false;
    queueMicrotask(()=>app.querySelector('.farm-panel-head button')?.focus());
  }
  function closePanel({focus=true}={}){
    ui.panel=null;
    ui.confirm=null;
    overlay.hidden=true;
    if(focus)view.focus({preventScroll:true});
  }
  function resetTransientUi(){
    // Navigation closes temporary controls without touching farm data, the
    // camera, or an existing layout draft. Do not focus the now-hidden map.
    closePanel({focus:false});
    ui.panelTab='';
    ui.entityId=null;
    ui.previousPanel=null;
    hideQuickTools();
    setCameraTools(false);
    clearTimeout(ui.toastTimer);
    ui.toastTimer=null;
    ui.lastMessage='';
    app.querySelector('.farm-toast').textContent='';
    const liveStatus=app.querySelector('.farm-status');
    liveStatus.textContent='';
    liveStatus.classList.remove('is-visible','is-error');
  }
  function setActive(active){
    const wasInactive=!!ui.inactive;
    ui.inactive=!active;
    syncDelightVisibility();
    if(!active)cancelForBackground();
    if(!active||wasInactive)resetTransientUi();
    if(active)delight.refresh();
  }
  function openEntity(id){
    const e=s.entities.find(e=>e.id===id);
    if(!e)return;
    if(ui.mode==='layout'){
      ui.selected=id;
      openPanel('layout-details');
      return;
    }
    openPanel(e.kind==='barn'||e.kind==='silo'?'storage':e.kind,id);
    if(e.kind==='barn'||e.kind==='silo'){
      ui.panelTab=e.kind;
      renderPanel();
    }
  }
  function ask(title,text,onYes,label='确认',after){
    ui.previousPanel={panel:ui.panel,entityId:ui.entityId,panelTab:ui.panelTab};
    ui.confirm={title,text,onYes,label,after};
    ui.panel='confirm';
    renderPanel();
    overlay.hidden=false;
    queueMicrotask(()=>app.querySelector('.farm-panel-head button')?.focus());
  }
  function backFromConfirm(){
    const prev=ui.previousPanel;
    ui.confirm=null;
    if(prev?.panel){
      Object.assign(ui,prev);
      renderPanel();
    }else closePanel();
  }
  function tabs(tabs,active){
    return `<div class="farm-tabs">${tabs.map(([id,label])=>button(label,`tab:${id}`,`aria-pressed="${id===active}"`)).join('')}</div>`;
  }
  function ingredients(items){
    return `<div class="farm-ingredients">${Object.entries(items||{}).map(([id,q])=>`<span class="farm-ingredient ${(s.inventory[id]||0)<q?'missing':''}" title="现有${s.inventory[id]||0}份，需要${q}份">${icon(id)}<span>${esc(name(id))} <b>${s.inventory[id]||0}/${q}</b>${(s.inventory[id]||0)<q?`<small>缺${q-(s.inventory[id]||0)}</small>`:''}</span></span>`).join('')}</div>`;
  }
  function card(title,description,actions='',art='',more=''){
    return `<article class="farm-card${art?' has-art':''}">${art?`<div class="farm-art-medallion">${art}</div>`:''}<div class="farm-card-body"><h3>${esc(title)}</h3><p>${description}</p>${more}${actions?`<div class="farm-card-actions">${actions}</div>`:''}</div></article>`;
  }
  function empty(message){
    return `<div class="farm-empty">${doodle('sheep')}<p>${message}</p></div>`;
  }
  function entityList(filter){
    return s.entities.filter(filter).map(e=>card(entityName(e),`${esc(entityStatus(e,now()))}<br><span class="farm-coordinate">位置 ${e.x}, ${e.y}</span>`,button('打开',`entity:${e.id}`)+button('定位',`locate:${e.id}`),`<img class="farm-large-art" src="${esc(entityArt(e,now()))}" alt="">`)).join('');
  }
  function renderPlant(){
    return `${intro('打开种子小口袋','选一种作物，拖过空田就能播种。','seed')}${guideNote('播种小贴士','作物也是种子。每田消耗1份，成熟收2份。划种不花金币，抬手才提交；不足时不会自动购买。')}<div class="farm-cards">${values(CROPS).map(c=>card(c.name,`库存 ${s.inventory[c.id]||0} · ${duration(c.durationMs)} · 收${c.yieldCount}份 · +${c.xp}经验<br>${c.level>s.level?`${c.level}级解锁`:'播种允许使用最后1份种子'}`,button(c.level>s.level?`${c.level}级开放`:'选好 · 去播种',`select-crop:${c.id}`,c.level>s.level?'disabled':'class="farm-primary"')+button(`补种10份 · ${c.buyPrice}金币`,`seed-buy:${c.id}`,c.level>s.level?'disabled':''),itemImage(c.id))).join('')}</div>${button('种子用光了？来借一点','rescue')}`;
  }
  function renderFields(){
    const fields=s.entities.filter(e=>e.kind==='field');
    return `<p class="farm-muted">已摆 ${fields.length} / ${fieldAllowance(s.level)} 田。列表可替代划屏操作，读屏和键盘也能种收。</p><div class="farm-field-list">${fields.map((e,i)=>button(`<img src="${esc(entityArt(e,now()))}" alt=""><strong>田地 ${i+1}</strong><span>${esc(entityStatus(e,now()))}</span>`,`entity:${e.id}`)).join('')}</div>${button('购买新田 · 1金币','purchase-field')}`;
  }
  function renderField(e){
    if(!e)return empty('这块田已不存在');
    const c=e.crop;
    return `<div class="farm-summary">位置 ${e.x},${e.y} · ${esc(entityStatus(e,now()))}${c?`<br>本次产量 ${c.rescue?2:c.yieldCount}${c.rescue?'，归还借种1份，净收1份':''} · +${c.xp}经验`:''}</div>${c?(c.readyAt<=now()?cmdButton('收获这块田',{type:'harvest',entityIds:[e.id]},'class="farm-primary"'):`<p>${timer(c.readyAt,now())}。成熟不会枯萎，可以放心离开。</p>`):`<label>播种作物<select data-field-crop>${values(CROPS).filter(c=>c.level<=s.level).map(c=>`<option value="${c.id}" ${c.id===ui.cropId?'selected':''}>${c.name} · 库存${s.inventory[c.id]||0} · ${duration(c.durationMs)}</option>`).join('')}</select></label>${button('播种这块田','plant-one','class="farm-primary"')}${button('借种救济','rescue')}`}${button('定位这块田',`locate:${e.id}`)}${button('搬动田地',`edit-entity:${e.id}`)}`;
  }
  function renderStorage(){
    const kind=['silo','barn'].includes(ui.panelTab)?ui.panelTab:'silo',entries=Object.entries(s.inventory).filter(([id,q])=>q>0&&ITEMS[id]?.storage===kind),st=s.storage[kind],n=st.upgrades+1,mats=kind==='silo'?['nail','screw','wood_panel']:['bolt','duct_tape','plank'];
    return `${tabs([['silo','粮仓'],['barn','货仓'],['materials','材料补给']],kind)}<div class="farm-summary">${kind==='silo'?'粮仓':'货仓'} ${used(s,kind)} / ${st.capacity}份<br>${kind==='silo'?'田间作物与水果存放在这里。每种田间作物默认留种1份。':'动物产物、加工品、饲料和工具共同占货仓。满仓仍可出售、交单和投入生产。'}</div><div class="farm-cards">${entries.length?entries.map(([id,q])=>card(name(id),`总量 ${q}份${CROPS[id]?` · 默认留种1 · 自由消耗${Math.max(0,q-1)}`:''}<br>${ITEMS[id].M10||ITEMS[id].sellPrice!==undefined?`回收${q}份报价 ${Economy.recoveryPrice(id,q)}金币`:'不可回收'}`,(ITEMS[id].M10||ITEMS[id].sellPrice!==undefined?button('出售 / 用途',`inventory-item:${id}`):'')+(id==='fertilizer'?cmdButton('使用1份',{type:'useFertilizer'}):''),itemImage(id))).join(''):empty('这里还没有存货。成熟产物会留在田地、动物或机器上，领取后才占仓。')}</div><article class="farm-card stack"><h3>扩容到 ${st.capacity+(st.upgrades<38?25:50)}份</h3><p>无需金币或等待；每种材料 ${n}份。</p>${ingredients(Object.fromEntries(mats.map(id=>[id,n])))}${button('确认扩容',`upgrade-storage:${kind}`,'class="farm-primary"')}</article>`;
  }
  function renderMaterials(){
    const receipt=s.materials?.pending,choices=s.materialChoices||0;
    return `${tabs([['silo','粮仓'],['barn','货仓'],['materials','材料补给']],'materials')}<div class="farm-summary">生产补给 ${s.materials?.harvestCount||0} / ${FARM_CONFIG.materials.harvestCount}<br>成功收田或动物产物累积。机器成品和救济不增加计数。<br>材料选择券 ${choices} / 20 · 今日运输 ${s.daily?.trucks||0}单</div>${receipt?card('待领生产补给',`${esc(name(typeof receipt==='string'?receipt:receipt.itemId))} ×1`,cmdButton('领取工具',{type:'claimTool'},'class="farm-primary"')):''}${s.materials?.choiceReceipt?cmdButton('领取已达成的运输材料券',{type:'claimMaterialChoices'}):''}<p class="farm-muted">选择券可换已解锁扩仓或扩地材料，兑换后占货仓。NPC材料每6小时2个补缺槽，每天最多6件。</p><div class="farm-cards">${values(TOOLS).filter(t=>['storageMaterial','landMaterial'].includes(t.category)&&t.level<=s.level).map(t=>card(t.name,`库存 ${s.inventory[t.id]||0}`,cmdButton('1券兑换1件',{type:'redeemMaterial',itemId:t.id},choices?'':'disabled'),itemImage(t.id))).join('')}</div><h3>本期NPC材料</h3>${renderNpcOffers(s.npc.materialOffers||[],true)}`;
  }
  function renderItem(){
    const id=ui.entityId,item=ITEMS[id];
    if(!item)return empty('物品不存在');
    const q=s.inventory[id]||0;
    const recipes=values(RECIPES).filter(r=>r.inputs[id]);
    return `${card(item.name,`当前${q}份 · ${item.storage==='silo'?'粮仓':'货仓'}${CROPS[id]?' · 默认留种1份':''}`, '',itemImage(id))}<form class="farm-form" data-form="sell"><input type="hidden" name="itemId" value="${esc(id)}"><label>回收数量<input type="number" name="quantity" min="1" max="${q}" value="${Math.max(1,CROPS[id]?q-1:q)}" required></label>${CROPS[id]?'<label class="farm-check"><input type="checkbox" name="allowSeedReserve">本次允许使用最后1份种子</label>':''}<div class="farm-summary" data-sale-quote></div><button class="farm-primary" type="submit" ${q?'':'disabled'}>查看报价并确认回收</button></form><h3>用途</h3>${CROPS[id]?`<p>每1份可播种一块田，成熟收${CROPS[id].yieldCount}份。</p>`:''}${recipes.length?recipes.map(r=>card(r.name,`${duration(r.durationMs)} · ${name(r.machineType)}`,button('寻找生产机器',`find-machine:${r.machineType}`),'',ingredients(r.inputs))).join(''):'<p class="farm-muted">可出售或用于符合条件的订单；工具材料用于对应扩建和清理。</p>'}`;
  }
  function renderShop(){
    const tab=ui.panelTab||'facilities';
    let rows='';
    if(tab==='facilities'){
      const fieldCount=s.entities.filter(e=>e.kind==='field').length;
      rows=card('生产田',`已摆${fieldCount}/${fieldAllowance(s.level)} · 1×1格 · 即时<br>价格1金币，购后余额${s.coins-1}`,button('选择位置','purchase-field',fieldCount>=fieldAllowance(s.level)?'disabled':''),itemImage('wheat'));
      rows+=values(BUILDINGS).map(b=>{
          const exists=s.entities.filter(e=>e.configId===b.id).length,blocked=b.level>s.level||exists>0;
          return card(b.name,`${b.coins}金币 · ${b.footprint.join('×')}格 · 建造${duration(b.buildMs)}<br>${b.level}级开放 · 已有${exists}/1 · ${b.slots}个队列槽<br>购买后余额 ${s.coins-b.coins}`,button(exists?'已拥有':b.level>s.level?`${b.level}级开放`:'选择位置',`purchase:machine:${b.id}`,blocked?'disabled':''),`<img class="farm-large-art" src="${esc(farmAssetUrl(b.id,'base','building'))}" alt="">`);
        }).join('');
    }
    if(tab==='animals'){
      rows=values(ANIMALS).map(a=>{
          const shelters=s.entities.filter(e=>e.kind==='shelter'&&e.configId===a.id),tier=shelters.length,level=a.levels[tier],blocked=!level||s.level<level;
          return card(`${a.name}舍`,`${a.buildingCost}金币 · 4×4格 · 每舍${a.capacity}只<br>已有${tier}/${a.levels.length}舍 · ${level?`下座${level}级开放`:'已达上限'}<br>建栏不自动送动物`,button('选择栏舍位置',`purchase:shelter:${a.id}`,blocked?'disabled':''),`<img class="farm-large-art" src="${esc(farmAssetUrl(`${a.id}_shelter`,'base','building'))}" alt="">`)+shelters.map(e=>card(`${a.name}舍 · ${e.animals.length}/${a.capacity}只`,`单只${a.prices[e.tier||0]}金币 · 饲料${name(a.feedItem)}<br>产${name(a.product)}，不会屠宰动物`,button('打开栏舍',`entity:${e.id}`),`<img class="farm-large-art" src="${esc(farmAnimalUrl(a.id))}" alt="">`)).join('');
        }).join('');
    }
    if(tab==='orchard')rows=values(FRUITS).map(f=>card(`${f.name}${f.clearTool==='axe'?'灌木':'树'}`,`${f.coins}金币 · ${f.footprint.join('×')}格 · ${duration(f.durationMs)}一轮<br>${f.level}级开放 · 产量2、3、4、4；第三轮后需复苏`,button('选择位置',`purchase:fruit:${f.id}`,f.level>s.level?'disabled':''),itemImage(f.id))).join('');
    if(tab==='seeds')rows=values(CROPS).map(c=>card(`${c.name}补种`,`${c.buyPrice}金币 / 10份 · 粮仓占10<br>${c.level}级开放 · 仅所有可取回该作物均为0可买`,button('补种10份',`seed-buy:${c.id}`,c.level>s.level?'disabled':''),itemImage(c.id))).join('')+button('恢复资源与借种','rescue');
    if(tab==='tools')rows=values(TOOLS).filter(t=>t.category==='tool').map(t=>card(t.name,`${t.buyPrice}金币 / 件 · 库存${s.inventory[t.id]||0}<br>每天最多10件 · 今日已买${s.npc.toolBought?.[t.id]||0}`,button('购买1件',`buy-tool:${t.id}`),itemImage(t.id))).join('')+card('园艺肥料',`100金币 · 15级开放 · 库存${s.inventory.fertilizer||0}<br>30分钟内新播作物快10%；不叠加，不追溯已种作物。`,button('购买1份','buy-fertilizer',s.level<15?'disabled':'')+cmdButton('使用1份',{type:'useFertilizer'},!s.inventory.fertilizer?'disabled':''),itemImage('fertilizer'))+button('材料商店与选择券','materials');
    if(tab==='decor')rows=card('道路',`免费 · 1×1格 · 可通行地表<br>可与建筑底座叠放；不收道路税，不提供生产加成。`,button('选择道路位置','purchase:road:road'),`<img class="farm-large-art" src="${esc(farmAssetUrl('terrain.road.f'))}" alt="">`)+renderOwnedDecor()+button('故事外观与背景','appearances')+values(DECORATIONS).map(d=>card(d.name,`${d.coins}金币 · ${d.footprint.join('×')}格<br>纯装饰，无生产加成 · 可旋转和收起`,button('选择位置',`purchase:decoration:${d.id}`),`<img class="farm-large-art" src="${esc(farmAssetUrl(`decor.${decorIds[d.id]||d.id}`))}" alt="">`)).join('');
    if(tab==='vouchers'&&s.features?.constructionVouchersEnabled===false)rows=empty('当前配置关闭建设券功能，基础生产槽仍可完成全部配方。');else if(tab==='vouchers')rows=card('建设券',`500金币 / 张 · 持有${s.vouchers}<br>仅供机器扩槽、货箱扩充或园丁服务。不可卖回，不涉及真钱。`,button('购买1张','buy-voucher'),itemImage('construction_voucher'))+`<p class="farm-muted">每累计20张卡车单得1张；每到5的倍数等级得2张；完成2批面包教学得2张。也可领取有限的支线首通奖励。</p>`;
    return `${tabs([['facilities','田与工坊'],['animals','动物'],['orchard','果园'],['seeds','补种'],['tools','工具肥料'],['decor','装饰'],['vouchers','建设券']],tab)}<div class="farm-cards">${rows}</div>`;
  }
  function renderShelter(e){
    if(!e)return empty('栏舍不存在');
    const a=ANIMALS[e.configId],other=s.entities.filter(x=>x.kind==='shelter'&&x.configId===e.configId&&x.id!==e.id),credit=s.animalCredits?.[a.id]||0,price=Math.max(0,a.prices[e.tier||0]-credit);
    return `<div class="farm-summary">${a.name} ${e.animals.length} / ${a.capacity}只 · ${name(a.feedItem)} ${s.inventory[a.feedItem]||0}份<br>每只吃1份饲料，${duration(a.durationMs)}后产1份${name(a.product)}。未喂不会死亡，离线不自动再喂。</div><div class="farm-row">${cmdButton('开饭啦 · 喂全栏',{type:'feed',entityId:e.id})}${cmdButton('收进篮子 · 全栏',{type:'collectAnimal',entityId:e.id})}</div><div class="farm-row">${button('划屏同类喂养',`feed-mode:${e.configId}`)}${button(`领养1只 · ${price}金币`,`buy-animal:${e.id}`,e.animals.length>=a.capacity?'disabled':'')}</div>${credit?`<p class="farm-muted">已含领养抵扣${Math.min(credit,a.prices[e.tier||0])}金币，券剩余额保留。</p>`:''}<div class="farm-cards">${e.animals.map((animal,i)=>card(`${a.name} ${i+1}`,animal.status==='hungry'?'肚子饿啦，等你喂食':animal.status==='ready'?`<span class="farm-ready-text">${name(a.product)}可收取</span>`:timer(animal.readyAt,now()),animal.status==='hungry'?cmdButton('喂食 · 1份',{type:'feed',entityId:e.id,animalIds:[animal.id]}):animal.status==='ready'?cmdButton('收取',{type:'collectAnimal',entityId:e.id,animalIds:[animal.id]}):'',animalMarkup(animal,e.rotation||0,'farm-large-art'),other.length?`<form data-form="move-animal" class="farm-form"><input type="hidden" name="animalId" value="${animal.id}"><input type="hidden" name="entityId" value="${e.id}"><label>迁入同类栏舍<select name="targetEntityId">${other.map(x=>`<option value="${x.id}">${entityName(x)} (${x.x},${x.y}) · ${x.animals.length}/${a.capacity}</option>`).join('')}</select></label><button type="submit">迁移，保留生产计时</button></form>`:'')).join('')}</div>${button('调整栏舍位置',`edit-entity:${e.id}`)}`;
  }
  function renderMachine(e){
    if(!e)return empty('这台机器暂时找不到了');
    const b=BUILDINGS[e.configId];
    if(!e.built)return `${card(b.name,`建造${e.buildReadyAt<=now()?'已完成':timer(e.buildReadyAt,now())}<br>完工经验 +${b.xp}`,e.buildReadyAt<=now()?cmdButton('完成建造',{type:'completeBuilding',entityId:e.id},'class="farm-primary"'):'',`<img class="farm-large-art" src="${esc(entityArt(e,now()))}" alt="">`)}${button('定位',`locate:${e.id}`)}`;
    const stars=Economy.masteryStars(s,e.machineType),hours=(s.mastery[e.machineType]||0)/3600000,nextHours=b.masteryCumulativeHours[stars],slotCost=FARM_CONFIG.constructionVoucher.ordinarySlots[e.slots-b.slots];
    const mastery=`已加工 ${hours.toFixed(1)}小时${nextHours?`，下一星需累计 ${nextHours}小时`:''}。${e.machineType==='feed_mill'?'1/2/3星时，新任务快5%/10%/15%。':'1星订单金币+10%，2星订单经验+10%，3星新任务快15%；金币有统一封顶。'}`;
    const queue=e.queue.length?e.queue.map((job,i)=>card(name(job.recipeId),job.startAt===null?'等待开工 · 原料已投入':timer(job.readyAt,now()),job.startAt===null?cmdButton('取消 · 退回原料',{type:'cancelJob',entityId:e.id,jobId:job.id})+(i>0&&e.queue[i-1].startAt===null?button('上移',`queue-up:${e.id}:${job.id}`):''):'',itemImage(job.recipeId))).join(''):'<p>小机器歇一会儿，选下方配方就能开工。入队时会一次扣除所需原料。</p>';
    return `<div class="farm-production-overview"><span class="farm-mastery-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</span><span>制作 ${e.queue.length}/${e.slots}</span><span>待收 ${e.completed.length}/9批</span></div>${e.completed.length?cmdButton(`${icon(e.completed[0].recipeId)} 收进篮子 · ${e.completed.length}批`,{type:'collectMachine',entityId:e.id},'class="farm-primary farm-production-collect"'):''}${e.completed.length>=9?'<p class="farm-warning">成品区满啦，下一批暂时停工。收走成品就能继续。</p>':''}${guideNote(`制作小队 · ${e.queue.length?`${e.queue.length}项 / 点开查看`:'空闲，等你开工'}`,queue,'machine-queue')}<div class="farm-section-title"><h3>今天做什么？</h3>${e.slots<9&&s.features?.constructionVouchersEnabled!==false?button(`扩1槽 · ${slotCost}券`,`upgrade-machine:${e.id}`):'<span class="farm-chip">9个制作槽</span>'}</div><div class="farm-cards farm-recipe-cards">${values(RECIPES).filter(r=>r.machineType===e.machineType).map(r=>card(r.name,`${duration(r.durationMs)} · 产${r.yieldCount}份 · +${r.xp}经验`,cmdButton(r.level>s.level?`${r.level}级开放`:'开始制作',{type:'enqueue',entityId:e.id,recipeId:r.id},r.level>s.level?'disabled':'class="farm-primary"'),itemImage(r.id),ingredients(r.inputs))).join('')}</div>${guideNote('小机器的熟练度',mastery,'mastery')}${button('搬动机器',`edit-entity:${e.id}`)}`;
  }
  function renderFruit(e){
    if(!e)return empty('植株不存在');
    const f=FRUITS[e.configId],q=f.sequence[e.harvestStage]||0;
    return `${card(entityName(e),`${esc(entityStatus(e,now()))}<br>已采${e.harvestStage}/4轮 · 本轮${q}果 · 每果${f.xpPerFruit}经验`,e.status==='ready'?cmdButton('采收水果',{type:'harvest',entityIds:[e.id]},'class="farm-primary"'):e.status==='revive'?button(`园丁免费复苏（今日余${Math.max(0,3-(s.npc.freeRevives||0))}次）`,`revive-free:${e.id}`)+button('1建设券复苏',`revive-voucher:${e.id}`):'',`<img class="farm-large-art" src="${esc(entityArt(e,now()))}" alt="">`)}<p class="farm-muted">采收序列为2、3、4、4。第三轮后复苏一次，第四轮后终末枯萎。不会自动清理。</p>${button(`清理植株 · 消耗${name(f.clearTool)}1把`,`clear-tree:${e.id}`,'class="farm-danger"')}${button('移动植株',`edit-entity:${e.id}`)}`;
  }
  function renderObstacle(e){
    if(!e)return empty('障碍不存在');
    const tool=e.configId==='natural_tree'?'saw':e.configId==='natural_bush'?'axe':'shovel';
    return `${card(entityName(e),`位置${e.x},${e.y}<br>清理不产生额外木材或矿石，操作不可撤销。`,button(`清理 · ${name(tool)}1件`,`clear-obstacle:${e.id}:${tool}`),itemImage(tool))}${e.configId==='rock'?button('炸药：清理相邻最多2堆',`clear-obstacle:${e.id}:dynamite`)+button('TNT：清理3×3内最多3堆',`clear-obstacle:${e.id}:tnt`):''}`;
  }
  function renderNpcOffers(offers,material=false){
    return `<div class="farm-cards">${offers.map(o=>card(name(o.itemId),`${o.quantity}份 · 总价${o.coins}金币<br>购买后余额${s.coins-o.coins}`,button(o.quantity?'购买本槽':'本槽售完',`${material?'buy-material':'buy-npc'}:${o.id}`,o.quantity?'':'disabled'),itemImage(o.itemId))).join('')}</div>`;
  }
  function renderMarket(){
    if(s.features?.npcMarketEnabled===false)return empty('当前内容配置关闭了NPC市场。双仓的保底回收仍开放。')+button('去粮仓回收','storage:silo');
    const tab=ui.panelTab==='buy'?'buy':'sell';
    if(s.level<7)return empty('7级开放NPC集市。现在可以在双仓页面即时回收，1级起不限量开放。')+button('去粮仓回收','storage:silo');
    if(tab==='buy')return `${tabs([['sell','我的货箱'],['buy','逛逛货架']],'buy')}<div class="farm-summary">每6小时刷新6槽，本期已买物品不会因重进补货。<br>${timer((s.npc.supplyBatch+1)*21600000,now(),'下次刷新：')}<br>全部明确标价，不是真人市场。</div>${renderNpcOffers(s.npc.shelf)}${button('材料补缺货架','materials')}`;
    return `${tabs([['sell','我的货箱'],['buy','逛逛货架']],'sell')}${intro('把丰收装进小货箱','单机小商人会来收货，成交后记得领取金币。','basket')}${guideNote('售价与成交规则','50%档与仓库即时回收同价。75%和100%档共享每种商品的每日预算，上架时预占。成交后领取金币才到账；这里不是真人市场。')}<div class="farm-cards">${s.npc.boxes.map((box,i)=>{
          const l=box.listing;
          return card(`货箱 ${i+1}`,l?`${esc(name(l.itemId))} ×${l.quantity} · 报价${l.coins}金币<br>${l.status==='sold'?'<span class="farm-ready-text">已成交，金币待领</span>':timer(l.readyAt,now(),'预计成交：')}`:'空货箱 · 每箱一种，1至10份',l?(l.status==='sold'?cmdButton(`领取${l.coins}金币`,{type:'claimStall',boxId:box.id},'class="farm-primary"'):cmdButton('取消并退回商品',{type:'cancelStall',boxId:box.id})):button('装满这个货箱',`list-box:${box.id}`),l?itemImage(l.itemId):icon('ui.stash','large'));
        }).join('')}</div>${s.npc.boxes.length<10?button(`增加1箱 · ${FARM_CONFIG.constructionVoucher.npcBoxes[s.npc.boxes.length-5]}建设券`,'upgrade-stall'):''}${button('不限量保底回收','storage:silo')}`;
  }
  function renderListBox(){
    const items=Object.entries(s.inventory).filter(([id,q])=>q>0&&ITEMS[id]?.M10);
    if(!items.length)return empty('没有可上架商品，先收获或生产。');
    return `<form class="farm-form" data-form="list-stall"><input type="hidden" name="boxId" value="${esc(ui.entityId)}"><label>商品<select name="itemId">${items.map(([id,q])=>`<option value="${esc(id)}">${esc(name(id))} · 库存${q}</option>`).join('')}</select></label><label>数量（每箱1至10份）<input name="quantity" type="number" min="1" max="10" value="1" required></label><label>售价档位<select name="tier"><option value="0.75">75%报价 · 基础10分钟</option><option value="1">100%报价 · 基础30分钟</option><option value="0.5">50%报价 · 基础2分钟（推荐直接回收）</option></select></label><label class="farm-check"><input type="checkbox" name="allowSeedReserve">本次允许用掉最后1份种子</label><div class="farm-summary" data-stall-quote></div><button type="submit" class="farm-primary">确认上架</button></form>`;
  }
  function renderOrders(){
    if(s.level<4)return empty('4级开放卡车订单。先收田、收动物产物或领取加工品来获得经验。');
    return `${intro('小卡车，准备出发！',`今日送达 ${s.daily.trucks} 单 · 累计 ${s.stats.trucks||0} 单`,'basket')}${guideNote('送货还有小奖励','每累计20单得1建设券。12级起，每日完成3/6/10单分别获得1/1/2枚材料选择券。')}<div class="farm-cards">${s.orders.map((o,i)=>o.state==='cooldown'?card(`订单 ${i+1}`,timer(o.readyAt,now(),'补单：')):card(`${({normal:'日常',experience:'经验',coin:'金币'})[o.kind]||'卡车'}订单 ${i+1}`,`${o.coins}金币 + ${o.xp}经验 · 报价创建后固定`,button('交付订单',`submit-order:${o.id}`)+button('换一张',`discard-order:${o.id}`),'',ingredients(o.requirements))).join('')}</div>${button('查看材料奖励','materials')}`;
  }
  function renderLand(){
    const p=LAND_PATCHES.find(p=>p.id===ui.entityId);
    if(!p)return `<p class="farm-muted">普通扩地22级开放，面积扩展不增加田地额度。点击地图未开垦区，或从下方选择。</p><div class="farm-cards">${LAND_PATCHES.filter(p=>!s.openedLand.includes(p.id)).map(p=>card(`地块 ${p.id.slice(-2)}`,`位置 ${p.x},${p.y} · 8×8格 · 每种材料${p.land_deed}`,button('查看地块',`land:${p.id}`))).join('')}</div>`;
    const eligibility=canExpandLand(s,p.id);
    return `<div class="farm-summary">地块 ${p.id.slice(-2)} · 坐标 ${p.x},${p.y}<br>增加64格土地，不增加等级田额度；无金币或等待门槛。</div>${ingredients({land_deed:p.land_deed,mallet:p.mallet,marker_stake:p.marker_stake})}<p class="farm-muted">解锁后固定生成3石堆与1自然树，剩余空地可直接使用。</p>${!eligibility.ok?`<p class="farm-warning">${esc(eligibility.message)}</p>`:''}${button('确认开垦',`expand-land:${p.id}`,!eligibility.ok?'disabled class="farm-primary"':'class="farm-primary"')}${button('定位地块',`locate-land:${p.id}`)}`;
  }
  function renderRescue(){
    const r=Economy.rescueEligibility(s),emptyFields=s.entities.filter(e=>e.kind==='field'&&!e.crop),recoverable=s.entities.filter(e=>readyCount(e,now())||e.kind==='field'&&e.crop?.itemId==='wheat'||e.kind==='machine'&&e.queue.some(j=>j.startAt===null&&j.inputs.wheat));
    return `<div class="farm-summary">可取回小麦 ${r.recoverableWheat}份 · 可恢复资产估值 ${r.recoverableCoins}金币<br>${r.activeLoan?'已有一株救济小麦，不能叠加。':r.eligible?'符合借种条件：可在一块空田直接借种。':'先领取、退回或出售现有资源，再判断是否需要补种。'}</div><p>借种1份，成熟产2份并自动归还1份，净入库1份。正常收获经验，不计工具掉落点；不会发放可倒卖的免费种包。</p>${r.eligible&&emptyFields.length?`<label>选择空田<select data-rescue-field>${emptyFields.map(e=>`<option value="${e.id}">${e.id} · ${e.x},${e.y}</option>`).join('')}</select></label>${button('确认在空田借种','rescue-plant','class="farm-primary"')}`:''}${!emptyFields.length?'<p class="farm-warning">先等待或收获，腾出一块空田。</p>':''}<h3>先检查可取回资源</h3>${recoverable.length?recoverable.map(e=>card(entityName(e),esc(entityStatus(e,now())),button('查看',`entity:${e.id}`))).join(''):empty('田地和机器暂无可取回小麦')}<div class="farm-row">${button('查看双仓','storage:silo')}${button('待领交易 / 可退货箱','market')}${button('等级与支线奖励','tasks')}</div>${button('正常补种10小麦 · 45金币','seed-buy:wheat')}`;
  }
  const achievements=[['fieldHarvests','收田',[100,1000,10000]],['machineBatches','加工',[30,300,3000]],['feeds','喂养',[30,300,3000]],['trucks','卡车',[20,200,2000]],['npcSales','NPC成交',[10,100,1000]],['storageUpgrades','扩仓',[2,10,30]],['landExpansions','扩地',[1,8,24]],['machineTypes','机器种类',[3,8,12]],['layoutSaves','布局保存',[1,10,50]],['stageVictories','支线首通',[6,12,24]]];
  function renderTasks(){
    const tab=ui.panelTab==='achievements'?'achievements':ui.panelTab==='guide'?'guide':'rewards';
    let body='';
    if(tab==='rewards'){
      const receipts=values(s.rewards).filter(r=>!r.claimed);
      body=`${intro('小礼物等你来领','有空位就装进仓库，暂时放不下的会留在这里。')}${guideNote('奖励领取说明','达到物品解锁等级且有仓容时可部分领取。奖励只发一次，不因刷新或重复通关再次发放。')}${receipts.length?receipts.map(r=>card(r.source==='level'?'升级赠种':r.source==='stage'?'故事礼物':'牧场礼物',Object.entries(r.items).filter(([,q])=>q).map(([id,q])=>`${name(id)} ×${q}${(ITEMS[id]?.level||1)>s.level?`（${ITEMS[id].level}级可领）`:''}`).map(esc).join('<br>'),cmdButton('领取当前可领部分',{type:'claimReward',receiptId:r.id}))).join(''):empty('没有未领实物奖励。继续经营或探索牧场故事。')}${button('生产补给与材料券','materials')}`;
    }
    if(tab==='achievements')body='<p class="farm-muted">每档成就只奖励铜、银、金主题装饰，不发金币或经验。已获得的装饰可在布置中安置。</p>'+achievements.map(([key,label,thresholds],i)=>{
        const count=key==='machineTypes'?new Set(s.entities.filter(e=>e.kind==='machine'&&e.built).map(e=>e.machineType)).size:s.stats[key]||0;
        return card(label,`累计 ${count} · 铜${thresholds[0]} / 银${thresholds[1]} / 金${thresholds[2]}`,thresholds.map((v,j)=>pill(count>=v?`${['铜','银','金'][j]}已达成`:`${['铜','银','金'][j]}未达成`)).join(''),`<img class="farm-large-art" src="${esc(farmAssetUrl(`decor.badge.g${String(i+1).padStart(2,'0')}-${count>=thresholds[2]?'gold':count>=thresholds[1]?'silver':'bronze'}`))}" alt="">`);
      }).join('');
    if(tab==='guide'){
      const steps=[['T01','认识牧场入口','从房子进入牧场，随时可用左上角回到原绘本。','help'],['T02','移动地图并回田','在移动模式拖动地图，再点回田。','close'],['T03','一笔播种至少3田','选择种植和小麦，划过至少3块空田后抬手。','plant'],['T04','喂养初始3只鸡','到鸡舍，用初始鸡饲料喂3只鸡。','entity:shelter_chicken_1'],['T05','完成第一次收获','小麦2分钟成熟，首次收获开放牧场故事。','fields'],['T06','收获后再播一田','留一份小麦作为下轮种子，可持续经营。','plant'],['T07','完成一笔保底回收','只回收多余库存；出售不增加经验。','storage:silo'],['T08','认识粮仓与货仓','分别打开两个仓库，认识分仓和留种。','storage:barn'],['T09','保存一次合法布局','移动现有设施即可，无需额外购买装饰。','mode:layout'],['T10','建成面包房','达到2级，20金币建造，10秒后点完成。','shop'],['T11','排入一批面包','3小麦制作1面包，入队时一次扣料。','find-machine:bakery'],['T12','饲料机开工','达到3级，5金币建饲料机，投料制作鸡饲料。','shop'],['T13','收取第一轮鸡蛋','喂养20分钟后收蛋，收完需再次喂食。','entity:shelter_chicken_1'],['T14','完成2批面包','领取2批面包后一次性获得2建设券。','find-machine:bakery'],['T15','交第一张卡车单','4级开放，只领取订单明示的币与经验。','orders'],['T16','完成NPC高价交易','7级开放，75%或100%档成交后领取金币。','market'],['T17','第一次扩仓或到12级','认识生产补给、运输选择券和材料补缺。','materials']];
      body=`${intro('一起来照顾小牧场',`已经学会 ${Object.values(s.tutorial.completed||{}).filter(Boolean).length}/17 件小事。慢慢来，不着急。`,'sheep')}<div class="farm-cards">${steps.map(([id,title,text,target])=>card(`${s.tutorial.completed?.[id]?'✓ ':''}${title}`,text,button('前往',target))).join('')}</div>${cmdButton('跳过引导提示',{type:'tutorialEvent',event:'skip'})}${button('完整操作说明','help')}`;
    }
    return tabs([['rewards','待领奖励'],['guide','教学任务'],['achievements','成就']],tab)+body;
  }
  function renderStages(){
    if(s.features?.farmLinkageEnabled===false)return empty('当前内容配置关闭了三消联动，农场仍可独立经营。');
    if(!s.branch?.unlocked)return empty('第一次收获后开放牧场故事。农场正常经营不要求每天打三消。');
    return `${intro('忙里偷闲，翻一页故事','找出三张一样的牌，把小礼物带回家。','sheep')}${guideNote('故事奖励与规则','叠牌三消：只能选择未被遮挡的牌，7个收集格里凑齐3张同类即可消除。仅首通发永久奖励，重玩只更新成绩；失败不损失农场产物。')}<div class="farm-stage-grid">${FARM_CONFIG.linkage.map((stage,i)=>{
          const record=s.branch.stages[stage.stageId],open=i===0||s.branch.stages[FARM_CONFIG.linkage[i-1].stageId]?.won;
          return button(`<strong>第 ${i+1} 章</strong>${icon(record?.won?'ui.branch_replay':open?'ui.branch_first_clear':'ui.branch_locked')}<span>${esc(stage.label)}</span><span>${record?.won?'已首通 · 可重玩':open?'可以开始':'先通上一关'}</span>`,`stage:${stage.stageId}`,`${open?'':'disabled'} class="${record?.won?'complete':''}"`);
        }).join('')}</div>${button('看看待领奖励','tasks')}`;
  }
  function renderLayoutDetails(){
    if(!ui.draft)return empty('尚未进入布置');
    const e=worldEntities().find(e=>e.id===ui.selected),validation=validateLayout(s,ui.draft);
    return `<p class="farm-muted">选中物件后拖动吸附网格。下方精确坐标和方向按钮可代替拖动。保存前检查占地、门口与固定入口连通。</p>${e?`<div class="farm-summary">${esc(entityName(e))} · ${e.x},${e.y} · 旋转${e.rotation||0}°</div>${!isFixedEntity(e)?`<form data-form="layout-position" class="farm-form"><div class="farm-row"><label>横坐标X<input type="number" name="x" min="0" max="63" value="${e.x}"></label><label>纵坐标Y<input type="number" name="y" min="0" max="63" value="${e.y}"></label></div><button type="submit">放入草稿</button></form><div class="farm-row">${button('旋转90°','rotate-entity',['field','road'].includes(e.kind)?'disabled':'')}${canStoreEntity(e)?button(e.stored?'重新摆出':'收起装饰','stash-entity'):''}</div>`:'<p>固定房屋和自然障碍不能在布置中移动；障碍需在普通模式消耗工具清理。</p>'}`:empty('还没有选中物件，先在地图点选。')}<label>选取物件<select data-layout-entity><option value="">请选择</option>${worldEntities().map(e=>`<option value="${e.id}" ${ui.selected===e.id?'selected':''}>${esc(entityName(e))} · ${e.x},${e.y}${e.stored?'（已收起）':''}</option>`).join('')}</select></label>${validation.ok?'<p class="farm-ready-text">当前布局合法，可以保存。</p>':`<ul class="farm-conflict-list">${validation.errors.slice(0,12).map(e=>`<li>${esc(e.message)} ${e.id?button('定位',`locate:${e.id}`):''}</li>`).join('')}</ul>`}<div class="farm-row">${button('重做','redo',!ui.redo.length?'disabled':'')}${button('布置方案','layout-slots')}</div>${button('返回地图继续布置','close')}`;
  }
  function renderOwnedDecor(){
    const entries=Object.entries(s.decorations||{}).filter(([id,q])=>q>0&&decorationConfig(id));
    return entries.length?'<h3>已获得的装饰</h3>'+entries.map(([id,q])=>{
        const placed=s.entities.filter(e=>e.kind==='decoration'&&e.configId===id),free=q-placed.length;
        return card(name(id),`拥有${q} · 已安置${placed.length} · 待安置${free}`,free>0?button('免费安置',`place-owned:${id}`):placed.filter(e=>e.stored).map(e=>button('重新摆出',`edit-entity:${e.id}`)).join(''),`<img class="farm-large-art" src="${esc(farmAssetUrl(decorAssetId(id)))}" alt="">`);
      }).join(''):'';
  }
  function renderAppearances(){
    return '<p class="farm-muted">外观只改变画面，不增加生产收益。通过有限的牧场故事首通奖励获得。</p><h3>建筑花纹</h3>'+Object.entries(COSMETICS).filter(([,c])=>c.target).map(([id,c])=>card(c.name,s.decorations[id]?'已获得':'尚未获得首通奖励',s.decorations[id]?s.entities.filter(e=>e.kind==='shelter'&&e.configId===c.target).map(e=>button(`用于${entityName(e)} (${e.x},${e.y})`,`set-skin:${e.id}:${id}`)).join(''):'')).join('')+'<h3>故事牌局背景</h3>'+[['default','默认春日'],['background_1','春田晨光'],['background_2','牧野星光']].map(([id,label])=>button(`${label}${s.cosmetics?.background===id?' · 使用中':''}`,`set-background:${id}`,id!=='default'&&!s.ledger[id]?'disabled':'')).join('');
  }
  function renderLayoutSlots(){
    return `${intro('把喜欢的布置收藏起来','免费保存2套，换个心情就换个摆法。','tools')}${guideNote('布置方案怎么用','方案只保存现有物件位置，不复制建筑或作物。新增、缺失或重叠物件会阻止套用，现有布局保持不变。')}<div class="farm-cards">${[0,1].map(slot=>card(`布局方案 ${slot+1}`,s.layoutSlots?.[slot]?`已保存 ${s.layoutSlots[slot].length}个实体坐标`:'还没有保存方案',button('保存当前草稿',`save-slot:${slot}`)+button('读入草稿',`load-slot:${slot}`,s.layoutSlots?.[slot]?'':'disabled'))).join('')}</div>${renderOwnedDecor()}<h3>已收起装饰</h3>${entityList(e=>e.stored&&canStoreEntity(e))||empty('没有收起的装饰')}`;
  }
  function renderMore(){
    const entries=[['shop','ui.shop','商店'],['orders','ui.orders','订单'],['market','ui.stash','集市'],['tasks','ui.tasks','成长手册'],['fields','ui.sow','我的田'],['materials','ui.build','材料补给'],['land','ui.layout','开垦土地'],['appearances','ui.farm_branch','换新装'],['settings','ui.sound','设置'],['help','ui.info','小贴士'],['exit','ui.home','回到首页']];
    if(s.branch?.unlocked&&s.features?.farmLinkageEnabled!==false)entries.splice(4,0,['stages','ui.farm_branch','牧场故事']);
    const layout=ui.mode==='layout'?`<div class="farm-row">${button('重做布置','redo',!ui.redo.length?'disabled':'')}${button('布置方案','layout-slots')}</div>`:'';
    return `${layout}<div class="farm-menu-grid">${entries.map(([action,art,label])=>button(`${icon(art)}<span>${label}</span>`,action)).join('')}</div><p class="farm-menu-note">顶部状态可以直接点开，底部工具随手就能用。</p>`;
  }
  function renderSettings(){
    const info=store.getStatus?.()||store.status||{},recoveries=store.recoveries?.()||[];
    const saveState=info.recoveryRequired?'存档需要恢复，原文件已保留':info.readOnly||store.readOnly?'此窗口只读，暂不能保存':'小牧场已开启自动保存';
    const volume=Math.round(clamp(Number(getMusicVolume())||0,0,1)*100);
    return `${intro('让牧场陪你慢慢过日子',saveState,'sheep')}${[...(info.warnings||[]),...(info.error?[info.message||String(info.error)]:[])].map(x=>`<p class="farm-warning farm-reading">${esc(x)}</p>`).join('')}<section class="farm-radio"><h3>${icon('ui.sound')} 小羊收音机</h3><div class="farm-settings-group">${[['sound','听听农场的声音'],['music','播放轻快的音乐'],['reducedMotion','少一点动态，更安静']].map(([key,label])=>`<label class="farm-check"><input type="checkbox" data-setting="${key}" ${s.settings?.[key]?'checked':''}><span>${label}</span></label>`).join('')}<label class="farm-volume-label" for="farm-music-volume">音乐音量 <output data-volume-output>${volume}%</output></label><input id="farm-music-volume" type="range" min="0" max="100" step="1" value="${volume}" data-music-volume aria-label="音乐音量"></div></section><h3>给进度留一份备份</h3><div class="farm-row">${button(`${icon('ui.export')} 导出存档`,'export')}${button(`${icon('ui.import')} 导入存档`,'import')}</div><input type="file" accept=".json,application/json" data-import-file hidden><p class="farm-warning farm-reading">进度存在本浏览器。清理网站数据或退出隐私模式可能丢失，请记得导出备份。导入会先校验，确认后才替换，并保留当前备份。</p>${button('看看牧场小贴士','help')}${guideNote('找回之前的进度',`<p>恢复会替换当前进度，先备份、再确认。</p>${recoveries.length?recoveries.slice(0,2).map((r,i)=>card(i?'上一份备份':'最近一份备份',`${new Date(r.savedAtWallMs||r.savedAt||s.now).toLocaleString()}${r.level?` · ${r.level}级`:''}`,button('查看并恢复',`recover:${r.revision}`))).join(''):empty('还没有较早的备份，之后会自动保存。')}${button('重新读取本机存档','reload-save')}${store.readOnly?button('尝试接管写入','takeover'):''}`,'recovery')}${guideNote('高级存档信息',`内容版本 ${esc(s.contentVersion)}<br>存档修订 ${s.revision} · ${esc(saveState)}<br>生产按真实时间推进。离线只完成已安排的生产，不自动反复收货。`,'advanced-save')}<p class="farm-notice-link"><a href="${esc(FARM_ART_CREDITS)}" target="_blank" rel="noopener">画笔小伙伴 · 素材授权与来源</a></p>`;
  }
  function renderHelp(){
    return `<div class="farm-cards">${[['移动与缩放','移动模式单指拖地图不会播种或收获。双指可平移缩放；也可使用＋、−和回田按钮。'],['免费划种划收','先明确选择种植/收获模式，划过目标后抬手一次提交。同一田回划只处理一次。种子或仓容不足时只处理可执行目标，不自动购买。'],['整笔取消','第二根手指、切后台、窗口失焦、旋转屏幕、滑入工具栏或系统取消会丢弃整笔预览，库存保持不变。'],['键盘与读屏','地图用方向键移动、＋−缩放；Tab访问所有按钮。田地列表提供逐田种收，布局面板可输入精确坐标，不强制触屏。'],['留种与恢复','加工、出售和订单默认保留最后1份田作物。确认后可仅对当前操作解除。断种先检查在田、队列退款、货箱和奖励，再补种或借种。'],['布局不会丢生产','布置是独立坐标草稿。生产计时继续，保存只改位置。取消、撤销、重做只影响布局，不撤回经济事务。'],['单机与离线','没有真钱付费、服务器市场或真人交易。关闭页面不会枯萎或饿死；已投料的有限生产继续。设备时间可影响成熟，客户端无法保证反作弊。']].map(([t,d])=>guideNote(t,d)).join('')}</div>`;
  }
  function renderPanel(){
    if(!ui.panel)return;
    let title='',html='';
    const e=s.entities.find(e=>e.id===ui.entityId);
    switch(ui.panel){
      case'more':
      title='牧场小口袋';
      html=renderMore();
      break;
      case'confirm':
      title=ui.confirm?.title||'确认';
      html=`${intro('再确认一下，就准备好啦','费用、数量和进度变化都写在下面。','basket')}<p class="farm-confirm-copy farm-reading">${esc(ui.confirm?.text||'')}</p><div class="farm-row">${button('取消','confirm-no')}${button(ui.confirm?.label||'确认','confirm-yes','class="farm-primary"')}</div>`;
      break;
      case'plant':
      title='今天种点什么？';
      html=renderPlant();
      break;
      case'fields':
      title='我的小田田';
      html=renderFields();
      break;
      case'field':
      title='田间小日记';
      html=renderField(e);
      break;
      case'storage':
      title='满满的小仓库';
      html=ui.panelTab==='materials'?renderMaterials():renderStorage();
      break;
      case'materials':
      title='工具补给站';
      html=renderMaterials();
      break;
      case'inventory-item':
      title='收获小口袋';
      html=renderItem();
      break;
      case'shop':
      title='田园杂货铺';
      html=renderShop();
      break;
      case'shelter':
      title=e?entityName(e):'动物栏';
      html=renderShelter(e);
      break;
      case'machine':
      title=e?entityName(e):'生产机器';
      html=renderMachine(e);
      break;
      case'fruit':
      title='果园';
      html=renderFruit(e);
      break;
      case'obstacle':
      title='清理障碍';
      html=renderObstacle(e);
      break;
      case'market':
      title='乡间小集市';
      html=renderMarket();
      break;
      case'list-box':
      title='摆好我的小货箱';
      html=renderListBox();
      break;
      case'orders':
      title='送货小木牌';
      html=renderOrders();
      break;
      case'land':
      title='开垦新天地';
      html=renderLand();
      break;
      case'rescue':
      title='种子救急站';
      html=renderRescue();
      break;
      case'tasks':
      title='成长小手册';
      html=renderTasks();
      break;
      case'stages':
      title='牧场故事 · 24关';
      html=renderStages();
      break;
      case'layout-details':
      title='布置物件';
      html=renderLayoutDetails();
      break;
      case'layout-slots':
      title='我的布置图册';
      html=renderLayoutSlots();
      break;
      case'settings':
      title='牧场小管家';
      html=renderSettings();
      break;
      case'appearances':
      title='牧场换新装';
      html=renderAppearances();
      break;
      case'help':
      title='牧场小贴士';
      html=renderHelp();
      break;
      case'house':
      title='欢迎回到牧场小屋';
      html='<p>经营可以独立进行，三消只是旁边的一段牧场故事。先安排好作物和生产，再慢慢探索。</p>'+button('查看教学与任务','tasks')+button('设置与存档','settings')+button('返回原绘本首页','exit');
      break;
      case'road':
      case'decoration':
      title=e?entityName(e):'装饰';
      html='<p>纯装饰，不增加生产收益。</p>'+button('移动或收起',`edit-entity:${e?.id}`);
      break;
      default:
      title='牧场';
      html=empty('请选择经营入口');
    }
    const panelKey=`${ui.panel}:${ui.entityId}:${ui.panelTab}`,preserve=panelKey===ui.renderedPanelKey;
    ui.renderedPanelKey=panelKey;
    const scroll=preserve?content.scrollTop:0,active=document.activeElement,hadFocus=overlay.contains(active),activeAction=active?.dataset?.action,activeCommand=active?.dataset?.command,controls=[...content.querySelectorAll('input,select,textarea')],activeIndex=controls.indexOf(active),saved=preserve?controls.map(el=>({name:el.name,type:el.type,value:el.value,checked:el.checked})):[];
    app.querySelector('.farm-panel').dataset.panel=ui.panel;
    app.querySelector('.farm-panel-head').innerHTML=`${doodle(['settings','tasks','help','house'].includes(ui.panel)?'sheep':['shop','plant','rescue'].includes(ui.panel)?'seed':['layout-details','layout-slots'].includes(ui.panel)?'tools':'basket')}<h2 id="farm-panel-title">${esc(title)}</h2>${button('×','close','aria-label="关闭面板" class="farm-icon-only"')}`;
    const detailsOpen=preserve?new Map([...content.querySelectorAll('details[data-guide]')].map(el=>[el.dataset.guide,el.open])):new Map();
    const activeGuide=active?.tagName==='SUMMARY'?active.parentElement?.dataset?.guide:null;
    content.innerHTML=html;
    for(const el of content.querySelectorAll('details[data-guide]'))if(detailsOpen.has(el.dataset.guide))el.open=detailsOpen.get(el.dataset.guide);
    const fresh=[...content.querySelectorAll('input,select,textarea')];
    for(
      let i=0
      ;i<fresh.length;i++){
      const before=saved[i],el=fresh[i];
      if(before&&before.name===el.name&&before.type===el.type&&el.type!=='file'&&el.type!=='hidden'){
        el.value=before.value;
        el.checked=before.checked;
      }
    }
    content.scrollTop=scroll;
    overlay.hidden=false;
    if(hadFocus){
      const target=activeGuide?[...content.querySelectorAll('details[data-guide]')].find(el=>el.dataset.guide===activeGuide)?.querySelector('summary'):activeIndex>=0?fresh[activeIndex]:activeAction?[...overlay.querySelectorAll('[data-action]')].find(el=>el.dataset.action===activeAction):activeCommand?[...overlay.querySelectorAll('[data-command]')].find(el=>el.dataset.command===activeCommand):null;
      (target||overlay.querySelector('.farm-panel-head button'))?.focus({preventScroll:true});
    }
    updateFormQuotes();
  }
  function startLayout(){
    cancelGesture();
    ui.mode='layout';
    ui.undo=[];
    ui.redo=[];
    ui.placing=null;
    const saved=store.loadDraft?.();
    ui.draft=beginLayout(s);
    closePanel();
    render();
    if(saved?.positions||saved?.draft?.positions){
      const draft=saved.draft||saved;
      ask('继续上次未保存的布置？','生产状态始终来自正式农场。继续只恢复位置草稿，不恢复旧库存或计时。',()=>{
          ui.draft=draft;
          closePanel();
          render();
        },'继续布置');
    }
    status('布置模式：先选物件，再拖动；空地拖图。保存只改变位置。');
  }
  function finishLayout(){
    clearTimeout(ui.draftTimer);
    store.clearDraft?.();
    ui.draft=null;
    ui.undo=[];
    ui.redo=[];
    ui.selected=null;
    ui.mode='pan';
    closePanel();
    render();
  }
  async function saveLayout(){
    const check=validateLayout(s,ui.draft);
    if(!check.ok){
      status(check.errors[0]?.message||'布局不合法',true);
      openPanel('layout-details');
      return;
    }
    const result=await dispatch({type:'applyLayout',positions:ui.draft.positions},{success:'新布局已保存，所有生产与计时保留'});
    if(result.ok)finishLayout();
  }
  function cancelLayout(onDone){
    const changed=ui.draft&&JSON.stringify(ui.draft.positions)!==JSON.stringify(beginLayout(s).positions);
    if(changed)ask('放弃未保存的布置？','只放弃这份位置草稿，正式农场的生产、库存和时间不变。',()=>{
        finishLayout();
        onDone?.();
      },'放弃草稿');else{
      finishLayout();
      onDone?.();
    }
  }
  function setMode(mode){
    if(ui.mode==='layout'&&mode!=='layout'){
      cancelLayout(()=>setMode(mode));
      return;
    }
    cancelGesture();
    hideQuickTools();
    setCameraTools(false);
    ui.placing=null;
    if(mode==='layout'){
      startLayout();
      return;
    }
    ui.mode=mode;
    closePanel();
    if(mode==='plant')openPanel('plant');
    status(mode==='pan'?'移动模式：单指拖图，轻点查看设施。':mode==='harvest'?'划过成熟田和果树，抬手一次收获；双指或进入工具栏取消整笔。':'先选一种作物，再在空田上划动。');
    render();
  }
  function purchasePlacement(category,id,owned=false){
    if(ui.mode==='layout'){
      toast('先保存或取消布置，再购买设施');
      return;
    }
    const config=category==='road'?{name:'道路',coins:0,footprint:[1,1]}:category==='field'?{name:'生产田',coins:1,footprint:[1,1]}:category==='machine'?BUILDINGS[id]:category==='shelter'?ANIMALS[id]:category==='fruit'?FRUITS[id]:decorationConfig(id)||{name:'奖励装饰',coins:0,footprint:id?.includes('bridge')?[2,1]:[1,1]};
    const r=view.getBoundingClientRect(),point=screenToWorld(r.left+r.width/2,r.top+r.height/2);
    ui.placing={
      category,
      kind:category==='road'?'road':category==='machine'?'machine':category==='shelter'?'shelter':category==='fruit'?'fruit':category==='field'?'field':'decoration',
      configId:id||'field',
      x:Math.floor(point.x),
      y:Math.floor(point.y),
      w:config.footprint[0],
      h:config.footprint[1],
      rotation:0,
      label:config.name,
      cost:owned?0:config.coins??config.buildingCost,
      owned,
      crop:null,
      animals:[],
      queue:[],
      completed:[],
      built:true
    };
    ui.mode='pan';
    closePanel();
    status('在地图上点击或拖动选择位置，确认后才扣金币。');
    render();
  }
  function confirmBuy(title,cost,command,quantityLabel=''){
    ask(`购买${title}？`,`${quantityLabel||title}，总价${cost}金币。当前${s.coins}金币，购买后${s.coins-cost}金币。确认后不可撤销；物品会按规则占用仓容。`,async()=>{
        backFromConfirm();
        await dispatch(command);
      },'确认购买');
  }
  function editPosition(mutator){
    if(!ui.draft||!ui.selected)return;
    const next=ui.draft.positions.map(p=>p.id===ui.selected?mutator({...p}):p);
    changedDraft(next);
    renderPanel();
  }
  function clearObstacles(id,tool){
    const e=s.entities.find(e=>e.id===id);
    if(!e)return;
    const targets=[e];
    if(['dynamite','tnt'].includes(tool)){
      const limit=tool==='tnt'?3:2;
      for(const x of s.entities.filter(x=>x.kind==='obstacle'&&x.configId==='rock'&&x.id!==e.id)){
        if(targets.length>=limit)break;
        if(tool==='dynamite'?Math.abs(x.x-e.x)+Math.abs(x.y-e.y)<=1:Math.abs(x.x-e.x)<=1&&Math.abs(x.y-e.y)<=1)targets.push(x);
      }
    }
    ui.selected=id;
    renderMap();
    for(const target of targets)entityLayer.querySelector(`[data-entity="${CSS.escape(target.id)}"]`)?.classList.add('is-selected');
    ask('确认清理障碍？',`消耗${name(tool)}1件（持有${s.inventory[tool]||0}），清理${targets.length}个障碍：${targets.map(e=>`(${e.x},${e.y})`).join('、')}。不返工具，不产资源，操作不可撤销。`,()=>dispatch({type:'clearObstacle',entityIds:targets.map(e=>e.id),toolId:tool,confirmed:true},{close:true}),'消耗工具并清理');
  }
  async function action(value){
    const [a,...rest]=value.split(':'),id=rest.join(':');
    if(ui.mode==='layout'&&['stage','import','recover','reload-save','buy-tool','buy-fertilizer','buy-voucher','buy-animal','seed-buy','buy-npc','buy-material','submit-order','discard-order','expand-land','place-owned'].includes(a)){
      toast('布置期间不可进行经营或替换存档，请先保存或取消布置');
      return;
    }
    if(a==='close'){
      if(ui.panel==='confirm')backFromConfirm();else closePanel();
      return;
    }
    if(a==='quick-close'){hideQuickTools();return;}
    if(a==='camera-menu'){setCameraTools(app.querySelector('.farm-camera-popover').hidden);return;}
    if(a==='shop-tab'){ui.panelTab=id;openPanel('shop');return;}
    if(a==='confirm-no'){
      backFromConfirm();
      return;
    }
    if(a==='confirm-yes'){
      const confirm=ui.confirm;
      ui.confirm=null;
      if(confirm){
        await confirm.onYes();
        if(ui.panel==='confirm'&&!ui.confirm)backFromConfirm();
      }
      return;
    }
    if(a==='mode'){
      setMode(id);
      return;
    }
    if(a==='tab'){
      ui.panelTab=id;
      if(ui.panel==='materials'&&['silo','barn'].includes(id))ui.panel='storage';
      renderPanel();
      return;
    }
    if(a==='storage'){
      ui.panelTab=id;
      openPanel('storage');
      dispatch({type:'tutorialEvent',event:id==='silo'?'openSilo':'openBarn'},{success:'作物和水果进入粮仓，产品、饲料与工具进入货仓'});
      return;
    }
    if(a==='entity'){
      openEntity(id);
      return;
    }
    if(a==='locate'){
      const e=worldEntities().find(e=>e.id===id);
      if(e){
        center(e.x+e.w/2,e.y+e.h/2);
        ui.selected=id;
        closePanel();
        renderMap();
      }
      return;
    }
    if(a==='locate-land'){
      const p=LAND_PATCHES.find(p=>p.id===id);
      if(p){
        center(p.x+4,p.y+4);
        closePanel();
      }
      return;
    }
    if(a==='land'){
      openPanel('land',id);
      return;
    }
    if(a==='center'){
      cancelGesture();
      center();
      saveCamera();
      dispatch({type:'tutorialEvent',event:'returnToFields'},{success:'已回到田地'});
      return;
    }
    if(a==='zoom-in'){
      zoomTo(ui.zoom+.25);
      return;
    }
    if(a==='zoom-out'){
      zoomTo(ui.zoom-.25);
      return;
    }
    if(a==='exit'){
      cancelGesture();
      if(ui.mode==='layout'){
        cancelLayout(onExit);
        return;
      }
      onExit();
      return;
    }
    if(a==='select-crop'){
      ui.cropId=id;
      ui.mode='plant';
      closePanel();
      status(`已选择${name(id)}，划过空田后抬手播种。库存${s.inventory[id]||0}份，不会自动购买。`);
      render();
      return;
    }
    if(a==='plant-one'){
      const itemId=content.querySelector('[data-field-crop]')?.value||ui.cropId;
      await dispatch({type:'plant',entityIds:[ui.entityId],itemId});
      return;
    }
    if(a==='inventory-item'){
      openPanel('inventory-item',id);
      return;
    }
    if(a==='purchase-field'){
      purchasePlacement('field','field');
      return;
    }
    if(a==='purchase'){
      purchasePlacement(rest[0],rest[1]);
      return;
    }
    if(a==='place-owned'){
      purchasePlacement('decoration',id,true);
      return;
    }
    if(a==='cancel-placement'){
      ui.placing=null;
      render();
      status('已取消选址，未购买');
      return;
    }
    if(a==='rotate-placement'){
      if(!['field','road'].includes(ui.placing.kind))ui.placing.rotation=(ui.placing.rotation+90)%360;
      renderMap();
      return;
    }
    if(a==='confirm-placement'){
      const p=ui.placing;
      if(!p)return;
      const result=await dispatch(p.owned?{type:'placeDecoration',configId:p.configId,x:p.x,y:p.y,rotation:p.rotation}:{type:'buy',category:p.category,configId:p.configId,x:p.x,y:p.y,rotation:p.rotation,quantity:1});
      if(result.ok){
        ui.placing=null;
        render();
      }
      return;
    }
    if(a==='seed-buy'){
      const c=CROPS[id];
      confirmBuy(`${c.name}补种`,c.buyPrice,{type:'buy',category:'seed',itemId:id,quantity:10},`${c.name}10份（仅无任何可取回同作物时可购）`);
      return;
    }
    if(a==='buy-tool'){
      const t=TOOLS[id];
      confirmBuy(t.name,t.buyPrice,{type:'buy',category:'tool',itemId:id,quantity:1});
      return;
    }
    if(a==='buy-fertilizer'){
      confirmBuy('园艺肥料',100,{type:'buy',category:'fertilizer',quantity:1});
      return;
    }
    if(a==='buy-voucher'){
      confirmBuy('建设券',500,{type:'buy',category:'voucher',quantity:1});
      return;
    }
    if(a==='buy-animal'){
      const e=s.entities.find(e=>e.id===id),a=ANIMALS[e.configId],cost=Math.max(0,a.prices[e.tier]-(s.animalCredits?.[a.id]||0));
      confirmBuy(a.name,cost,{type:'buy',category:'animal',entityId:e.id,configId:a.id,quantity:1},`领养1只${a.name}，进入已有栏舍，不会超过${a.capacity}只容量`);
      return;
    }
    if(a==='feed-mode'){
      ui.mode='feed';
      ui.feedSpecies=id;
      closePanel();
      render();
      status('划过同类栏舍，抬手一次喂养所有可支付的待喂动物');
      return;
    }
    if(a==='buy-npc'||a==='buy-material'){
      const offer=(a==='buy-npc'?s.npc.shelf:s.npc.materialOffers).find(o=>o.id===id);
      if(offer)confirmBuy(name(offer.itemId),offer.coins,a==='buy-npc'?{type:'buyNpc',slotId:id}:{type:'buy',category:'material',slotId:id,itemId:offer.itemId,quantity:1},`${name(offer.itemId)}${offer.quantity}份`);
      return;
    }
    if(a==='upgrade-storage'){
      const st=s.storage[id],n=st.upgrades+1,materials=(id==='barn'?['bolt','duct_tape','plank']:['nail','screw','wood_panel']);
      ask('确认扩容？',`${id==='barn'?'货仓':'粮仓'}从${st.capacity}扩到${st.capacity+(st.upgrades<38?25:50)}份。消耗${materials.map(m=>`${name(m)}${n}件`).join('、')}，不花金币，无等待；无法撤销。`,async()=>{
          backFromConfirm();
          await dispatch({type:'upgradeStorage',storage:id});
        },'消耗材料扩容');
      return;
    }
    if(a==='upgrade-machine'){
      const e=s.entities.find(e=>e.id===id),b=BUILDINGS[e.configId],cost=FARM_CONFIG.constructionVoucher.ordinarySlots[e.slots-b.slots];
      ask('扩充加工队列？',`消耗${cost}建设券，槽位从${e.slots}增加到${e.slots+1}。不会让任务并行加工，确认后不退券。`,async()=>{
          backFromConfirm();
          await dispatch({type:'upgradeMachine',entityId:id});
        },'确认扩槽');
      return;
    }
    if(a==='queue-up'){
      const[entityId,jobId]=rest,e=s.entities.find(e=>e.id===entityId),ids=e.queue.filter(j=>j.startAt===null).map(j=>j.id),i=ids.indexOf(jobId);
      if(i>0){
        [ids[i-1],ids[i]]=[ids[i],ids[i-1]];
        await dispatch({type:'reorderQueue',entityId,jobIds:ids});
      }
      return;
    }
    if(a==='revive-free'||a==='revive-voucher'){
      ask('复苏这株果树？',a==='revive-free'?`使用今天1次免费园丁服务（剩${Math.max(0,3-s.npc.freeRevives)}次）。复苏后再产最后一轮。`:'消耗1建设券，复苏后再产最后一轮。终末枯萎后仍需要工具清理。',async()=>{
          backFromConfirm();
          await dispatch({type:'reviveTree',entityId:id,useVoucher:a==='revive-voucher'});
        },'确认复苏');
      return;
    }
    if(a==='clear-tree'){
      const e=s.entities.find(e=>e.id===id),f=FRUITS[e.configId];
      ask('确认清理这株植株？',`永久移除${entityName(e)}，消耗${name(f.clearTool)}1把。不退购买金币${e.status!=='withered'?'，并失去尚未采收的剩余轮次':''}，不可撤销。`,()=>dispatch({type:'clearTree',entityId:id,confirmed:true},{close:true}),'消耗工具并清理');
      return;
    }
    if(a==='clear-obstacle'){
      clearObstacles(rest[0],rest[1]);
      return;
    }
    if(a==='list-box'){
      openPanel('list-box',id);
      return;
    }
    if(a==='upgrade-stall'){
      const cost=FARM_CONFIG.constructionVoucher.npcBoxes[s.npc.boxes.length-5];
      ask('增加一个NPC货箱？',`消耗${cost}建设券，拥有货箱将从${s.npc.boxes.length}增至${s.npc.boxes.length+1}，不可退券。`,async()=>{
          backFromConfirm();
          await dispatch({type:'upgradeStall'});
        },'确认扩箱');
      return;
    }
    if(a==='submit-order'){
      const o=s.orders.find(o=>o.id===id);
      ask('交付这张卡车单？',`交付${Object.entries(o.requirements).map(([id,q])=>`${name(id)}${q}份`).join('、')}，立即获得${o.coins}金币和${o.xp}经验。提交后不可撤销。`,async()=>{
          backFromConfirm();
          await dispatch({type:'submitOrder',orderId:id});
        },'确认交付');
      return;
    }
    if(a==='discard-order'){
      ask('放弃这张订单？','不扣物品，不得奖励。此槽进入补单冷却，其它订单保持不变。',async()=>{
          backFromConfirm();
          await dispatch({type:'discardOrder',orderId:id});
        },'放弃并等待新单');
      return;
    }
    if(a==='expand-land'){
      const p=LAND_PATCHES.find(p=>p.id===id);
      ask('开垦这块土地？',`消耗地契、木槌、标桩各${p.land_deed}件，开放64格，不赠田、不增加田额度。清障工具另行消耗；此操作不可撤销。`,()=>dispatch({type:'expandLand',patchId:id},{close:true}),'确认开垦');
      return;
    }
    if(a==='rescue-plant'){
      const entityId=content.querySelector('[data-rescue-field]')?.value;
      if(entityId)await dispatch({type:'rescue',entityId},{close:true,success:'借种已播下：成熟产2归还1，净收1份小麦'});
      return;
    }
    if(a==='find-machine'){
      const machine=s.entities.find(e=>e.kind==='machine'&&e.machineType===id);
      if(machine)openEntity(machine.id);else{
        ui.panelTab='facilities';
        openPanel('shop');
      }
      return;
    }
    if(a==='stage'){
      const launch=async confirmed=>{
        closePanel();
        const result=await onStartStage(id,undefined,confirmed);
        if(result?.ok===false&&!ui.destroyed){openPanel('stages');toast(result.message||'暂时无法开始，请检查上一关进度');}
      };
      const active=s.branch.active;
      if(active?.status==='playing'&&active.started&&active.level!==Number(id.slice(1))-1){
        ask('翻开另一页故事？','当前牌局还没结束。切换会重置这局牌面；首通奖励与农场生产不变。',()=>launch(true),'确认切换');
      }else await launch(false);
      return;
    }
    if(a==='edit-entity'){
      if(ui.mode!=='layout')startLayout();
      ui.selected=id;
      closePanel();
      const e=worldEntities().find(e=>e.id===id);
      if(e)center(e.x+e.w/2,e.y+e.h/2);
      render();
      return;
    }
    if(a==='undo'||a==='redo'){
      const from=a==='undo'?ui.undo:ui.redo,to=a==='undo'?ui.redo:ui.undo;
      if(from.length){
        to.push(clone(ui.draft.positions));
        ui.draft.positions=from.pop();
        store.saveDraft?.(ui.draft);
        render();
      }
      return;
    }
    if(a==='rotate-entity'){
      const e=s.entities.find(e=>e.id===ui.selected);
      if(e&&!isFixedEntity(e)&&!['field','road'].includes(e.kind))editPosition(p=>({...p,rotation:(p.rotation+90)%360}));
      return;
    }
    if(a==='stash-entity'){
      const e=s.entities.find(e=>e.id===ui.selected);
      if(e&&canStoreEntity(e))editPosition(p=>({...p,stored:!p.stored}));
      return;
    }
    if(a==='save-layout'){
      await saveLayout();
      return;
    }
    if(a==='cancel-layout'){
      cancelLayout();
      return;
    }
    if(a==='save-slot'){
      await dispatch({type:'saveLayoutSlot',slot:Number(id),positions:ui.draft.positions});
      return;
    }
    if(a==='load-slot'){
      const positions=s.layoutSlots?.[Number(id)];
      if(positions){
        const check=validateLayout(s,positions);
        if(check.ok){
          changedDraft(clone(positions));
          closePanel();
          status('方案已读入草稿，点击保存才会正式应用');
        }else{
          status(check.errors[0].message,true);
          toast(check.errors[0].message);
        }
      }
      return;
    }
    if(a==='export'){
      try{
        const text=store.exportSave(),blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
        anchor.href=url;
        anchor.download=`羊羊牧场-${new Date().toISOString().slice(0,10)}-r${s.revision}.json`;
        anchor.click();
        setTimeout(()=>URL.revokeObjectURL(url),5000);
        toast('存档导出已准备，请保存下载文件');
      }catch(error){
        toast(error.message);
      }
      return;
    }
    if(a==='import'){
      content.querySelector('[data-import-file]')?.click();
      return;
    }
    if(a==='recover'){
      const snapshot=store.recoveryPreview?.(Number(id));
      if(!snapshot?.ok){
        toast(snapshot?.message||'快照已变化，请刷新列表后重选');
        return;
      }
      ask('恢复较早的快照？',`将恢复修订${snapshot.summary.revision}，${snapshot.summary.level}级、${snapshot.summary.coins}金币。这会替换当前进度，并先备份当前档。`,async()=>{
          const fresh=store.importPreview(snapshot.text),result=fresh.ok?await store.confirmImport(fresh.token):fresh;
          if(result.ok){
            closePanel();
            render();
            toast('快照已恢复');
          }else toast(result.message||result.error);
        },'确认恢复');
      return;
    }
    if(a==='reload-save'){
      const result=await store.load();
      if(result.ok){
        render();
        toast('已重新读取本机存档');
      }else toast(result.message||result.error);
      return;
    }
    if(a==='takeover'){
      const success=await store.takeover();
      render();
      toast(success?'本窗口已接管':store.getStatus?.().recoveryRequired?'当前存档需要恢复，请在设置中导入有效备份':'暂未取得写入权，请先关闭其它牧场窗口');
      return;
    }
    if(a==='set-skin'){
      const[entityId,skinId]=rest;
      await dispatch({type:'setSkin',entityId,skinId});
      return;
    }
    if(a==='set-background'){
      await dispatch({type:'setBackground',background:id});
      return;
    }
    if(['more','shop','market','tasks','orders','fields','settings','help','plant','stages','materials','rescue','layout-details','layout-slots','appearances'].includes(a)){
      ui.panelTab='';
      openPanel(a);
      return;
    }
  }
  function updateFormQuotes(){
    const sale=content.querySelector('[data-form="sell"]');
    if(sale){
      const data=new FormData(sale),id=data.get('itemId'),q=Number(data.get('quantity'));
      const box=sale.querySelector('[data-sale-quote]');
      box.textContent=Number.isInteger(q)&&q>0&&q<=(s.inventory[id]||0)?`回收${q}份${name(id)}，立即到账${Economy.recoveryPrice(id,q)}金币；出售不增加经验。`:'请输入不超过库存的正整数数量。';
    }
    const listing=content.querySelector('[data-form="list-stall"]');
    if(listing){
      const data=new FormData(listing),id=data.get('itemId'),q=Number(data.get('quantity')),tier=Number(data.get('tier')),item=ITEMS[id];
      const box=listing.querySelector('[data-stall-quote]');
      if(item&&q>0&&q<=10){
        const budget=['crop','fruit'].includes(item.category)?(s.npc.budgetFieldAllowance||fieldAllowance(s.level))*2:10,factor=['crop','fruit'].includes(item.category)?1:item.category==='animal'?1.5:2;
        box.textContent=`预计成交${Economy.npcPrice(id,q,tier)}金币，${duration(FARM_CONFIG.npc.saleTiers.find(t=>t[0]===tier)[1]*60000*factor)}。今日高价剩余预算${Math.max(0,budget-(s.npc.budgetUsed[id]||0))}份。${tier===.5?'此档与即时回收同价，直接回收无需等待。':''}`;
      }else box.textContent='请输入1至10的整数数量。';
    }
  }
  listen(app,'click',async event=>{
      const el=event.target.closest('button');
      if(!el||el.disabled)return;
      if(el.dataset.farmTool){
        if(event.detail!==0)return;
        const tool=JSON.parse(el.dataset.farmTool);
        hideQuickTools();
        if(tool.kind==='stroke'){selectQuickStroke(tool);status('工具选好啦，请划过目标；也可用田地列表逐个操作。');view.focus({preventScroll:true});}
        else await dispatch(tool.command);
        return;
      }
      if(el.dataset.command){
        await dispatch(JSON.parse(el.dataset.command));
        return;
      }
      if(el.dataset.action){
        playCue('button');
        delight.play('click',{point:{x:event.clientX,y:event.clientY},count:1});
        await action(el.dataset.action);
        return;
      }
      if(el.dataset.entity&&event.detail===0)openEntity(el.dataset.entity);
    });
  listen(app,'input',event=>{
      if(event.target.closest('[data-form="sell"],[data-form="list-stall"]'))updateFormQuotes();
    });
  listen(app,'change',async event=>{
      const target=event.target;
      if(target.dataset.setting){
        await dispatch({type:'setSettings',settings:{[target.dataset.setting]:target.checked}},{success:'偏好已保存'});
        setMusic();
      }
      if(target.matches('[data-layout-entity]')){
        ui.selected=target.value;
        renderPanel();
        renderMap();
      }
      if(target.matches('[data-import-file]')){
        const file=target.files?.[0];
        if(!file)return;
        if(file.size>10*1024*1024){
          toast('存档最大10MB，未读取或替换');
          return;
        }
        try{
          const importText=await file.text();
          const preview=await store.importPreview(importText);
          if(!preview.ok){
            toast(preview.message||preview.error||'存档校验失败，现档未改动');
            return;
          }
          const p=preview.summary;
          ask('导入并替换当前农场？',`导入文件：${p.level}级、${p.coins}金币、修订${p.revision}，导出/保存于${new Date(p.savedAtWallMs).toLocaleString()}。确认后先备份当前档，再替换。`,async()=>{
              const fresh=store.importPreview(importText);
              const result=fresh.ok?await store.confirmImport(fresh.token):fresh;
              if(result.ok){
                closePanel();
                render();
                toast('存档导入完成，原档已备份');
              }else toast(result.message||result.error);
            },'备份并替换');
        }catch(error){
          toast(error.message||'文件读取失败，现档未改动');
        }
      }
    });
  listen(app,'input',event=>{
    if(!event.target.matches('[data-music-volume]'))return;
    const value=clamp(Number(event.target.value)/100,0,1);
    onMusicVolumeChange(value);
    const output=content.querySelector('[data-volume-output]');
    if(output)output.textContent=`${Math.round(value*100)}%`;
  });
  listen(app,'submit',async event=>{
      const form=event.target.closest('form');
      if(!form)return;
      event.preventDefault();
      const data=new FormData(form),get=key=>data.get(key),formType=form.dataset.form;
      if(formType==='sell'){
        const itemId=get('itemId'),quantity=Number(get('quantity')),allowSeedReserve=get('allowSeedReserve')==='on';
        if(!Number.isSafeInteger(quantity)||quantity<1||quantity>(s.inventory[itemId]||0)){
          toast('数量必须是库存范围内的正整数');
          return;
        }
        const coins=Economy.recoveryPrice(itemId,quantity);
        ask('确认保底回收？',`出售${name(itemId)}${quantity}份，立即获得${coins}金币，余额将为${s.coins+coins}。${TOOLS[itemId]?'这是扩建或清理材料，出售会失去对应材料。':''}${allowSeedReserve?'本次已同意使用最后1份种子。':''}确认后不可撤销。`,async()=>{
            backFromConfirm();
            await dispatch({type:'sell',itemId,quantity,allowSeedReserve,confirmed:true},{close:true});
          },'确认出售');
      }
      if(formType==='list-stall'){
        const command={
          type:'listNpcStall',
          boxId:get('boxId'),
          itemId:get('itemId'),
          quantity:Number(get('quantity')),
          tier:Number(get('tier')),
          allowSeedReserve:get('allowSeedReserve')==='on'
        };
        if(!Number.isSafeInteger(command.quantity)||command.quantity<1||command.quantity>10){
          toast('每箱只能上架1至10份');
          return;
        }
        ask('确认NPC委托？',`${name(command.itemId)}${command.quantity}份立即从库存转入货箱；预计成交${Economy.npcPrice(command.itemId,command.quantity,command.tier)}金币，成交后再领取。未成交可在仓容足够时免费取回。`,async()=>{
            backFromConfirm();
            const result=await dispatch(command);
            if(result.ok){
              ui.panelTab='sell';
              openPanel('market');
            }
          },'确认上架');
      }
      if(formType==='move-animal')await dispatch({type:'moveAnimal',entityId:get('entityId'),animalId:get('animalId'),targetEntityId:get('targetEntityId')});
      if(formType==='layout-position'){
        const x=Number(get('x')),y=Number(get('y'));
        if(Number.isInteger(x)&&Number.isInteger(y))editPosition(p=>({...p,x,y}));
      }
    });
  listen(overlay,'pointerdown',event=>{
      if(event.target===overlay){
        cancelGesture();
        if(ui.panel==='confirm')backFromConfirm();else closePanel();
      }
    });
  listen(app,'keydown',event=>{
      if(event.key==='Escape'){
        event.preventDefault();
        cancelGesture('已取消当前笔画');
        if(ui.panel){
          if(ui.panel==='confirm')backFromConfirm();else closePanel();
        }else if(ui.placing){
          ui.placing=null;
          render();
        }else if(ui.quickEntityId)hideQuickTools();else if(!app.querySelector('.farm-camera-popover').hidden)setCameraTools(false);else if(ui.mode==='layout')cancelLayout();else setMode('pan');
        return;
      }
      if(event.key==='Tab'&&!overlay.hidden){
        const focusables=[...overlay.querySelectorAll('button:not(:disabled),input:not([hidden]):not([type="hidden"]):not(:disabled),select:not(:disabled),summary,a[href],[tabindex="0"]')].filter(el=>el.offsetParent!==null),first=focusables[0],last=focusables.at(-1);
        if(!first)return;
        if(event.shiftKey&&document.activeElement===first){
          event.preventDefault();
          last.focus();
        }else if(!event.shiftKey&&document.activeElement===last){
          event.preventDefault();
          first.focus();
        }
      }
    });
  listen(window,'resize',()=>{
      if(ui.stroke||ui.gesture?.type==='edit'||ui.gesture?.type?.startsWith('tool')){
        cancelGesture('屏幕尺寸变化，整笔预览已取消，资源未扣除');
        renderMap();
      }
    });
  let lastSize={w:view.clientWidth,h:view.clientHeight};
  const resize=new ResizeObserver(()=>{
      const w=view.clientWidth,h=view.clientHeight;
      if(!w||!h)return;

      // Internal HUD reflow is not a pointer cancellation. Real window resizing
      // is handled explicitly above, and production strokes keep their projection.
      ui.camera.x+=(w-lastSize.w)/2;
      ui.camera.y+=(h-lastSize.h)/2;
      lastSize={w,h};
      transform();
      if(ui.gesture?.type==='stroke')addStroke(screenToWorld(ui.gesture.x,ui.gesture.y));
    });
  resize.observe(view);
  const unsubscribe=store.subscribe(()=>render());
  const animationTicker=setInterval(updateAnimalAnimations,250);
  const ticker=setInterval(()=>{
      for(const el of app.querySelectorAll('[data-ready-at]')){
        const readyAt=Number(el.dataset.readyAt);
        el.textContent=readyAt<=now()?'已就绪':`${el.dataset.timerLabel||''}${duration(readyAt-now())}`;
      }
    },1000);
  ui.zoom=s.camera?.zoom||1;
  render();
  center(s.camera?.centerX??29.5,s.camera?.centerY??28.5);
  ui.frame=requestAnimationFrame(edgeFrame);
  const ready=store.ready;
  if(ready?.then)ready.then(()=>{
      if(!ui.destroyed)render();
    });
  return {
    refresh:render,
    setActive,
    openPanel,
    destroy(){
      if(ui.destroyed)return;
      ui.destroyed=true;
      cancelGesture();
      abort.abort();
      unsubscribe?.();
      resize.disconnect();
      clearInterval(ticker);
      clearInterval(animationTicker);
      animalEffects.clear();
      clearTimeout(ui.toastTimer);
      clearTimeout(ui.draftTimer);
      clearTimeout(ui.cameraTimer);
      cancelAnimationFrame(ui.frame);
      hiddenObserver.disconnect();
      delight.destroy();
      if(ui.draft)store.saveDraft?.(ui.draft);
      root.innerHTML='';
    }
  };
}
