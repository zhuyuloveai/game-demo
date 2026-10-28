import {priorityIconUrl} from './farm-priority-icons.mjs';
import {mountFactoryPanel} from './farm-factory-panel.mjs';
import {mountChickenCoop} from './farm-coop-panel.mjs';
import {patchFarmMarkup} from './farm-dom-patch.mjs';
import {createAnimalAnimationController} from './farm-animal-animation.mjs';
import {createMachineAnimationController} from './farm-machine-animation.mjs';
import {resolveMachinePartArt,machineIsProducing} from './farm-runtime-machines.mjs';
import {forestBoundary} from './farm-forest-boundary.mjs';
import {workshopForestFringe,workshopForestFog} from './farm-workshop-terrain.mjs';
import {resolveShelterSpec,resolveShelterLayer,resolveShelterAnimal,resolveShelterAnimalShadow,renderShelterLayer} from './farm-runtime-shelters.mjs';
import {shelterCanvasRect,shelterCanvasPoint,shelterLayerDepths,shelterLayerHit,shelterSummary,shelterHitCandidates} from './farm-shelter-geometry.mjs';
import {resolveEnvironmentArt,resolveObstacleArt,resolveEnvironmentLegacyArt,resolveBuildingBadge,resolveMachineMasteryArt} from './farm-runtime-environment.mjs';
import {artRotations,nextArtRotation,mirroredArt,legacyArtRotation} from './farm-art-direction.mjs';
import {anchoredArtRect,environmentRect,compactTrayPlacement,worldBadge} from './farm-art-presentation.mjs';
import {penLayers} from './farm-pen-art.mjs';
import {animalPlacement,shelterBackdropDepth,animalOccluderIds} from './farm-animal-layout.mjs';
import {resolveTerrainArt,isConnectedFence,TERRAIN_DIRECTIONS} from './farm-runtime-terrain.mjs';
import {resolveWorldArt,renderRuntimeArt,runtimeArtHit,runtimeArtFrontHit} from './farm-runtime-art.mjs';
import {suggestGrowthPlacement,previewGrowthLayout,farmGrowthStage} from './farm-growth-layouts.mjs';
import {project,unproject,footprintPolygon,polygonBounds,pointInPolygon,segmentPolygon,depth,groundRect,spriteRect,overlaps,topmostHit,fitOverview} from './farm-world-geometry.mjs';
/** Persistent farm world: renders real store state; every economy change goes through ctx.act. */
  const TILE = 48;
  const CROP_FILES = { wheat:'c01-wheat',corn:'c02-corn',soybean:'c03-soybean',sugarcane:'c04-sugarcane',carrot:'c05-carrot',indigo:'c06-indigo',pumpkin:'c07-pumpkin',cotton:'c08-cotton',chili_pepper:'c09-pepper',black_bean:'c10-blackbean',tomato:'c11-tomato' };
  const FRUIT_FILES = { apple:'r01-apple',raspberry:'r02-raspberry',cherry:'r03-cherry',blackberry:'r04-blackberry',blueberries:'r05-blueberry' };
  const BUILDING_FILES = { bakery:'Bakery',feed_mill_1:'Feed_Mill',feed_mill_2:'Feed_Mill',feed_mill:'Feed_Mill',dairy:'Dairy',sugar_mill:'Sugar_Mill',popcorn_pot:'Popcorn_Pot',bbq_grill:'BBQ_Grill',pie_oven:'Pie_Oven',loom:'Loom',sewing_machine:'Sewing_Machine',cake_oven:'Cake_Oven',juice_press:'Juice_Press',ice_cream_maker:'Ice_Cream_Maker',house:'Farmhouse',barn:'Barn',silo:'Silo' };
  const CHAPTERS = {P01:'农场就在眼前',P02:'麦田里的工具袋',P03:'树冠上的果实',P04:'围栏里的小伙伴',P05:'机器与小托盘',P06:'新建筑落脚',P12:'边界外的新土地',P16:'挪一挪我的农场'};
  const clone = value => JSON.parse(JSON.stringify(value));
  const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  function segmentHits(a,b,targets) {
    if (!finitePoint(a)||!finitePoint(b)) return [];
    const dx=b.x-a.x,dy=b.y-a.y;
    return targets.map((r,index)=>{
      if (![r.left,r.top,r.right,r.bottom].every(Number.isFinite)||r.right<=r.left||r.bottom<=r.top) return null;
      if(r.polygon){const t=segmentPolygon(a,b,r.polygon);return t===null?null:{r,index,t};}
      let lo=0,hi=1;
      for (const [p,q] of [[-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.top],[dy,r.bottom-a.y]]) {
        if (!p) { if(q<0)return null; continue; }
        const t=q/p; if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t); if(lo>hi)return null;
      }
      if(r.acceptPoint){let first=null;const samples=Math.max(1,Math.ceil(Math.hypot(dx,dy)*(hi-lo)/3));for(let i=0;i<=samples;i++){const t=lo+(hi-lo)*i/samples;if(r.acceptPoint({x:a.x+dx*t,y:a.y+dy*t})){first=t;break;}}if(first===null)return null;lo=first;}
      return {r,index,t:lo};
    }).filter(Boolean).sort((a,b)=>a.t-b.t||a.index-b.index).map(h=>h.r);
  }
  function createStroke(tool,point) {return {tool:{...tool},ids:[],seen:new Set(),last:{...point},active:finitePoint(point),reason:null};}
  function extendStroke(stroke,point,targets) {
    if(!stroke?.active||!finitePoint(point)) return stroke;
    const owner=stroke.tool.entityId, scoped=['feed','collectAnimal','collectMachine','enqueue'].includes(stroke.tool.action);
    for(const target of segmentHits(stroke.last,point,targets)) {
      if(scoped && (target.entityId||target.id)!==owner)continue;
      if(!stroke.seen.has(target.id)){stroke.seen.add(target.id);stroke.ids.push(target.id);}
    }
    stroke.last={...point};return stroke;
  }
  function cancelStroke(stroke,reason='cancelled') {if(stroke){stroke.active=false;stroke.reason=reason;stroke.ids.length=0;stroke.seen.clear();}return null;}
  function finishStroke(stroke) {
    if(!stroke?.active)return null;stroke.active=false;
    const {action,entityId,itemId,recipeId}=stroke.tool,ids=stroke.ids.slice();if(!ids.length)return null;
    if(action==='feed'||action==='collectAnimal')return {type:action,entityId,animalIds:ids};
    if(action==='collectMachine')return {type:action,entityId,jobIds:ids};
    if(action==='enqueue')return {type:'enqueue',entityId,recipeId};
    if(action==='plant')return {type:'plant',entityIds:ids,itemId};
    if(action==='harvest')return {type:'harvest',entityIds:ids};
    return null;
  }
  function commandPreview(ctx,command) {
    try {const r=ctx.core.executeFarm(ctx.state,command,ctx.state.now);return {ok:true,result:r};}
    catch(e){return {ok:false,message:e.message||'这里暂时不能操作',code:e.code};}
  }
  function obstacleTargets(state,selected,tool) {
    if(!selected||selected.kind!=='obstacle')return [];
    if(!['tnt','dynamite'].includes(tool))return [selected.id];
    const cap=tool==='tnt'?3:2;
    return [selected,...state.entities.filter(e=>e.id!==selected.id&&e.kind==='obstacle'&&e.configId==='rock'&&(tool==='tnt'?e.x>=selected.x&&e.x<=selected.x+2&&e.y>=selected.y&&e.y<=selected.y+2:Math.abs(e.x-selected.x)+Math.abs(e.y-selected.y)<=1))].slice(0,cap).map(e=>e.id);
  }
  function layoutThumbnail(state,positions){
    const byId=new Map(state.entities.map(e=>[e.id,e]));
    const entities=(positions||[]).map(p=>{
      const original=byId.get(p.id);if(!original||p.stored)return null;
      const e={...original,...p},rotated=(e.rotation||0)%180!==0;
      return {...e,displayW:rotated?e.h:e.w,displayH:rotated?e.w:e.h};
    }).filter(Boolean).sort((a,b)=>(a.y+a.displayH)-(b.y+b.displayH)||a.x-b.x||a.id.localeCompare(b.id));
    if(!entities.length)return {entities,bounds:{x:16,y:16,w:32,h:32}};
    const x=Math.min(...entities.map(e=>e.x))-1,y=Math.min(...entities.map(e=>e.y))-1;
    return {entities,bounds:{x,y,w:Math.max(...entities.map(e=>e.x+e.displayW))-x+1,h:Math.max(...entities.map(e=>e.y+e.displayH))-y+1}};
  }
  function worldScenePresentation(chapter,selected,e){
    const active=chapter==='P05'&&selected?.kind==='machine';
    return {focused:!!active&&selected.id===e.id,muted:!!active&&selected.id!==e.id,showBadge:!active||selected.id===e.id,showProducts:!active||selected.id===e.id};
  }
  function machineTrayPlacement(e,footprint){const available=footprint.w*TILE,height=52,slots=Math.min(e.completed?.length||1,Math.max(1,Math.floor((available-6)/46))),width=slots*46+6;return {x:e.x*TILE+(available-width)/2,y:(e.y+footprint.h)*TILE-height,width,height,slots};}

  function projectedMachineTray(e,f){const p=project(e.x+f.w/2,e.y+f.h),slots=Math.min(e.completed?.length||1,Math.max(1,Math.floor((f.w+f.h)*24/46))),width=slots*46+6;return {x:p.x-width/2,y:p.y-32,width,height:44,slots};}
  function directCropHarvestCommand(e,now,editing=false){
    return !editing&&e?.kind==='field'&&e.crop&&e.crop.readyAt<=now?{type:'harvest',entityIds:[e.id]}:null;
  }
  // World objects select or pan. Product shelves alone support a direct collection stroke.
  function directWorldTool() {return null;}
  function cropDoubleTapCommand(e,lastTap,at,now,editing=false){
    return e&&lastTap&&lastTap.id===e.id&&at-lastTap.at>=0&&at-lastTap.at<=350?directCropHarvestCommand(e,now,editing):null;
  }
  function resizeHasPendingAction(g){return !!g&&['tool-pending','stroke','job-drag','product-pending','edit','place'].includes(g.type);}
  function resizeWorldCamera(camera,previous,next,anchor){
    const positive=s=>s&&Number.isFinite(s.w)&&s.w>0&&Number.isFinite(s.h)&&s.h>0;
    if(!positive(previous)||!positive(next)||!Number.isFinite(camera.zoom)||camera.zoom<=0)return {...camera};
    if(!anchor&&previous.w===next.w&&previous.h===next.h)return {...camera};
    const center={x:(previous.w/2-camera.x)/camera.zoom,y:(previous.h/2-camera.y)/camera.zoom};
    if(anchor&&Number.isFinite(anchor.x)&&Number.isFinite(anchor.y))return {...camera,x:next.w*(anchor.rx??.5)-anchor.x*camera.zoom,y:next.h*(anchor.ry??.5)-anchor.y*camera.zoom};
    return {...camera,x:next.w/2-center.x*camera.zoom,y:next.h/2-center.y*camera.zoom};
  }
/** Presentation only; authoritative level, limits, balance and space are checked by core buy. */
export function placementConfig(config,category,key){
  if(category==='field')return {footprint:[1,1],coins:1};
  if(category==='road')return {footprint:[1,1],coins:0};
  const c=category==='machine'?config.BUILDINGS[key]:category==='fruit'?config.FRUITS[key]:category==='shelter'?config.ANIMALS[key]:category==='decoration'?config.DECORATIONS[key]:null;
  return c?{...c,coins:category==='shelter'?c.buildingCost:c.coins}:null;
}
/** Recover positions only, never an old inventory or production snapshot. */
export function recoverWorldLayoutDraft(state,saved,layout){
  const value=saved?.draft||saved;if(!Array.isArray(value?.positions))return {ok:false,message:'没有可恢复的布局草稿'};
  if(value.layoutRevision!==undefined&&value.layoutRevision!==(state.layoutRevision||0))return {ok:false,message:'正式布局已变化，上次草稿仍保留，请确认当前布局后重新布置'};
  const current=layout.beginLayout(state),positions=value.positions.map(p=>({id:p.id,x:p.x,y:p.y,rotation:p.rotation??0,stored:!!p.stored}));
  const check=layout.validateLayout(state,positions);if(!check.ok)return {ok:false,message:'上次草稿暂不能恢复：'+(check.errors[0]?.message||'物件或位置已变化')};
  return {ok:true,draft:{...current,positions}};
}
/** Project the original square ground artwork, not its bounding rectangle. */
export function renderProjectedGround(src,alt='',className=''){
  const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<svg class="fw-ground-art ${safe(className)}" viewBox="0 0 48 24" role="img" aria-label="${safe(alt)}" xmlns="http://www.w3.org/2000/svg"><image href="${safe(src)}" width="48" height="48" transform="matrix(.5 .25 -.5 .25 24 0)"/></svg>`;
}
export function ripeCharm(f,e,t=[50,50]){return f.kind==="field"&&f.crop?.readyAt<=e||f.kind==="fruit"&&f.status==="ready"?'<span class="fw-ripe-charm" style="left:'+t[0]+"%;top:"+t[1]+'%" aria-hidden="true"><svg class="fw-ripe-glyph" viewBox="0 0 24 26" focusable="false"><g class="fw-ripe-star"><path d="M10 2C10.7 7.6 12.2 9.2 18 10C12.3 10.9 10.8 12.6 10 18C9.1 12.6 7.6 10.9 2 10C7.5 9.2 9.1 7.6 10 2Z" fill="#fff1b4" stroke="#c79749" stroke-width="1.1" stroke-linejoin="round"/><path d="M10 5.2L10.8 9.1L14.2 10L10.6 10.6L10 14L9.2 10.8L5.6 10L9.1 9.2Z" fill="#fffdf1"/></g><g class="fw-ripe-dew"><path d="M19 13C18 15 15.2 17.3 15.4 19.6C15.6 23.6 22 23.4 22 19.5C22 17.3 20 15.1 19 13Z" fill="#e5f2bd" stroke="#9cac69" stroke-width=".9"/><path d="M17.7 18.5Q16.6 20.2 18.1 20.7" fill="none" stroke="#fffef3" stroke-width="1.4" stroke-linecap="round"/></g><circle class="fw-ripe-dot" cx="20.5" cy="5.5" r="1.5" fill="#fff7d4" stroke="#c9a363" stroke-width=".6"/></svg></span>':""}

export function worldMotionKind(e,now=0){return e.kind==='field'&&e.crop?'crop':e.kind==='fruit'&&!['revive','withered'].includes(e.status)?'tree':!resolveMachinePartArt(e)&&machineIsProducing(e,now)?'machine':'';}
/** Undo inner-art sway before testing its alpha, leaving ground selection unchanged. */
export function inverseSwayPoint(u,v,width,height,angle=0,originY=.85){
  const r=-angle*Math.PI/180,dx=(u-.5)*width,dy=(v-originY)*height;
  return {u:.5+(dx*Math.cos(r)-dy*Math.sin(r))/width,v:originY+(dx*Math.sin(r)+dy*Math.cos(r))/height};
}
/** Only a geometry-identical draft may reuse a normal-mode scene graph. */
export function isPristineWorldDraft(state,draft){
  if(!draft)return true;
  if(!Array.isArray(draft.positions)||draft.positions.length!==state.entities.length)return false;
  const source=new Map(state.entities.map(e=>[e.id,e])),seen=new Set();
  return draft.positions.every(p=>{const e=source.get(p?.id);if(!e||seen.has(p.id)||Object.keys(p).some(k=>!['id','x','y','rotation','stored'].includes(k)))return false;seen.add(p.id);return p.x===e.x&&p.y===e.y&&(p.rotation??0)===(e.rotation??0)&&!!p.stored===!!e.stored;});
}
export function mountWorldScene(ctx) {
    const id=ctx.id||'P01';
    const root=ctx.root,doc=ctx.doc||root.ownerDocument,win=ctx.win||doc.defaultView;
    const esc=ctx.esc||((s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
    const config=ctx.config;let coopPanel=null;let destroyed=false,selected=null,selectedAnimal=null,more=false,localPage=null,seedPage=0,recipePage=0;
    let camera={x:0,y:0,zoom:1},cameraReady=false,viewSize={w:0,h:0},focusAnchor=null,resizeRaf=0,gesture=null,pointers=new Map(),pinch=null,edgeRaf=0,edgeStamp=0,draft=null,undo=[],redo=[],placement=null,clearPreview=null,activeJob=null;
    let preserveStoredDraft=false,pendingRecipe=null,chosenSeed=null,lastFieldTap=null,harvestView=false,cameraSaveTimer=0,growthPreview=null;
    const listeners=[];
    let forestKey=null,forestViewport=null,forestModelKey=null,forestModel=null,forestRetreatTimer=0,mapSignature=null,forestGeometry=null,motionRaf=0,presentationDepth=0,normalMapSignature=null,mapProvenance='none';
    root.classList.add('fw-root');
    const ownsDocument=root.parentElement===doc.body;
    if(ownsDocument)doc.documentElement?.classList.add('fw-document');
    root.innerHTML=`<section class="fw-game" aria-label="${esc(CHAPTERS[id])}"><div class="fw-map" tabindex="0" aria-label="农场地图。拖动地图；点对象选工具，再拖工具连续操作；双击成熟田收一格；农田透视可找到被遮挡的成熟田；更多菜单进入布置"><div class="fw-world"></div></div><div class="fw-corners"></div><div class="fw-context"></div><div class="fw-local"></div><div class="fw-transaction"></div><div class="fw-stroke-note" role="status" aria-live="polite" hidden></div><div class="fw-cursor" aria-hidden="true" hidden></div></section>`;
    const game=root.querySelector('.fw-game'),view=root.querySelector('.fw-map'),world=root.querySelector('.fw-world'),corners=root.querySelector('.fw-corners'),context=root.querySelector('.fw-context'),local=root.querySelector('.fw-local'),transaction=root.querySelector('.fw-transaction'),note=root.querySelector('.fw-stroke-note'),cursor=root.querySelector('.fw-cursor');
    world.style.backgroundImage="none";
    const animalAnimation=createAnimalAnimationController({root:world,
      getAnimal:(animalId,shelterId)=>{const shelter=entity(shelterId);return {animal:shelter?.animals?.find(a=>a.id===animalId),shelter};},
      getStaticArt:animalMeta,
      isReduced:()=>!!ctx.state.settings.reducedMotion,
      isPaused:()=>destroyed||doc.hidden||ctx.effectsPaused===true||!!gesture||!!draft||!!placement||!!localPage||!!root.closest('[inert]'),
      maxVisible:12});
    const machineAnimation=createMachineAnimationController({root:world,getEntity:entity,getNow:()=>ctx.state.now,
      isReduced:()=>!!ctx.state.settings.reducedMotion,
      isPaused:()=>destroyed||doc.hidden||ctx.effectsPaused===true||!!gesture||!!draft||!!placement||!!localPage||!!root.closest('[inert]')});
    function refreshMotion(){game.dataset.motionBlocked=String(!!gesture||!!draft||!!placement||!!localPage);if(motionRaf)return;motionRaf=win.requestAnimationFrame(()=>{motionRaf=0;if(destroyed)return;animalAnimation.prepareSync();machineAnimation.prepareSync();ctx.refreshPresentation?.();animalAnimation.commitSync();machineAnimation.commitSync();});}

    function on(el,event,fn,options){el.addEventListener(event,fn,options);listeners.push(()=>el.removeEventListener(event,fn,options));}
    function vouchersEnabled(){return ctx.state.features?.constructionVouchersEnabled!==false;}
    function entity(id){return ctx.state.entities.find(e=>e.id===id);}
    function selectedEntity(){return entity(selected);}
    function image(path,alt='',cls=''){return `<img class="${esc(cls)}" src="${esc(resolveEnvironmentLegacyArt(path)?.src||ctx.asset(path))}" alt="${esc(alt)}" draggable="false">`;}
    function item(id,cls=''){return ctx.item(id,cls);}
    function name(id){return ({house:'农场小屋',barn:'货仓',silo:'粮仓',road:'道路',natural_tree:'自然树',natural_bush:'灌木',rock:'石堆'})[id]||ctx.name(id);}
    function button(action,label,body='',extra=''){return `<button data-action="${esc(action)}" ${extra}>${body}${esc(label)}</button>`;}
    function remaining(t){const s=Math.max(0,Math.ceil((t-ctx.state.now)/1000));return s>60?`${Math.ceil(s/60)}分`:`${s}秒`;}
    function title(e){return e.kind==='shelter'?`${config.ANIMALS[e.configId]?.name||e.configId}舍`:e.kind==='field'?(e.crop?name(e.crop.itemId):'空田'):name(e.configId);}
    function entityArt(e){
      if(e.kind==='field')return e.crop?`plants/${CROP_FILES[e.crop.itemId]||CROP_FILES.wheat}-${e.crop.readyAt<=ctx.state.now?'ripe':e.crop.readyAt-ctx.state.now>config.CROPS[e.crop.itemId].durationMs/2?'sprout':'grown'}.svg`:'terrain/field-empty.svg';
      if(e.kind==='fruit')return `plants/${FRUIT_FILES[e.configId]||FRUIT_FILES.apple}-${({ready:'fruit_ready',growing:'growing',revive:'wilt_help',withered:'wilt_final'})[e.status]||'young'}.svg`;
      if(e.kind==='shelter')return `buildings/${e.configId[0].toUpperCase()+e.configId.slice(1)}_Shelter${e.skinId?'_Floral':''}.svg`;
      if(e.kind==='obstacle')return `terrain/${({natural_tree:'natural-tree',natural_bush:'natural-bush',rock:'rocks-0'})[e.configId]}.svg`;
      if(e.kind==='road')return 'terrain/road-f.svg';
      if(e.kind==='decoration'&&e.configId.startsWith('badge_')){const m=e.configId.match(/^badge_(.+)_([123])$/),keys=Object.keys(config.ACHIEVEMENTS);if(m)return `decor/badges/g${String(keys.indexOf(m[1])+1).padStart(2,'0')}-${['bronze','silver','gold'][Number(m[2])-1]}.svg`;}
      if(e.kind==='decoration')return `decor/${({sign:'wood-sign',flowerpot:'flower-pot',haystack:'hay-bales',stone_stool:'stone-seat',flagpole:'flag',flower_fence:'flower-fence',wood_fence:'wood-fence',water_trough:'trough',flowerbed:'flower-bed',statue:'stone-statue',picnic_mat:'picnic',decor_flag:'meadow-banner',decor_windmill:'festival-windmill',decor_memorial:'land-memorial',decor_bridge:'reward-bridge'})[e.configId]||e.configId}.svg`;
      return `buildings/${BUILDING_FILES[e.configId]||BUILDING_FILES[e.kind]||'Farmhouse'}.svg`;
    }
    function fieldSoil(e){const terrain=resolveTerrainArt(e,[],ctx.state),g=groundRect(e,ctx.layout.getFootprint(e)),r=visualRect(e),height=g.width*terrain.height/terrain.width;return `<img class="fw-terrain-soil" src="${esc(terrain.src)}" alt="" aria-hidden="true" draggable="false" style="left:${g.left-r.left}px;top:${(g.top+g.bottom)/2-height/2-r.top}px;width:${g.width}px;height:${height}px">`;}
    function art(e,cls='',layer='all'){
      const spec=e.kind==='shelter'&&resolveShelterSpec(e);
      if(spec){const keys=layer==='back'?['building']:['ground','buildingShadow','rearFence','building','frontFence'];return keys.map(key=>renderShelterLayer(e,key,{className:cls+' fw-layered-art',alt:key==='building'?title(e):'',mirror:mirroredArt(e)})).join('');}
      if(e.kind==='road'||isConnectedFence(e)){const terrain=terrainArt(e);fallbackArtHit(e,.5,.5);return `<img class="fw-terrain-art ${esc(cls)}" src="${esc(terrain.src)}" alt="${esc(title(e))}" draggable="false">`;}
      if(e.kind==='field'&&!e.crop)return fieldSoil(e);
      const environment=resolveObstacleArt(e);if(environment){fallbackArtHit(e,.5,.5);return `<img class="${esc(cls)}" src="${esc(environment.src)}" alt="${esc(title(e))}" draggable="false">`;}
      const runtime=resolveWorldArt(e,ctx.state.now);
      if(runtime)return (e.kind==='field'?fieldSoil(e):'')+renderRuntimeArt(runtime,{className:cls,alt:title(e),mirror:mirroredArt(e),layer});
      const path=entityArt(e);fallbackArtHit(e,.5,.5);
      if(e.kind==='field'&&e.crop)return fieldSoil(e)+image(path,title(e),cls+' fw-crop-overlay');
      return path?image(path,title(e),cls):`<img class="${cls}" src="${ctx.art?ctx.art(e.configId):ctx.asset('ui/info.svg')}" alt="${esc(title(e))}" draggable="false">`;
    }
    function plantHitPoint(e,p,u,v){
      if(!['crop','tree'].includes(worldMotionKind(e)))return {u,v};
      const el=world.querySelector(`[data-entity="${e.id}"]`),art=el?.querySelector('.fw-entity-art');
      if(!art||!win.getComputedStyle)return {u,v};
      const rotate=win.getComputedStyle(art).rotate||'0deg';
      let angle=parseFloat(rotate)||0;if(rotate.endsWith('rad'))angle*=180/Math.PI;else if(rotate.endsWith('turn'))angle*=360;
      const r=el.getBoundingClientRect();if(!r.width||!r.height)return {u,v};
      return inverseSwayPoint((p.x-r.left)/r.width,(p.y-r.top)/r.height,r.width,r.height,angle,e.kind==='fruit'?.88:.85);
    }
    function animalMeta(a,pen){return ((!pen?.skinId||resolveShelterSpec(pen))&&resolveShelterAnimal(a))||resolveWorldArt({...a,kind:'animal'},ctx.state.now);}
    function animalArt(a,pen){const runtime=animalMeta(a,pen);if(runtime)return renderRuntimeArt(runtime,{className:'fw-animal-art'+(runtime.shelterLayered?' fw-layered-art':''),alt:name(a.configId),mirror:runtime.shelterLayered&&mirroredArt(pen)});return image(`animals/${a.configId}/front/${a.status==='producing'?'producing':a.status==='ready'?'ready':'idle'}_00.svg`,name(a.configId),'fw-animal-art');}
    let effectiveCache=null;
    function effectiveEntities(){
      const state=ctx.state,positions=draft?.positions;
      if(effectiveCache?.state===state&&effectiveCache.positions===positions&&effectiveCache.growth===growthPreview)return effectiveCache.rows;
      const byId=draft?new Map(positions.map(p=>[p.id,p])):null;
      const rows=state.entities.map(e=>draft?{...e,...byId.get(e.id)}:e);
      if(growthPreview)rows.push(...growthPreview.plan.proposedRoads.map((p,i)=>({id:`__growth_road_${i}`,kind:'road',configId:'road',w:1,h:1,rotation:0,stored:false,previewOnly:true,...p})));
      effectiveCache={state,positions,growth:growthPreview,rows};return rows;
    }
    let terrainRows=null;const terrainCache=new Map(),terrainIndex=new Map();
    function terrainArt(e){
      const rows=effectiveEntities();
      if(rows!==terrainRows){terrainRows=rows;terrainCache.clear();terrainIndex.clear();for(const row of rows){if(row.stored||!(row.kind==='road'||isConnectedFence(row)))continue;const cell=`${row.x},${row.y}`;if(!terrainIndex.has(cell))terrainIndex.set(cell,[]);terrainIndex.get(cell).push(row);}}
      const key=[e.id,e.kind,e.configId,e.x,e.y,e.crop?.itemId,(ctx.state.fertilizerUntil||0)>ctx.state.now].join('|');
      if(!terrainCache.has(key)){const neighbors=TERRAIN_DIRECTIONS.flatMap(d=>terrainIndex.get(`${e.x+d.dx},${e.y+d.dy}`)||[]);terrainCache.set(key,resolveTerrainArt(e,neighbors,ctx.state));}
      return terrainCache.get(key);
    }

    const rectangleCache=new WeakMap();
    function visualRect(e){
      const key=[e.x,e.y,e.w,e.h,e.rotation,e.kind,e.configId,e.skinId,resolveWorldArt(e,ctx.state.now)?.key].join('|'),cached=rectangleCache.get(e);
      if(cached?.key===key)return cached.rect;
      const rect=computeVisualRect(e);rectangleCache.set(e,{key,rect});return rect;
    }
    function computeVisualRect(e){
      if(e.kind==='shelter'){const r=shelterCanvasRect(e,ctx.layout.getFootprint(e));if(r)return r;}
      const f=ctx.layout.getFootprint(e),meta=resolveWorldArt(e,ctx.state.now),r=spriteRect(e,f,meta?.aspect||1);
      const environment=resolveObstacleArt(e);if(environment)return environmentRect(e,f,environment);
      if(isConnectedFence(e)){const t=resolveTerrainArt(e),p=project(e.x+f.w/2,e.y+f.h/2);r.height=r.width*t.height/t.width;r.top=p.y-t.anchor[1]/t.height*r.height;return r;}
      if(meta)return anchoredArtRect(e,f,meta);
      const scale=(meta?.scale||1)*(['house','barn','silo','machine','shelter','fruit'].includes(e.kind)?e.kind==='shelter'?.9:.82:1);
      r.left+=r.width*(1-scale)/2;r.top+=r.height*(1-scale);r.width*=scale;r.height*=scale;return r;
    }
    function entityPaintDepth(e){if(resolveWorldArt(e)?.frontOcclusion)return Math.round((e.x+e.y+1)*10);return e.kind==='shelter'?shelterBackdropDepth(e,ctx.layout.getFootprint(e)):depth(e,ctx.layout.getFootprint(e));}
    function rectStyle(e){const r=visualRect(e);return `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:${entityPaintDepth(e)}`;}
    function groundStyle(e){const r=groundRect(e,ctx.layout.getFootprint(e)),points=r.polygon.map(p=>`${(p.x-r.left)/r.width*100}% ${(p.y-r.top)/r.height*100}%`).join(',');return `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;clip-path:polygon(${points})`;}
    function screenPolygon(e,r=view.getBoundingClientRect()){return footprintPolygon(e,ctx.layout.getFootprint(e)).map(p=>({x:r.left+camera.x+p.x*camera.zoom,y:r.top+camera.y+p.y*camera.zoom}));}
    function harvestTargets(){return effectiveEntities().filter(e=>!e.stored&&directCropHarvestCommand(e,ctx.state.now));}
    function paintedCandidate(r,meta,mirror=false){
      if(!meta)return r;
      const [bx,by,bw,bh]=meta.bounds,paint=meta.paintedBounds;
      let rect={...r};
      if(paint&&meta.fullCanvas){const [x0,y0,x1,y1]=paint,u0=mirror?1-x1/meta.width:x0/meta.width;rect={...r,left:r.left+u0*r.width,top:r.top+y0/meta.height*r.height,width:(x1-x0)/meta.width*r.width,height:(y1-y0)/meta.height*r.height};}
      return {...rect,hitAt:p=>runtimeArtHit(meta,(p.x-r.left)/r.width,(p.y-r.top)/r.height,{mirror})};
    }
    function fadedIds(entities){
      if(draft||placement||(!harvestView&&selectedEntity()?.kind!=='shelter'))return new Set();
      const candidates=[];
      for(const [order,e] of entities.entries()){
        if(['field','road'].includes(e.kind))continue;
        const bias=order/10000,spec=e.kind==='shelter'&&resolveShelterSpec(e),r=visualRect(e);
        if(spec){const layers=shelterLayerDepths(e,ctx.layout.getFootprint(e));for(const key of ['rearFence','building','frontFence'])candidates.push({...paintedCandidate(r,spec.layers[key],mirroredArt(e)),depth:layers[key]+bias,entityId:e.id});}
        else{candidates.push({...paintedCandidate(r,resolveWorldArt(e,ctx.state.now),mirroredArt(e)),depth:entityPaintDepth(e)+bias,entityId:e.id});
          if(resolveWorldArt(e)?.frontOcclusion)candidates.push({...r,depth:depth(e,ctx.layout.getFootprint(e))+1+bias,entityId:e.id});}
        if(e.kind==='shelter')for(const [i,a] of e.animals.entries()){
          const meta=animalMeta(a,e),r=animalPlacement(e,ctx.layout.getFootprint(e),i,meta);
          candidates.push({...paintedCandidate(r,meta,meta?.shelterLayered&&mirroredArt(e)),depth:r.depth+bias+(i+1)/1000000,entityId:e.id});
        }
      }
      const pen=selectedEntity(),cutaway=new Set();
      if(pen?.kind==='shelter'){
        const bias=entities.findIndex(e=>e.id===pen.id)/10000;
        const targets=pen.animals.map((a,i)=>{const meta=animalMeta(a,pen),r=animalPlacement(pen,ctx.layout.getFootprint(pen),i,meta);return {...paintedCandidate(r,meta,meta?.shelterLayered&&mirroredArt(pen)),depth:r.depth+bias+(i+1)/1000000};});
        for(const id of animalOccluderIds(targets,candidates.filter(c=>c.entityId!==pen.id)))cutaway.add(id);
      }
      if(harvestView){
        const targets=harvestTargets().map(t=>({...groundRect(t,ctx.layout.getFootprint(t)),depth:entityPaintDepth(t)+entities.findIndex(e=>e.id===t.id)/10000}));
        for(const id of animalOccluderIds(targets,candidates))cutaway.add(id);
      }
      return cutaway;
    }
    function stateBadge(e){
      if(e.kind==='field')return e.crop?(e.crop.readyAt<=ctx.state.now?'✓':remaining(e.crop.readyAt)):'';
      if(e.kind==='fruit')return ({ready:'果熟了',revive:'待复苏',withered:'待清理'})[e.status]||remaining(e.readyAt);
      if(e.kind==='machine')return !e.built?(e.buildReadyAt<=ctx.state.now?'可揭幕':`施工 ${remaining(e.buildReadyAt)}`):e.completed.length?`${e.completed.length}份待收`:e.queue.length?remaining(e.queue[0].readyAt):'';
      if(e.kind==='barn'||e.kind==='silo')return `${ctx.core.storageUsed(ctx.state,e.kind)}/${ctx.state.storage[e.kind].capacity}`;
      return '';
    }
    function patchNeedsClearing(p){return ctx.state.entities.some(e=>e.kind==='obstacle'&&e.x>=p.x&&e.y>=p.y&&e.x<p.x+p.w&&e.y<p.y+p.h);}
    function renderMap(){
      const profileStart=ctx.profile?win.performance.now():0;
      // Clock ticks need text only, not a new scene graph. Include visual growth
      // thresholds separately because now itself deliberately is not a map key.
      const s=ctx.state,stages=s.entities.map(e=>[e.id,resolveWorldArt(e,s.now)?.key,e.kind==='machine'&&!e.built&&e.buildReadyAt<=s.now]),fertilized=(s.fertilizerUntil||0)>s.now;
      const presentation=[s.entities,s.openedLand,s.storage,ctx.core.storageUsed(s,'barn'),ctx.core.storageUsed(s,'silo'),stages,fertilized,selected,selectedAnimal,harvestView,draft,placement,growthPreview,clearPreview,gesture?.stroke?[...gesture.stroke.seen]:null];
      const signature=JSON.stringify(presentation);
      if(signature===mapSignature){refreshClockLabels();return;}
      // Keep the normal DOM only for an untouched, unselected P01 edit session.
      // Any actual visual/state/geometry change falls through to the full renderer.
      const normalPresentation=presentation.slice();normalPresentation[10]=null;
      const normalSignature=draft?JSON.stringify(normalPresentation):signature;
      const modeOnly=id==='P01'&&!selected&&!selectedAnimal&&!harvestView&&!placement&&!growthPreview&&!clearPreview&&!gesture&&isPristineWorldDraft(s,draft);
      if(modeOnly&&mapProvenance==='normal'&&normalMapSignature===normalSignature){
        mapSignature=signature;world.classList.toggle('fw-layout-world',!!draft);world.classList.toggle('fw-layout-fast',!!draft);
        const entities=new Map(s.entities.map(e=>[e.id,e]));
        for(const el of world.querySelectorAll('[data-entity]')){const e=entities.get(el.dataset.entity);el.classList.toggle('editing',!!draft);el.classList.toggle('fw-layout-fixed',!!draft&&!!e&&ctx.layout.isFixedEntity(e));}
        refreshClockLabels();transform();
        if(ctx.profile)ctx.profile({name:'world.map.modeOnly',duration:win.performance.now()-profileStart});
        return;
      }
      // Fast mode mutates controller-owned class/aria outside markup's equality
      // cache. Restore those before a full path, even if its HTML is unchanged.
      if(world.classList.contains('fw-layout-fast')){
        for(const el of world.querySelectorAll('[data-entity]'))el.classList.remove('editing','fw-layout-fixed');
        world.classList.remove('fw-layout-fast');refreshClockLabels();
      }
      mapSignature=signature;mapProvenance=draft?'editing-full':'normal';normalMapSignature=draft?null:normalSignature;
      const focused=doc.activeElement?.dataset?.entity;
      const entities=effectiveEntities().filter(e=>!e.stored),layoutCheck=draft?draftCheck():null;
      const geometry=JSON.stringify(entities.map(e=>[e.id,e.kind,e.configId,e.x,e.y,e.rotation,resolveWorldArt(e,s.now)?.key]));
      if(geometry!==forestGeometry){forestGeometry=geometry;forestKey=null;}
      world.classList.toggle('fw-layout-world',!!draft);
      const faded=fadedIds(entities);game.classList.toggle('fw-harvest-view',harvestView);
      let html=`<div data-render-key="home-ground" class="fw-owned" style="${groundStyle({x:16,y:16,w:32,h:32})}"></div>`;
      for(const p of ctx.layout.LAND_PATCHES.filter(p=>ctx.state.openedLand.includes(p.id)))html+=`<div data-render-key="ground-${p.id}" class="fw-owned" style="${groundStyle(p)}"></div>`;
      html+='<div data-render-key="forest" class="fw-forest" aria-hidden="true"></div>';
      if(id==='P12')for(const p of ctx.layout.LAND_PATCHES){const open=ctx.state.openedLand.includes(p.id),check=ctx.layout.canExpandLand(ctx.state,p.id),active=selected===p.id;
        if(open&&!active)continue;
        html+=`<button class="fw-land fw-forest-land ${open?'opened':check.ok?'available':'locked'} ${active?'selected':''}" data-land="${p.id}" style="${groundStyle(p)}" aria-label="${p.id} ${open?'已开放':check.ok?'可以开垦':'暂不能开垦'}"><span>${active?(open?(patchNeedsClearing(p)?'已开放 · 待清理':'已开放'):check.ok?'这片林地 · 可开垦':'这片林地 · 暂未开放'):check.ok?'＋ 开垦':''}</span></button>`;}
      for(const e of entities){
        const presentation=worldScenePresentation(id,selectedEntity(),e),status=stateBadge(e),badgePolicy=worldBadge(e,ctx.state.now,{selected:selected===e.id,editing:!!draft,harvestView}),badge=presentation.showBadge&&badgePolicy.mode!=='none'?(badgePolicy.text||status):'',badgeArt=badgePolicy.mode==='label'?resolveBuildingBadge(e,ctx.state):null,marked=gesture?.stroke?.seen.has(e.id)||clearPreview?.ids.includes(e.id);
        html+=`<button class="fw-entity fw-${e.kind} ${faded.has(e.id)?'fw-occluder-faded':''} ${harvestView&&directCropHarvestCommand(e,ctx.state.now)?'fw-harvest-target':''} ${selected===e.id?'selected':''} ${marked?'marked':''} ${draft?'editing':''} ${draft&&ctx.layout.isFixedEntity(e)?'fw-layout-fixed':''} ${draft&&selected===e.id&&!layoutCheck.ok?'fw-invalid-position':''} ${presentation.focused?'fw-focused-entity':''} ${presentation.muted?'fw-muted-neighbor':''}" data-entity="${e.id}" data-fw-motion="${worldMotionKind(e,ctx.state.now)}" data-fw-ready="${!!directCropHarvestCommand(e,ctx.state.now)||e.kind==='fruit'&&e.status==='ready'}" style="${rectStyle(e)}" aria-label="${esc(title(e))}${draft?ctx.layout.isFixedEntity(e)?'，固定建筑，不能移动':'，拖动布置，完成后保存':status?'，'+esc(status):''}"><span class="fw-ground-mark" style="${groundStyle(e)};left:${groundRect(e,ctx.layout.getFootprint(e)).left-visualRect(e).left}px;top:${groundRect(e,ctx.layout.getFootprint(e)).top-visualRect(e).top}px"></span>${art(e,'fw-entity-art','back')}${ripeCharm(e,ctx.state.now,e.kind==='field'?[50,34]:[62,26])}${draft&&selected===e.id?`<span class="fw-drag-handle" aria-hidden="true">${ctx.layout.isFixedEntity(e)?'固定':'✥ 拖动'}</span>`:''}${badge?`<span class="fw-badge ${badgePolicy.mode==='dot'?'fw-status-dot':''}" ${badgePolicy.mode==='dot'?`aria-hidden="true" style="left:${(visualRect(e).foot?.x||0)-visualRect(e).left+12}px;top:${(visualRect(e).foot?.y||visualRect(e).bottom)-visualRect(e).top-9}px"`:''}>${badgeArt?`<img src="${esc(badgeArt.src)}" alt="" draggable="false">`:""}${esc(badge)}</span>`:''}${e.kind==='machine'&&!e.built?image('terrain/construction-scaffold.svg','','fw-scaffold'):''}</button>`;
        const layered=resolveWorldArt(e,ctx.state.now);if(layered?.frontOcclusion){const r=visualRect(e);html+=`<div aria-hidden="true" data-render-key="${e.id}:front" class="fw-decor-front ${faded.has(e.id)?'fw-occluder-faded':''}" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:${depth(e,ctx.layout.getFootprint(e))+1}">${renderRuntimeArt(layered,{className:'fw-entity-art',alt:'',mirror:mirroredArt(e),layer:'front'})}</div>`;}
        if(e.kind==='shelter'){
          const f=ctx.layout.getFootprint(e),layers=penLayers(e,f);
          html+=`<div data-render-key="${e.id}:ground" class="fw-pen-component" style="${layers.style};z-index:${layers.groundDepth}">${layers.ground}</div><div data-render-key="${e.id}:rear" class="fw-pen-component ${faded.has(e.id)?'fw-occluder-faded':''}" style="${layers.style};z-index:${layers.rearDepth}">${layers.rear}</div><div data-render-key="${e.id}:front" class="fw-pen-component ${faded.has(e.id)?'fw-occluder-faded':''}" style="${layers.style};z-index:${layers.frontDepth}">${layers.front}</div>`;
          (e.animals||[]).forEach((a,i)=>{const am=animalMeta(a,e),r=animalPlacement(e,f,i,am),shadow=am.shelterLayered&&resolveShelterAnimalShadow(a);
            if(shadow)html+=`<div data-render-key="${a.id}:shadow" class="fw-animal-shadow ${faded.has(e.id)?'fw-occluder-faded':''}" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:3">${renderRuntimeArt(shadow,{mirror:r.mirror})}</div>`;
            html+=`<button class="fw-animal ${am?.shelterLayered?'fw-layered-animal':''} ${faded.has(e.id)?'fw-occluder-faded':''} ${presentation.muted?'fw-muted-neighbor':''} ${selectedAnimal===a.id?'selected':''} ${gesture?.stroke?.seen.has(a.id)?'marked':''}" data-fw-motion="animal" data-animal="${a.id}" data-shelter="${e.id}" data-depth="${r.depth}" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:${r.depth};--fw-contact-x:${(r.mirror?1-(am.anchor?.[0]??.5):(am.anchor?.[0]??.5))*100}%;--fw-contact-y:${(am.anchor?.[1]??.9)*100}%" aria-label="${esc(name(a.configId))}，${a.status==='hungry'?'饿了':a.status==='ready'?'产物待收':remaining(a.readyAt)}">${animalArt(a,e)}${selected===e.id&&!draft?`<span class="fw-animal-state ${a.status==='ready'?'fw-ready-output':''}">${a.status==='ready'?item(config.ANIMALS[a.configId].product):a.status==='hungry'?item(config.ANIMALS[a.configId].feedItem):'◷'}</span>`:''}</button>`;
          });
          const summary=shelterSummary(e);if(!draft&&summary&&selected!==e.id&&!faded.has(e.id)){const g=groundRect(e,f),p=resolveShelterSpec(e)?shelterCanvasPoint(e,f,[1050,590]):{x:g.right,y:(g.top+g.bottom)/2};html+=`<button data-render-key="${e.id}:summary" class="fw-pen-summary" data-pen="${e.id}" style="left:${p.x-9}px;top:${p.y-24}px;z-index:${layers.frontDepth+2}" aria-label="${esc(title(e))}，${summary.label}，选择工具">${summary.state==='ready'?item(config.ANIMALS[e.configId].product):item(config.ANIMALS[e.configId].feedItem)}<small>${summary.count}</small></button>`;}
          if(!draft&&selected===e.id) {const g=groundRect(e,f);html+=`<button data-render-key="${e.id}:label" class="fw-pen-label" data-pen="${e.id}" style="left:${(g.left+g.right)/2-30}px;top:${g.bottom+3}px;z-index:1600" aria-label="查看${esc(title(e))}，${e.animals.length}只">${esc(title(e))} ${e.animals.length}/${config.ANIMALS[e.configId].capacity}</button>`;}

        }
        if(e.kind==='machine'&&e.completed.length&&presentation.showProducts){const tray=compactTrayPlacement(visualRect(e),resolveWorldArt(e),camera.zoom,mirroredArt(e));html+=`<div data-render-key="${e.id}:products" class="fw-products ${faded.has(e.id)?'fw-occluder-faded':''}" style="left:${tray.x}px;top:${tray.y}px;width:${tray.width}px;height:${tray.height}px;--fw-output-target:${tray.width}px;z-index:${depth(e,ctx.layout.getFootprint(e))+3}">${e.completed.slice(0,tray.slots).map(j=>`<button data-fw-motion="ready" data-product="${j.id}" data-machine="${e.id}" aria-label="领取${esc(name(j.recipeId))}">${item(j.recipeId)}${e.completed.length>1?`<small class="fw-output-count">${e.completed.length}</small>`:""}</button>`).join('')}</div>`;}
      }
      if(draft){const e=entities.find(e=>e.id===selected);if(e&&ctx.layout.needsDoor(e)){const door=ctx.layout.operationDoor(e),p=project(door.x+.5,door.y+.5);html+=`<span class="fw-door-marker" style="left:${p.x}px;top:${p.y}px">${legacyArtRotation(e)?'旧朝向 · 通路':'门口通路'}</span>`;}}
      const retiring=[...world.querySelectorAll('.fw-forest-decor:not(.fw-forest-retreat)')].filter(el=>ctx.state.openedLand.includes(el.dataset.forestPatch)).slice(0,24).map(el=>{const copy=el.cloneNode(true);copy.classList.add('fw-forest-retreat');return copy;});
      if(ctx.profile)ctx.profile({name:'world.map.build',duration:win.performance.now()-profileStart});
      const patchStart=ctx.profile?win.performance.now():0;
      patchFarmMarkup(world,html);
      if(ctx.profile)ctx.profile({name:'world.map.patch',duration:win.performance.now()-patchStart});
      for(const el of retiring)world.appendChild(el);
      if(retiring.length){win.clearTimeout(forestRetreatTimer);forestRetreatTimer=win.setTimeout(()=>world.querySelectorAll('.fw-forest-retreat').forEach(el=>el.remove()),700);}
      if(focused){world.querySelector(`[data-entity="${focused}"]`)?.focus({preventScroll:true});}
      renderGhost();transform();
    }
    function refreshClockLabels(){
      for(const el of world.querySelectorAll('[data-entity]')){
        const e=entity(el.dataset.entity);if(!e)continue;
        const status=stateBadge(e),label=title(e)+(draft?ctx.layout.isFixedEntity(e)?'，固定建筑，不能移动':'，拖动布置，完成后保存':status?'，'+status:'');
        if(el.getAttribute('aria-label')!==label)el.setAttribute('aria-label',label);
        const badge=el.querySelector('.fw-badge'),policy=worldBadge(e,ctx.state.now,{selected:selected===e.id,editing:!!draft,harvestView}),text=policy.text||status;if(badge&&!badge.classList.contains('fw-status-dot')&&!badge.querySelector('img')&&badge.textContent!==text)badge.textContent=text;
      }
      for(const el of world.querySelectorAll('[data-animal]')){
        const e=entity(el.dataset.shelter),a=e?.animals.find(a=>a.id===el.dataset.animal);if(!a)continue;
        const label=name(a.configId)+'，'+(a.status==='hungry'?'饿了':a.status==='ready'?'产物待收':remaining(a.readyAt));if(el.getAttribute('aria-label')!==label)el.setAttribute('aria-label',label);
      }
    }
    function renderForest(){
      const profileStart=ctx.profile?win.performance.now():0;
      // ResizeObserver/reframeViewport owns viewport reads; do not force layout
      // here immediately after patching the world or changing its transform.
      const host=world.querySelector('.fw-forest'),{w:viewportWidth,h:viewportHeight}=viewSize;if(!host||!(viewportWidth>0&&viewportHeight>0))return;
      // Quantised culling bounds avoid rebuilding hundreds of sprites on every pan pixel.
      const left=Math.floor((-camera.x/camera.zoom)/128)*128-160,top=Math.floor((-camera.y/camera.zoom)/128)*128-160;
      const width=Math.ceil(viewportWidth/camera.zoom/128)*128+448,height=Math.ceil(viewportHeight/camera.zoom/128)*128+448;
      const key=[selected,harvestView,!!draft,ctx.state.openedLand.join(',')].join('|');
      const visible={left:-camera.x/camera.zoom,top:-camera.y/camera.zoom,right:(viewportWidth-camera.x)/camera.zoom,bottom:(viewportHeight-camera.y)/camera.zoom};
      // Reuse overscan until the actual viewport escapes it; quantisation alone
      // oscillated at a grid boundary and reparsed the forest on every small pan.
      if(key===forestKey&&forestViewport&&visible.left>=forestViewport.left&&visible.top>=forestViewport.top&&visible.right<=forestViewport.right&&visible.bottom<=forestViewport.bottom)return;
      forestKey=key;forestViewport={left,top,right:left+width,bottom:top+height};
      const rows=effectiveEntities().filter(e=>!e.stored);
      const roadKey=rows.filter(e=>e.kind==='road').map(e=>`${e.id}:${e.x},${e.y}`).join(';');
      const modelKey=[left,top,width,height,ctx.state.openedLand.join(','),roadKey].join('|');
      if(modelKey!==forestModelKey){forestModelKey=modelKey;const viewport={left,top,right:left+width,bottom:top+height};forestModel={...forestBoundary(ctx.state,{viewport}),fringe:workshopForestFringe({...ctx.state,entities:rows},{viewport}),fog:workshopForestFog(ctx.state,{viewport})};}
      const model=forestModel;
      const protectedRects=rows.filter(e=>e.kind!=='road').map(e=>{const r=visualRect(e);return {r:{...r,right:r.left+r.width,bottom:r.top+r.height},z:entityPaintDepth(e)};});
      let html='';
      // Port-aligned keyed connectors replace the old blurred border line.
      for(const a of model.fringe)html+=`<img class="fw-forest-fringe" data-forest-id="${esc(a.id)}" src="${esc(a.src)}" alt="" draggable="false" style="left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px">`;
      for(const d of [...model.decorations,...model.obstacles]){
        const preview=d.kind==='obstacle',art=preview?resolveObstacleArt(d):resolveEnvironmentArt(d.key);if(!art)continue;
        let r,z;
        if(preview){r=environmentRect(d,{w:1,h:1},art);z=depth(d);}
        else{const foot=project(d.x+.5,d.y+.5),w=({ 'natural-tree':76,'natural-bush':42})[d.key]||38;const width=w*d.scale,height=width*art.height/art.width;r={left:foot.x-width*art.anchor[0]/art.width,top:foot.y-height*art.anchor[1]/art.height,width,height};z=Math.round((d.x+d.y+2)*10);}
        const box={...r,right:r.left+r.width,bottom:r.top+r.height};
        const fade=selected===d.patchId||protectedRects.some(p=>z>=p.z&&overlaps(box,p.r));
        html+=`<img class="fw-forest-sprite ${preview?'fw-forest-obstacle':'fw-forest-decor'} ${fade?'fw-forest-muted':''}" data-forest-id="${esc(d.id)}" data-forest-patch="${esc(d.patchId)}" src="${esc(art.src)}" alt="" draggable="false" style="left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:${z};${d.mirror?'transform:scaleX(-1)':''}">`;
      }
      for(const a of model.fog){const box={left:a.left,top:a.top,right:a.left+a.width,bottom:a.top+a.height};if(selected===a.patchId||protectedRects.some(p=>overlaps(box,p.r)))continue;
        html+=`<img class="fw-forest-fog" data-forest-id="${esc(a.id)}" data-forest-patch="${esc(a.patchId)}" src="${esc(a.src)}" alt="" draggable="false" style="left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px">`;
      }
      const patchStart=ctx.profile?win.performance.now():0;
      if(ctx.profile)ctx.profile({name:'world.forest.build',duration:patchStart-profileStart});
      patchFarmMarkup(host,html);
      if(ctx.profile)ctx.profile({name:'world.forest.patch',duration:win.performance.now()-patchStart});
    }
    function transform(){world.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;world.style.setProperty('--fw-output-scale',1/camera.zoom);renderForest();if(!gesture&&!pinch)refreshMotion();}
    function worldPoint(p){const r=view.getBoundingClientRect();return unproject((p.x-r.left-camera.x)/camera.zoom,(p.y-r.top-camera.y)/camera.zoom);}
    function viewportSize(){return {w:view.clientWidth,h:view.clientHeight};}
    function focus(e,zoom){if(!e)return;const f=ctx.layout.getFootprint(e),size=viewportSize();if(!(size.w>0&&size.h>0))return;camera.zoom=zoom||camera.zoom;const p=project(e.x+f.w/2,e.y+f.h/2);camera.x=size.w/2-p.x*camera.zoom;camera.y=size.h*(id==='P05'&&e.kind==='machine'?.34:.43)-p.y*camera.zoom;viewSize=size;focusAnchor=id==='P05'&&e.kind==='machine'?{id:e.id,rx:.5,ry:.34}:null;cameraReady=true;transform();}
    function reframeViewport(){
      resizeRaf=0;if(destroyed)return;const next=viewportSize();if(!(next.w>0&&next.h>0))return;
      if(!cameraReady){defaultFocus();return;}
      const target=focusAnchor&&selected===focusAnchor.id?entity(focusAnchor.id):null,f=target?ctx.layout.getFootprint(target):null;
      const anchor=target?{...project(target.x+f.w/2,target.y+f.h/2),rx:focusAnchor.rx,ry:focusAnchor.ry}:null;
      camera=resizeWorldCamera(camera,viewSize,next,anchor);viewSize=next;transform();
    }
    function scheduleReframe(){if(!resizeRaf)resizeRaf=win.requestAnimationFrame(reframeViewport);}

    function overview(){const next=fitOverview(effectiveEntities().filter(e=>!e.stored&&e.kind!=='obstacle').map(visualRect),viewportSize());if(next){camera=next;cameraReady=true;focusAnchor=null;viewSize=viewportSize();transform();rememberCamera(true);}}
    function defaultFocus(){const all=ctx.state.entities;const target=id==='P03'?all.find(e=>e.kind==='fruit'):id==='P04'?all.find(e=>e.kind==='shelter'&&e.configId==='chicken'):id==='P05'?all.find(e=>e.kind==='machine'&&e.configId==='bakery'):id==='P12'?ctx.layout.LAND_PATCHES.find(p=>ctx.layout.canExpandLand(ctx.state,p.id).ok):id==='P16'?all.find(e=>!ctx.layout.isFixedEntity(e)&&!e.stored):all.find(e=>e.kind==='field');focus(target||all.find(e=>e.kind==='field')||all[0],id==='P04'?1.5:id==='P05'?1.6:id==='P03'?1.4:id==='P12'?.75:1);}
    function renderCorners(){patchFarmMarkup(corners,`<div class="fw-corner fw-tl"><div class="fw-top-actions">${button('exit-farm','回首页','<span aria-hidden="true">⌂</span>','class="fw-home-button" aria-label="返回小院首页"')}${button('chapter:P13',`${ctx.state.level}级`,'<span>★</span>','aria-label="等级与任务"')}</div><small>${ctx.state.xp} XP · ${esc(farmGrowthStage(ctx.state).name)}</small></div><div class="fw-corner fw-tr">${button('shop',String(ctx.state.coins),'<span>●</span>','aria-label="金币与商店"')}${button('chapter:P07',vouchersEnabled()?`${ctx.state.vouchers}券`:'建设券功能关闭','',vouchersEnabled()?'aria-label="建设券"':'disabled aria-label="建设券功能关闭"')}</div><div class="fw-corner fw-bl">${button('shop','商店',image('ui/shop.svg','','fw-icon'))}${button('harvest-view',harvestView?'结束透视':'农田透视','',`aria-pressed="${harvestView}"`)}</div><div class="fw-corner fw-br">${button('more','更多','<span>•••</span>',`aria-expanded="${more}"`)}</div>${more?`<nav class="fw-more" aria-label="农场更多入口">${[['chapter:P08','粮仓 / 货仓'],['chapter:P11','订单板'],['chapter:P09','乡间集市'],['chapter:P13','任务册'],['chapter:P14','牧场故事'],['chapter:P12','开垦土地'],['chapter:P19','外观与收纳'],['edit','布置农场'],['chapter:P17','设置与帮助'],['home-camera','农场全景'],['zoom-in','放大地图'],['zoom-out','缩小地图']].map(([a,n])=>button(a,n)).join('')}<button type="button" data-display-open aria-haspopup="dialog">屏幕与方向</button>${button('more','收起')}</nav>`:''}`);}
    function toolArt(action,itemId,entityId){
      const e=entity(entityId);
      if(action==='harvest'&&e?.kind==='fruit')return `<img class="fw-tool-art" src="${esc(priorityIconUrl('tools/fruit-basket.svg'))}" alt="" draggable="false">`;
      // Animals keep their direct product tap/swipe flow; no basket/tool step.
      return action==='harvest'||action==='collectAnimal'?image('ui/harvest.svg','','fw-tool-art'):itemId?item(itemId):image('ui/sow.svg','','fw-tool-art');
    }
    function tool(action,label,itemId,entityId,recipeId){return `<button class="fw-tool" ${action==='feed'&&!(ctx.state.inventory[itemId]>0)?'disabled':''} data-tool="${action}" data-owner="${entityId||''}" data-item="${itemId||''}" data-recipe="${recipeId||''}" aria-label="${esc(label)}，按住拖向目标">${toolArt(action,itemId,entityId)}<span>${esc(label)}</span>${action==='enqueue'?`<small class="fw-recipe-cost">${Object.entries(config.RECIPES[recipeId].inputs).map(([key,n])=>`${esc(name(key))}×${n}${(ctx.state.inventory[key]||0)<n?'（缺）':''}`).join(' · ')}</small>`:''}</button>`;}
    function renderContext(){
      if(chosenSeed&&!selected&&!gesture&&!draft&&!placement&&!more&&!localPage){patchFarmMarkup(context,`<div class="fw-seed-mode">${tool('plant',name(chosenSeed),chosenSeed,'__seedmode')}<span>${esc(name(chosenSeed))} · 余 ${ctx.state.inventory[chosenSeed]||0}份<br>按住种子拖过空田，连续播种</span>${button('stop-seeding','结束播种')}</div>`);return;}
      if(gesture||draft||placement||more||localPage){patchFarmMarkup(context,'');return;}
      const e=selectedEntity();if(!e){patchFarmMarkup(context,'');return;}
      let body='',sub='',management='';
      if(e.kind==='field'){
        if(!e.crop){const crops=Object.values(config.CROPS).filter(c=>c.level<=ctx.state.level),group=crops.slice(seedPage*4,seedPage*4+4);body=group.map(c=>tool('plant',`${c.name} ${ctx.state.inventory[c.id]||0}`,c.id,e.id)).join('')+(crops.length>4?button('seeds-next',`种子 ${seedPage+1}/${Math.ceil(crops.length/4)} · 下一页`):'');sub='拖过空田，逐格播种';}
        else if(e.crop.readyAt<=ctx.state.now){body=tool('harvest','镰刀 · 连续收获',null,e.id);sub='拖过成熟田，逐格收获';}
        else{sub=`${name(e.crop.itemId)}还需 ${remaining(e.crop.readyAt)}`;body=image(entityArt(e),'正在生长','fw-growing');}
      }else if(e.kind==='fruit'){
        const c=config.FRUITS[e.configId];sub=e.status==='ready'?`本次 ${c.sequence[e.harvestStage]}个 · 第${e.harvestStage+1}轮 / ${c.sequence.length}轮`:e.status==='growing'?`再等 ${remaining(e.readyAt)}`:e.status==='revive'?`园丁免费次数：${Math.max(0,3-(ctx.state.npc.freeRevives||0))}`:'已完成最后一轮结果';
        body=e.status==='ready'?tool('harvest','果篮 · 连续采摘',e.configId,e.id):e.status==='revive'?button('revive','请园丁复苏',item(e.configId))+button('revive-voucher',vouchersEnabled()?'使用 1 建设券':'建设券功能关闭','',vouchersEnabled()?'':'disabled'):e.status==='withered'?button('clear-tree',`清理 · ${name(c.clearTool)}×1`,item(c.clearTool)):image(entityArt(e),'生长中','fw-growing');
      }else if(e.kind==='shelter'){
        const c=config.ANIMALS[e.configId],a=e.animals.find(a=>a.id===selectedAnimal);sub=`${e.animals.length}/${c.capacity}只 · 饲料 ${ctx.state.inventory[c.feedItem]||0}${a?' · '+(a.status==='producing'?remaining(a.readyAt):a.status==='ready'?'这一只待收':'这一只饿了'):''}`;
        body=(e.animals.some(a=>a.status==='hungry')?tool('feed','饲料袋 · 连续喂养',c.feedItem,e.id):'')+(e.animals.some(a=>a.status==='ready')?tool('collectAnimal',({chicken:'收蛋篮',cow:'奶桶',sheep:'剪毛工具'})[e.configId]||'收取篮',c.product,e.id):'')+button('adopt','领养',item(c.product),e.animals.length>=c.capacity?'disabled':'');if(e.animals.length)body+=button('move-animal-panel','迁移伙伴');sub+=' · 拖饲料袋喂同栏饥饿动物，拖收取工具收同栏产物；抬手后再换另一种工具';if(!(ctx.state.inventory[c.feedItem]>0)&&e.animals.some(a=>a.status==='hungry'))body+=button('source:'+c.feedItem,'去制作饲料');
      }else if(e.kind==='machine'){const mastery=resolveMachineMasteryArt(e,ctx.state);body=(mastery?`<img class="fw-mastery-state" src="${mastery.src}" alt="机器熟练度">`:'')+machineBoard(e);sub='拖配方到本机器或上方空生产槽排产；点或划过完成品连续收取。等待中的任务长按拖动排序。';}
      else if(e.kind==='obstacle'){const t=e.configId==='natural_tree'?'saw':e.configId==='natural_bush'?'axe':'shovel';body=button(`obstacle:${t}`,`${name(t)} ×1`,item(t));if(e.configId==='rock')body+=button('obstacle:dynamite','炸药 ×1',item('dynamite'))+button('obstacle:tnt','TNT ×1',item('tnt'));sub='选工具先看实际清理目标，确认前不消耗。';}
      else if(e.kind==='barn'||e.kind==='silo'){body=button('chapter:P08','打开仓库',art(e))+button(`upgrade-storage:${e.kind}`,'查看扩容');sub=`${ctx.core.storageUsed(ctx.state,e.kind)} / ${ctx.state.storage[e.kind].capacity}`;}
      else if(ctx.layout.isFixedEntity(e)){body=button('edit','布置其他物件');sub='固定建筑 · 不可移动';}
      if(!ctx.layout.isFixedEntity(e))management=`<details class="fw-object-management" data-owner="${esc(e.id)}"${context.querySelector?.('.fw-object-management')?.dataset.owner===e.id&&context.querySelector('.fw-object-management').open?' open':''}><summary>管理</summary>${button('edit',`移动${title(e)}`,'','class="fw-move-object"')}</details>`;
      patchFarmMarkup(context,`<div class="fw-object-panel ${e.kind==='machine'?'fw-machine-panel':''}"><header><strong>${esc(title(e))}</strong>${button('close-tool','×','','aria-label="收起对象工具"')}</header><div class="fw-tool-row">${body}</div><footer class="fw-object-footer">${sub?`<p>${esc(sub)}</p>`:''}${management}</footer></div>`);
    }
    function machineBoard(e){
      if(!e.built)return `<div class="fw-build-state">${image('terrain/construction-scaffold.svg')}${e.buildReadyAt<=ctx.state.now?button('complete-building','揭幕 · 领取建成经验'):`<span>施工中 · ${remaining(e.buildReadyAt)}</span>`}</div>`;
      const recipes=Object.values(config.RECIPES).filter(r=>r.machineType===e.machineType&&r.level<=ctx.state.level),show=recipes.slice(recipePage*3,recipePage*3+3);
      const slots=Array.from({length:e.slots},(_,i)=>{const j=e.queue[i];return j?`<button class="fw-job ${j.startAt!==null?'running':'waiting'}" data-job="${j.id}" aria-label="${esc(name(j.recipeId))}，${j.startAt!==null?'制作中':'等待；可拖动排序'}">${item(j.recipeId)}<small>${j.startAt!==null?remaining(j.readyAt):`等待 ${i}`}</small></button>`:`<div class="fw-job empty" aria-label="空生产槽">＋</div>`;}).join('');
      return `<div class="fw-production"><div class="fw-tray" aria-label="完成品托盘">${e.completed.length?e.completed.map(j=>`<button data-fw-motion="ready" data-product="${j.id}" data-machine="${e.id}" aria-label="领取${esc(name(j.recipeId))}">${item(j.recipeId)}<small>领取</small></button>`).join(''):'<span>完成品会摆在这里</span>'}</div><div class="fw-queue" data-queue-owner="${e.id}" aria-label="运行与等待槽，拖配方到这里排产">${slots}${button('upgrade-machine',vouchersEnabled()?(e.slots>=9?'槽位已满':'扩槽'):'扩槽功能关闭','',vouchersEnabled()&&e.slots<9?'':'disabled')}</div><div class="fw-recipe-row">${show.map(r=>`<div class="fw-recipe-choice">${tool('enqueue',`${r.name} · ${Math.ceil(r.durationMs/60000)}分`,r.id,e.id,r.id)}${button('recipe-detail:'+r.id,'详情','','aria-label="查看'+esc(r.name)+'原料详情"')}</div>`).join('')}${recipes.length>3?button('recipes-next','更多配方'):''}</div></div>`;
    }
    function doAct(command,success='已完成',deferPresentation=false,feedback) {
      const feedBefore=command.type==='feed'?ctx.state.entities.flatMap(e=>(e.animals||[]).filter(a=>a.status==='hungry').map(a=>a.id)):[];
      // Only callers with a guaranteed same-task final render may defer this
      // scene's synchronous store notification. State and persistence stay sync.
      const defer=deferPresentation&&id==='P01';let result;
      if(defer)presentationDepth++;
      try{result=ctx.act(command,feedback);}finally{if(defer)presentationDepth--;}
      if(!result.ok){
        const code=result.error?.code||result.code||result.error;
        if(code==='KEEP_SEED_RESERVE'&&command.type==='enqueue'&&!command.allowSeedReserve){
          const recipe=config.RECIPES[command.recipeId],inputs=Object.entries(recipe.inputs).map(([key,n])=>`${esc(name(key))}×${n}`).join('、');
          ctx.confirm({title:'本次使用最后一份种子？',body:`<p>制作${esc(recipe.name)}将消耗${inputs}，至少一种作物会用掉最后一份库存。请确认田间或待收作物足够继续播种。</p><p>仅本次解除留种保护；后续制作仍默认留种。取消不会扣料。</p>`,onConfirm:()=>doAct({...command,allowSeedReserve:true},success)});
        }else ctx.say(result.message||result.error?.message||String(result.error||'未执行'));return result;
      }
      const skipped=result.skipped||result.delta?.skipped||[];
      const events=result.delta?.events||[];
      if(skipped.length&&!events.length){ctx.say(`未执行：${skipped[0].message||'目标当前不可操作'}`);return result;}
      if(command.type==='feed'){const fed=ctx.state.entities.flatMap(e=>(e.animals||[]).filter(a=>feedBefore.includes(a.id)&&a.status==='producing').map(a=>a.id));animalAnimation.playEat(fed);}
      const changes=Object.entries(result.delta?.items||{}).filter(([,q])=>q).map(([key,q])=>`${name(key)} ${q>0?'+':''}${q}`);
      ctx.say(`${success}${result.delta?.coins?' · 金币 '+(result.delta.coins>0?'+':'')+result.delta.coins:''}${changes.length?' · '+changes.join('，'):''}${skipped.length?` · 跳过 ${skipped.length} 个`:''}`);return result;
    }
    function ask(command,title,body,success){ctx.confirm({title,body,onConfirm:()=>doAct(command,success||'已完成')});}
    function renderLocal(){
      if(!localPage){patchFarmMarkup(local,'');return;}
      let body='',heading='';
      if(localPage==='recipe'){
        const r=config.RECIPES[pendingRecipe];heading=r.name;
        body=`<div class="fw-materials">${Object.entries(r.inputs).map(([key,n])=>`<div>${item(key)}<strong>${ctx.state.inventory[key]||0} / ${n}</strong><small>${esc(name(key))}</small>${(ctx.state.inventory[key]||0)<n?button('source:'+key,'去获取'):''}</div>`).join('')}</div><p>制作 ${Math.ceil(r.durationMs/60000)} 分钟 · 产出 ${Object.entries(r.outputs).map(([key,n])=>`${name(key)}×${n}`).join('、')}</p>${button('enqueue-confirm','开始制作')}`;
      }else if(localPage==='job'){
        const e=selectedEntity(),j=e?.queue.find(j=>j.id===activeJob);heading='等待槽';
        body=j?`${item(j.recipeId,'fw-large-item')}<p>${esc(name(j.recipeId))} · ${j.startAt!==null?'制作中，不可撤销':'尚未开工，可调整顺序或取消返料'}</p>${j.startAt===null?button('job-earlier','往前一格')+button('job-later','往后一格')+button('job-cancel','取消并退还原料'):''}`:'<p>这一批已经完成，去托盘看看吧。</p>';
      }else if(localPage==='move-animal'){
        const e=selectedEntity();heading='迁移伙伴 · 保留生产计时';
        const targets=ctx.state.entities.filter(t=>t.kind==='shelter'&&t.id!==e?.id&&t.configId===e?.configId&&t.animals.length<config.ANIMALS[t.configId].capacity);
        body=!e||!targets.length?'<p>还没有有空位的同类栏舍。可先在商店建造同类栏舍。</p>':`<p>选择伙伴和目标栏舍。迁移不收费、不喂养，也不重置生产或待收产物。</p>${e.animals.map((a,i)=>`<section class="fw-animal-transfer">${animalArt(a,e)}<strong>${esc(name(a.configId))} ${i+1} · ${a.status==='ready'?'产物待收':a.status==='hungry'?'饿了':remaining(a.readyAt)}</strong><div>${targets.map(t=>button('move-animal:'+a.id+':'+t.id,`迁入 (${t.x},${t.y}) · ${t.animals.length}/${config.ANIMALS[t.configId].capacity}`)).join('')}</div></section>`).join('')}`;
      }else if(localPage==='layouts'){
        heading='两张布局方案';body=`<div class="fw-layout-slots">${[0,1].map(slot=>{const positions=ctx.state.layoutSlots[slot];return `<section><strong>方案 ${slot+1}</strong>${renderLayoutThumbnail(positions,slot)}${button(`save-slot:${slot}`,'记录草稿')}${button(`load-slot:${slot}`,'放入草稿','',positions?'':'disabled')}</section>`;}).join('')}</div>`;
      }
      patchFarmMarkup(local,`<section class="fw-local-sheet" aria-label="${esc(heading)}"><header><h3>${esc(heading)}</h3>${button('close-local','×','','aria-label="关闭局部面板"')}</header>${body}</section>`);
    }
    function renderLayoutThumbnail(positions,slot){
      if(!positions)return '<div class="fw-minimap fw-minimap-empty"><span>还没保存</span></div>';
      const {entities}=layoutThumbnail(ctx.state,positions),rects=entities.map(e=>visualRect(e));
      if(!rects.length)return '<div class="fw-minimap fw-minimap-empty">空方案</div>';
      const left=Math.min(...rects.map(r=>r.left))-12,top=Math.min(...rects.map(r=>r.top))-12,right=Math.max(...rects.map(r=>r.left+r.width))+12,bottom=Math.max(...rects.map(r=>r.top+r.height))+12,w=right-left,h=bottom-top;
      return `<div class="fw-minimap fw-scene-thumbnail" role="img" aria-label="方案${slot+1}的等距场景缩略图，${entities.length}个物件；只保存位置" style="aspect-ratio:${w}/${h}">${entities.map((e,index)=>{const r=rects[index];return `<span class="fw-mini-entity" aria-hidden="true" data-mini-entity="${e.id}" style="left:${(r.left-left)/w*100}%;top:${(r.top-top)/h*100}%;width:${r.width/w*100}%;height:${r.height/h*100}%;z-index:${r.depth}">${art(e)}</span>`;}).join('')}</div>`;
    }
    function buyCommand(){return placement?{type:'buy',category:placement.category,itemId:placement.configId,x:placement.x,y:placement.y,rotation:placement.rotation,...(['machine','shelter','field','fruit'].includes(placement.category)&&placement.growthOrigin&&placement.x===placement.growthOrigin.x&&placement.y===placement.growthOrigin.y&&placement.rotation===placement.growthOrigin.rotation?{growthPlacement:true}:{})}:null;}
    function placementCheck(){return placement?commandPreview(ctx,buyCommand()):{ok:false};}
    function penPreview(e){
      if(e.kind!=='shelter'||resolveShelterSpec(e))return '';
      const f=ctx.layout.getFootprint(e),r=visualRect(e),g=groundRect(e,f),layers=penLayers(e,f),style=`left:${g.left-r.left}px;top:${g.top-18-r.top}px;width:${g.width}px;height:${g.height+18}px`;
      return ['ground','rear','front'].map(layer=>`<div class="fw-pen-component" style="${style};z-index:${layer==='front'?2:0}">${layers[layer]}</div>`).join('');
    }
    function renderGhost(){
      world.querySelector('.fw-ghost')?.remove();
      if(placement){const check=placementCheck();world.insertAdjacentHTML('beforeend',`<div class="fw-ghost ${check.ok?'valid':'invalid'}" style="${rectStyle(placement)}"><img class="fw-placement-footprint" src="${resolveEnvironmentArt(check.ok?'footprint-valid':'footprint-conflict').src}" style="left:${groundRect(placement,ctx.layout.getFootprint(placement)).left-visualRect(placement).left}px;top:${groundRect(placement,ctx.layout.getFootprint(placement)).top-visualRect(placement).top}px;width:${groundRect(placement,ctx.layout.getFootprint(placement)).width}px;height:${groundRect(placement,ctx.layout.getFootprint(placement)).height}px" alt="">${penPreview(placement)}${art(placement)}<span>${check.ok?'✓ 可放置':'× 不能放置'}</span></div>`);}
    }
    function draftCheck(){return draft?ctx.layout.validateLayout(ctx.state,draft):{ok:false};}
    function renderTransaction(){
      if(growthPreview){const n=growthPreview.plan.proposedRoads.length;patchFarmMarkup(transaction,`<div class="fw-edit-panel"><strong>推荐布局预览 · 新增 ${n} 格免费连接道路</strong><small>只安排已经拥有的物件，道路采用商店原有 0 金币规则；此时尚未保存。可拖空白查看，先撤销预览才能手动调整。</small><div>${button('undo-growth-preview','撤销预览')}${button('cancel-edit','取消布置')}${button('save-edit','应用推荐布局与道路')}</div></div>`);return;}
      if(placement){const check=placementCheck();patchFarmMarkup(transaction,`<div class="fw-placement-panel"><strong>${esc(title(placement))} · ${placement.coins} 金币</strong><small>${check.ok?(buyCommand()?.growthPlacement?'推荐生长位置；确认时按 0 金币道路规则补齐连接道路，可拖动改为手动放置':'手动位置；只放置此物件，不调整已有布局'):esc(check.message)}</small><div>${button('rotate-placement','切换朝向','',artRotations(placement).length>1?'':'disabled')}${button('cancel-placement','取消')}${button('confirm-placement',`支付 ${placement.coins} 金币并放置`,'',check.ok?'':'disabled')}</div></div>`);return;}
      if(draft){const check=draftCheck(),original=selectedEntity(),e=original?{...original,...draft.positions.find(p=>p.id===selected)}:null;patchFarmMarkup(transaction,`<div class="fw-edit-panel"><strong>布置模式${e?' · '+esc(title(e)):''} · ${check.ok?'✓ 位置有效':'× '+esc(check.errors[0]?.message)}</strong><small class="fw-layout-instruction">${e&&ctx.layout.isFixedEntity(e)?'这个物件固定，不能移动。请拖动田地、仓库、工坊等其他物件。':'抓住物件直接拖动，拖空白移动地图。完成布置后保存，取消则恢复原位。'}</small><div>${button('rotate-draft',e&&legacyArtRotation(e)?'恢复正面朝向':'切换朝向','',e&&!ctx.layout.isFixedEntity(e)&&(artRotations(e).length>1||legacyArtRotation(e))?'':'disabled')}${button('undo','撤销','',undo.length?'':'disabled')}${button('redo','重做','',redo.length?'':'disabled')}${button('layouts','方案')}${button('growth-preview','预览成长布局')}${button('cancel-edit','取消')}${button('save-edit','完成布置','',check.ok?'':'disabled')}</div>${e&&ctx.layout.canStoreEntity(e)?button('store-object','收起此装饰'):''}<small>也可用方向键微调选中的可移动物件。</small></div>`);return;}
      if(clearPreview){patchFarmMarkup(transaction,`<div class="fw-placement-panel"><strong>${esc(name(clearPreview.tool))} ×1 → 清理 ${clearPreview.ids.length} 处</strong><small>消耗工具后，轮廓高亮的障碍将永久消失，不可撤销，不赠送材料。</small><div>${button('cancel-clear','取消')}${button('confirm-clear',`消耗 ${name(clearPreview.tool)} ×1 并清理 ${clearPreview.ids.length}处`)}</div></div>`);return;}
      if(ctx.layout.LAND_PATCHES.some(p=>p.id===selected)){const p=ctx.layout.LAND_PATCHES.find(p=>p.id===selected),check=ctx.layout.canExpandLand(ctx.state,selected),owned=ctx.state.openedLand.includes(selected),affordable=['land_deed','mallet','marker_stake'].every(key=>(ctx.state.inventory[key]||0)>=p[key]);patchFarmMarkup(transaction,`<div class="fw-land-panel"><header><strong>${owned?'已开放土地':'开垦 8 × 8 格'}</strong>${button('close-tool','×')}</header>${!owned?`<div class="fw-materials">${['land_deed','mallet','marker_stake'].map(key=>`<div>${item(key)}<strong class="${(ctx.state.inventory[key]||0)<p[key]?'short':''}">${ctx.state.inventory[key]||0} / ${p[key]}</strong></div>`).join('')}</div><small>${check.ok?(affordable?'开垦后保留树石，需另用工具清理':'扩地材料不足，请先收集所示材料'):esc(check.message)}</small>${button('expand-land','消耗所示材料并开垦','',check.ok&&affordable?'':'disabled')}`:`<p>${patchNeedsClearing(p)?'边界已经开放。自然障碍需要另选工具清理。':'土地已开放并清理，可以继续布置农场。'}</p>`}</div>`);return;}
      patchFarmMarkup(transaction,'');
    }
    function render(){if(destroyed)return;renderMap();renderCorners();renderContext();renderLocal();renderTransaction();game.dataset.reducedMotion=String(!!ctx.state.settings.reducedMotion);game.dataset.paused=String(doc.hidden||ctx.effectsPaused===true);refreshMotion();}
    function closeTemporary(){harvestView=false;chosenSeed=null;cancelGesture();more=false;localPage=null;clearPreview=null;pendingRecipe=null;activeJob=null;selected=null;selectedAnimal=null;render();}
    function openStorage(kind){if(ctx.openScene)ctx.openScene('P08',{initialStorage:kind});else ctx.say('仓库入口暂不可用');}
    function goToSource(itemId){if(ctx.openSource)ctx.openSource(itemId);else ctx.say('请前往'+name(itemId)+'对应的田地或生产设施');}
    function openObject(id,animal){
      cancelGesture();more=false;localPage=null;clearPreview=null;selected=id;selectedAnimal=animal||null;seedPage=0;recipePage=0;
      const e=entity(id),at=Date.now(),harvest=cropDoubleTapCommand(e,lastFieldTap,at,ctx.state.now,!!draft||!!placement);
      lastFieldTap=!draft&&!placement&&directCropHarvestCommand(e,ctx.state.now)?{id:e.id,at}:null;
      if(draft||placement){render();return;}
      if(harvest){lastFieldTap=null;chosenSeed=null;selected=null;try{const result=doAct(harvest,'作物已入仓',true);if(!result?.ok)selected=e.id;}finally{render();}return;}
      if(e?.kind!=='field'||e.crop)chosenSeed=null;
      if(e?.kind==='machine'&&!e.built&&e.buildReadyAt<=ctx.state.now){doAct({type:'completeBuilding',entityId:e.id},'新建筑已揭幕');render();return;}
      if(e?.kind==='barn'||e?.kind==='silo'){openStorage(e.kind);return;}
      if(e?.kind==='machine'&&e.built||e?.kind==='shelter'){
        harvestView=false;
        const create=()=>{coopPanel?.destroy();const panel=(e.kind==='shelter'?mountChickenCoop:mountFactoryPanel)(ctx,{entityId:e.id,onAction:a=>{selected=e.id;action(a);},onClose:()=>{coopPanel=null;selected=null;ctx.closeFacility?.();if(!destroyed)render();}});coopPanel=panel;return ()=>{panel.destroy();if(coopPanel===panel){coopPanel=null;selected=null;if(!destroyed)render();}};};
        if(!ctx.openFacility?.(e.id,create))create();return;
      }
      if(e?.kind==='shelter'){harvestView=false;focus(e,1.5);}else if(e?.kind==='machine')focus(e,id==='P05'?1.6:1.4);else if(e?.kind==='fruit')focus(e,1.35);
      render();
    }
    function startPlacement(category,key){
      cancelGesture();localPage=null;more=false;selected=null;
      const c=placementConfig(config,category,key);
      if(!c){ctx.say('这个物件暂时不能购买');return;}
      placement={id:'__preview',kind:category,category,configId:key,w:c.footprint[0],h:c.footprint[1],x:35,y:35,rotation:0,coins:c.coins};
      const suggested=suggestGrowthPlacement(ctx.state,placement);if(suggested){Object.assign(placement,suggested);placement.growthOrigin={x:suggested.x,y:suggested.y,rotation:0};}
      let found=!!suggested;for(let y=18;y<46&&!found;y++)for(let x=18;x<46&&!found;x++){placement.x=x;placement.y=y;if(placementCheck().ok)found=true;}
      focus(placement,1.25);render();
    }
    function persistLayoutDraft(){if(!draft||preserveStoredDraft||growthPreview)return;const result=ctx.store?.saveDraft?.(draft);if(result?.ok===false)ctx.say(result.message||'布局草稿未能自动保存，请勿关闭页面');return result;}
    function clearLayoutDraft(){const result=ctx.store?.clearDraft?.();if(result?.ok===false)ctx.say(result.message||'旧布局草稿未能清除');return result;}
    function enterEdit(){
      if(placement||draft)return;harvestView=false;cancelGesture();more=false;localPage=null;draft=ctx.layout.beginLayout(ctx.state);undo=[];redo=[];render();
      preserveStoredDraft=false;const saved=ctx.store?.loadDraft?.();if(!saved)return true;preserveStoredDraft=true;
      const recovered=recoverWorldLayoutDraft(ctx.state,saved,ctx.layout);if(!recovered.ok){ctx.say(recovered.message);return true;}
      if(JSON.stringify(recovered.draft.positions)===JSON.stringify(draft.positions)){preserveStoredDraft=false;return true;}
      ctx.confirm({title:'继续上次未保存的布置？',body:'<p>只恢复物件位置草稿。库存、生产计时、金币和正式布局不会回退；取消则先查看当前布局。</p>',onConfirm:()=>{const latest=recoverWorldLayoutDraft(ctx.state,saved,ctx.layout);if(!latest.ok){ctx.say(latest.message);return latest;}draft=latest.draft;preserveStoredDraft=false;undo=[];redo=[];render();return {ok:true};}});return false;
    }
    function pushDraft(next){const check=ctx.layout.validateLayout(ctx.state,next);if(!check.ok){ctx.say(check.errors[0]?.message||'这个位置不合适');return false;}undo.push(clone(draft.positions));if(undo.length>50)undo.shift();redo=[];preserveStoredDraft=false;draft.positions=clone(next);persistLayoutDraft();render();return true;}
    function changeDraft(id,values){if(!draft)return;if(growthPreview){ctx.say('推荐布局预览中，请先撤销预览再手动调整');return;}const e=entity(id);if(!e||ctx.layout.isFixedEntity(e)){ctx.say('固定物件不能挪动');return;}pushDraft(draft.positions.map(p=>p.id===id?{...p,...values}:p));}
    function saveDraft(){const command=growthPreview?{type:'adoptGrowthLayout',expectedSignature:growthPreview.plan.signature}:{type:'applyLayout',positions:draft.positions};const r=doAct(command,'布局已保存，生产继续计时');if(r.ok){clearLayoutDraft();growthPreview=null;draft=null;undo=[];redo=[];render();}}
    function cancelEdit(){if(!draft)return;if(growthPreview){draft.positions=growthPreview.previousPositions;growthPreview=null;}const changed=undo.length||JSON.stringify(draft.positions)!==JSON.stringify(ctx.layout.beginLayout(ctx.state).positions);if(!changed){if(!preserveStoredDraft)clearLayoutDraft();draft=null;render();return;}ctx.confirm({title:'放弃这次布置？',body:'<p>只丢弃未保存位置，生产与库存不回退。</p>',onConfirm:()=>{clearLayoutDraft();draft=null;undo=[];redo=[];render();}});}
    function reorderJob(direction){const e=selectedEntity(),ids=e.queue.filter(j=>j.startAt===null).map(j=>j.id),index=ids.indexOf(activeJob),to=index+direction;if(index<0||to<0||to>=ids.length)return;[ids[index],ids[to]]=[ids[to],ids[index]];doAct({type:'reorderQueue',entityId:e.id,jobIds:ids},'等待顺序已调整');}
    function action(action,el){
      lastFieldTap=null;
      if(action==='exit-farm'){cancelGesture();if(persistLayoutDraft()?.ok===false)return;more=false;ctx.exitFarm?.();return;}
      if(action.startsWith('chapter:')){if(draft){ctx.say('请先保存或取消布置');return;}closeTemporary();ctx.openScene?.(action.slice(8));return;}
      const e=selectedEntity();
      if(action==='harvest-view'){if(draft||placement){ctx.say('请先完成或取消布置');return;}cancelGesture();harvestView=!harvestView;selected=null;more=false;render();}
      else if(action==='more'){cancelGesture();selected=null;selectedAnimal=null;localPage=null;more=!more;render();}
      else if(action==='shop'){if(draft||placement){ctx.say('请先完成或取消当前布置');return;}ctx.openScene('P07');}
      else if(action==='move-animal-panel'){localPage='move-animal';render();}
      else if(action.startsWith('move-animal:')){const [,animalId,targetEntityId]=action.split(':');const r=doAct({type:'moveAnimal',entityId:e.id,animalId,targetEntityId},'伙伴已迁入，生产计时保留');if(r.ok)selectedAnimal=null;render();}
      else if(action==='close-local'){localPage=null;render();}
      else if(action==='close-tool'){closeTemporary();}
      else if(action==='stop-seeding'){chosenSeed=null;selected=null;render();}
      else if(action.startsWith('recipe-detail:')){pendingRecipe=action.slice(14);localPage='recipe';render();}
      else if(action.startsWith('source:'))goToSource(action.slice(7));
      else if(action==='seeds-next'){seedPage=(seedPage+1)%Math.ceil(Object.values(config.CROPS).filter(c=>c.level<=ctx.state.level).length/4);renderContext();}
      else if(action==='recipes-next'){recipePage=(recipePage+1)%Math.ceil(Object.values(config.RECIPES).filter(r=>r.machineType===e.machineType&&r.level<=ctx.state.level).length/3);renderContext();}
      else if(action==='home-camera'){cancelGesture();more=false;overview();render();}
      else if(action==='zoom-in'||action==='zoom-out'){cancelGesture();const before={x:(view.clientWidth/2-camera.x)/camera.zoom,y:(view.clientHeight/2-camera.y)/camera.zoom};camera.zoom=Math.max(.75,Math.min(1.75,camera.zoom+(action==='zoom-in'?.15:-.15)));camera.x=view.clientWidth/2-before.x*camera.zoom;camera.y=view.clientHeight/2-before.y*camera.zoom;transform();rememberCamera(true);}
      else if(action==='revive'||action==='revive-voucher'){if(action==='revive-voucher'&&!vouchersEnabled()){ctx.say('建设券功能关闭');return;}ask({type:'reviveTree',entityId:e.id,useVoucher:action==='revive-voucher'},'请园丁帮忙',`<p>${action==='revive-voucher'?'消耗 1 建设券':'使用今天的 1 次免费复苏机会'}。复苏后重新生长。</p>`,'果树已复苏');}
      else if(action==='clear-tree'){const toolId=config.FRUITS[e.configId].clearTool;ask({type:'clearTree',entityId:e.id,confirmed:true},'清理这棵树？',`<p>${name(toolId)} ×1。树会移除，不能撤销。</p>`,'树已清理');}
      else if(action==='adopt'){const c=config.ANIMALS[e.configId],cost=c.prices[e.tier||0];ask({type:'buy',category:'animal',itemId:e.configId,entityId:e.id,quantity:1},'领养一位伙伴',`<p>${cost} 金币 · 入住当前${c.name}舍。</p>`,'新伙伴入住啦');}
      else if(action==='complete-building')doAct({type:'completeBuilding',entityId:e.id},'新建筑揭幕啦');
      else if(action==='enqueue-confirm'){const r=doAct({type:'enqueue',entityId:e.id,recipeId:pendingRecipe},'配方已放入队列');if(r.ok){localPage=null;render();}}
      else if(action==='upgrade-machine'){if(!vouchersEnabled()){ctx.say('建设券扩槽功能关闭');return;}if(e.slots>=9){ctx.say('槽位已满');return;}const n=config.FARM_CONFIG.constructionVoucher.ordinarySlots[e.slotUpgrades||0];ask({type:'upgradeMachine',entityId:e.id},'增加一个生产槽',`<p>消耗 ${n} 建设券。当前 ${e.slots}/9 槽。</p>`,'生产槽已增加');}
      else if(action.startsWith('upgrade-storage:')){const kind=action.split(':')[1],ids=kind==='silo'?['nail','screw','wood_panel']:['bolt','duct_tape','plank'],n=ctx.state.storage[kind].upgrades+1;ask({type:'upgradeStorage',storage:kind},'扩建仓库',`<p>消耗 ${ids.map(key=>`${name(key)}×${n}`).join('、')}。</p>`,'仓库扩建完成');}
      else if(action.startsWith('obstacle:')){const toolId=action.split(':')[1];clearPreview={tool:toolId,ids:obstacleTargets(ctx.state,e,toolId)};render();}
      else if(action==='cancel-clear'){clearPreview=null;render();}
      else if(action==='confirm-clear'){if(!clearPreview)return;const p={...clearPreview};const r=doAct({type:'clearObstacle',entityIds:p.ids,toolId:p.tool,confirmed:true},'障碍已清理');if(r.ok)clearPreview=null;render();}
      else if(action==='expand-land'){doAct({type:'expandLand',patchId:selected},'土地已开放');render();}
      else if(action==='rotate-placement'){placement.rotation=nextArtRotation(placement);render();}
      else if(action==='cancel-placement'){placement=null;ctx.openScene('P07');}
      else if(action==='confirm-placement'){const r=doAct(buyCommand(),'购买完成');if(r.ok){placement=null;selected=null;render();}}
      else if(action==='edit')enterEdit();
      else if(action==='rotate-draft'){const p=draft.positions.find(p=>p.id===selected);if(p&&!ctx.layout.isFixedEntity(e))changeDraft(selected,{rotation:nextArtRotation({...e,...p})});}
      else if(action==='undo'&&undo.length){redo.push(clone(draft.positions));draft.positions=undo.pop();persistLayoutDraft();render();}
      else if(action==='redo'&&redo.length){undo.push(clone(draft.positions));draft.positions=redo.pop();persistLayoutDraft();render();}
      else if(action==='save-edit')saveDraft();
      else if(action==='cancel-edit')cancelEdit();
      else if(action==='store-object'){changeDraft(selected,{stored:true});ctx.say('完成布置后，可在更多 → 外观与收纳重新摆出，不重复收费');}
      else if(action==='growth-preview'){const proposed=previewGrowthLayout(ctx.state);if(!proposed.ok){ctx.say(proposed.errors?.[0]?.message||'当前物件暂不能采用成长布局');return;}growthPreview={previousPositions:clone(draft.positions),plan:proposed};draft.positions=clone(proposed.positions);selected=null;render();ctx.say('推荐布局和连接道路仅预览，点击应用才保存');}
      else if(action==='undo-growth-preview'&&growthPreview){draft.positions=growthPreview.previousPositions;growthPreview=null;selected=null;render();}
      else if(action==='layouts'){localPage='layouts';render();}
      else if(action.startsWith('save-slot:'))doAct({type:'saveLayoutSlot',slot:Number(action.split(':')[1]),positions:draft.positions},'方案已记录');
      else if(action.startsWith('load-slot:')){const p=ctx.state.layoutSlots[Number(action.split(':')[1])];if(p&&pushDraft(p)){localPage=null;render();}}
      else if(action==='job-earlier')reorderJob(-1);
      else if(action==='job-later')reorderJob(1);
      else if(action==='job-cancel'){const j=e.queue.find(j=>j.id===activeJob);ask({type:'cancelJob',entityId:e.id,jobId:j.id},'取消等待中的这一批？',`<p>退还 ${Object.entries(j.inputs).map(([key,n])=>`${name(key)}×${n}`).join('、')}。货仓空间不足则不取消。</p>`,'原料已退回');}
    }
    function point(event){return {x:event.clientX,y:event.clientY};}
    function within(p,r){return r.polygon?pointInPolygon(p,r.polygon):p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;}
    function visibleTargetRect(el){
      const r=rectData(el.getBoundingClientRect()),panel=el.closest('.fw-object-panel');
      for(const bounds of [game.getBoundingClientRect(),...(panel?[panel.getBoundingClientRect()]:[])]) {
        r.left=Math.max(r.left,bounds.left);r.top=Math.max(r.top,bounds.top);r.right=Math.min(r.right,bounds.right);r.bottom=Math.min(r.bottom,bounds.bottom);
      }
      return r;
    }
    function shelterForegroundAt(e,p){const w=worldPoint(p);return shelterLayerHit(e,ctx.layout.getFootprint(e),'frontFence',project(w.x,w.y));}
    function targetsFor(tool){
      if(tool.action==='collectMachine')return [...root.querySelectorAll('[data-product]')].filter(el=>el.dataset.machine===tool.entityId).map(el=>({id:el.dataset.product,entityId:el.dataset.machine,...visibleTargetRect(el)}));
      if(tool.action==='feed'||tool.action==='collectAnimal')return [...world.querySelectorAll('[data-animal]')].filter(el=>{
        const shelter=entity(el.dataset.shelter),a=shelter?.animals.find(a=>a.id===el.dataset.animal);
        return !el.classList.contains('fw-occluder-faded')&&a?.status===(tool.action==='feed'?'hungry':'ready');
      }).map(el=>{const r=rectData((el.querySelector('.fw-animal-art')||el).getBoundingClientRect()),shelter=entity(el.dataset.shelter),a=shelter.animals.find(a=>a.id===el.dataset.animal),meta=animalAnimation.getArt(a.id,animalMeta(a,shelter));const badge=el.querySelector('.fw-animal-state')?.getBoundingClientRect(),bounds=badge?{left:Math.min(r.left,badge.left),top:Math.min(r.top,badge.top),right:Math.max(r.right,badge.right),bottom:Math.max(r.bottom,badge.bottom)}:r;return {id:a.id,entityId:shelter.id,...bounds,acceptPoint:p=>(badge&&within(p,badge))||(meta?runtimeArtHit(meta,(p.x-r.left)/(r.right-r.left),(p.y-r.top)/(r.bottom-r.top),{mirror:meta.shelterLayered&&mirroredArt(shelter)})&&!shelterForegroundAt(shelter,p):within(p,r))};});
      const origin=entity(tool.entityId);
      const bounds=view.getBoundingClientRect();const targets=[...world.querySelectorAll('[data-entity]')].filter(el=>{const e=entity(el.dataset.entity);return tool.action==='enqueue'?e.id===tool.entityId:tool.action==='plant'?e.kind==='field'&&!e.crop:origin?.kind==='fruit'?e.kind==='fruit'&&e.status==='ready':e.kind==='field'&&e.crop?.readyAt<=ctx.state.now;}).map(el=>{const e=entity(el.dataset.entity),polygon=screenPolygon(e,bounds);return {id:e.id,...polygonBounds(polygon),polygon};});
      if(tool.action==='enqueue')for(const el of root.querySelectorAll('[data-queue-owner]'))if(el.dataset.queueOwner===tool.entityId)targets.push({id:tool.entityId,...visibleTargetRect(el)});
      return targets;
    }
    function rectData(r){return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};}
    function actualUI(p,except){const el=doc.elementFromPoint(p.x,p.y);return !!el?.closest('.fw-corner,.fw-more,.fw-local-sheet,.fw-transaction>div,.fw-object-panel,.fw-seed-mode')&&!except?.contains(el);}
    function cancelGesture(reason){const immediate=gesture?.immediate;if(immediate)ctx.clearFeedback?.();if(reason&&gesture?.immediate)reason='已停止，已完成的操作已保留';pinch=null;const wasEdit=gesture?.type==='edit'&&draft;if(wasEdit)draft.positions=gesture.original;if(gesture?.stroke)cancelStroke(gesture.stroke,reason);gesture=null;note.hidden=true;cursor.hidden=true;root.querySelectorAll('.marked').forEach(el=>el.classList.remove('marked'));if(wasEdit){renderMap();renderTransaction();}root.querySelectorAll('.fw-drop-target').forEach(el=>el.classList.remove('fw-drop-target'));if(immediate&&!destroyed)renderContext();if(reason)ctx.say(reason);refreshMotion();}
    function previewGesture(g,p){
      if(!g.stroke||g.stopped)return;
      const previous=g.stroke.ids.length;
      const geometryKey=`${camera.x}:${camera.y}:${camera.zoom}`;
      if(g.immediate&&g.geometryKey!==geometryKey){g.targets=targetsFor(g.tool);g.geometryKey=geometryKey;}
      extendStroke(g.stroke,p,g.immediate?g.targets:targetsFor(g.tool));
      if(g.immediate){
        // Commit all newly crossed cells in this input sample immediately. Core
        // validates each target; one durable write avoids N saves in a fast sweep.
        // Never defer economic work to pointerup or a future animation frame.
        const pending=g.stroke.ids.slice(previous);
        if(pending.length){
          const command=g.tool.action==='plant'?{type:'plant',entityIds:pending,itemId:g.tool.itemId}:{type:'harvest',entityIds:pending};
          const result=doAct(command,g.tool.action==='plant'?'已播种':'作物已入仓',true);
          const count=result?.ok?(result.delta?.events?.length||0):0;
          g.completed+=count;g.skipped+=pending.length-count;
          if(!result?.ok)g.stopped=true;
        }
        if(pending.length)render();
        note.textContent=`已完成 ${g.completed}${g.skipped?` · 跳过 ${g.skipped}`:''} · 松手结束，已完成的会保留`;
        note.hidden=false;cursor.hidden=false;const bounds=game.getBoundingClientRect();cursor.style.left=`${p.x-bounds.left-22}px`;cursor.style.top=`${p.y-bounds.top-64}px`;
        return;
      }
      root.querySelectorAll('[data-animal],[data-entity],[data-product]').forEach(el=>el.classList.toggle('marked',g.stroke.seen.has(el.dataset.animal||el.dataset.entity||el.dataset.product)));
      root.querySelectorAll('[data-queue-owner]').forEach(el=>el.classList.toggle('fw-drop-target',g.tool.action==='enqueue'&&el.dataset.queueOwner===g.tool.entityId));
      const temp={...g.stroke,active:true,ids:g.stroke.ids.slice()},command=finishStroke(temp),preview=command?commandPreview(ctx,command):null;
      const events=preview?.result?.delta?.events||[],skips=preview?.result?.skipped||[];
      note.textContent=`已划 ${g.stroke.ids.length} · 可执行 ${preview?.ok?(events.length||(!skips.length&&command?g.stroke.ids.length:0)):0}${skips.length?` · 跳过 ${skips.length}`:''}${preview&&!preview.ok?' · '+preview.message:''}`;
      note.hidden=false;cursor.hidden=false;cursor.style.left=`${p.x-game.getBoundingClientRect().left-22}px`;cursor.style.top=`${p.y-game.getBoundingClientRect().top-64}px`;
    }
    function toolFrom(el){return {action:el.dataset.tool,entityId:el.dataset.owner,itemId:el.dataset.item||undefined,recipeId:el.dataset.recipe||undefined};}
    function tapTool(tool){
      const e=entity(tool.entityId);if(!e){if(tool.action==='plant'){chosenSeed=tool.itemId;render();}return;}
      if(tool.action==='enqueue'){pendingRecipe=tool.recipeId;const r=config.RECIPES[tool.recipeId],missing=Object.keys(r.inputs).some(k=>(ctx.state.inventory[k]||0)<r.inputs[k]);if(missing){localPage='recipe';ctx.say('原料不足，点缺少的原料去获取');render();return;}doAct({type:'enqueue',entityId:e.id,recipeId:tool.recipeId},'配方已加入队列');render();return;}
      if(tool.action==='plant')chosenSeed=tool.itemId;
      lastFieldTap=null;ctx.say(tool.action==='plant'?'已选种子，拖过空田立即播种':tool.action==='harvest'&&['field','fruit'].includes(e.kind)?'拖过成熟目标立即收获':'按住工具拖向目标，抬手完成这一笔');render();
    }
    function startToolDrag(g,p){
      if(g.tool.action==='plant')chosenSeed=g.tool.itemId;
      g.immediate=g.tool.action==='plant'||(g.tool.action==='harvest'&&['field','fruit'].includes(entity(g.tool.entityId)?.kind));g.completed=0;g.skipped=0;g.unit=entity(g.tool.entityId)?.kind==='fruit'?'棵':'格';g.type='stroke';edgeStamp=0;win.cancelAnimationFrame?.(edgeRaf);edgeRaf=win.requestAnimationFrame?.(edgeFrame)||0;g.stroke=createStroke(g.tool,g.start);g.sourceRect=rectData(g.source.getBoundingClientRect());g.exited=false;
      cursor.innerHTML=toolArt(g.tool.action,g.tool.itemId,g.tool.entityId);
      // Ignore the tool tray itself. The stroke begins where the pointer leaves its source tray.
      const r=g.source.closest(g.tool.action==='enqueue'?'.fw-recipe-row':'.fw-object-panel,.fw-seed-mode').getBoundingClientRect();g.trayRect=rectData(r);
      if(!within(p,r)){
        let lo=0,hi=1;for(let i=0;i<20;i++){const t=(lo+hi)/2,q={x:g.start.x+(p.x-g.start.x)*t,y:g.start.y+(p.y-g.start.y)*t};if(within(q,r))lo=t;else hi=t;}
        g.stroke.last={x:g.start.x+(p.x-g.start.x)*hi,y:g.start.y+(p.y-g.start.y)*hi};g.exited=true;previewGesture(g,p);
      }
    }
    function gestureUI(g,p){
      const el=doc.elementFromPoint(p.x,p.y);
      const allowed=g.tool?.action==='enqueue'?el?.closest('.fw-machine-panel'):g.tool?.action==='collectMachine'?el?.closest('.fw-tray'):null;
      return actualUI(p,allowed&&selectedEntity()?.id===g.tool.entityId?allowed:null);
    }
    function startDirectDrag(g,p){
      g.type='stroke';g.tool=g.directTool;g.stroke=createStroke(g.tool,g.start);g.exited=true;
      if(g.tool.action!=='collectMachine'){selected=null;selectedAnimal=null;if(g.tool.action!=='plant')chosenSeed=null;renderContext();}
      cursor.innerHTML=toolArt(g.tool.action,g.tool.itemId,g.tool.entityId);
      edgeStamp=0;win.cancelAnimationFrame?.(edgeRaf);edgeRaf=win.requestAnimationFrame?.(edgeFrame)||0;
      previewGesture(g,p);
    }
    // Hit-testing is independent of the transparent sprite/button rectangle.
    // Ground targets use the inverse logical map; upright artwork uses its alpha mask.
    function hitWorld(p){
      const local=worldPoint(p),projected=project(local.x,local.y),rows=effectiveEntities().filter(e=>!e.stored&&!e.previewOnly),faded=fadedIds(rows);
      if(harvestView&&!draft&&!placement){const ripe=rows.find(e=>directCropHarvestCommand(e,ctx.state.now)&&pointInPolygon(projected,footprintPolygon(e,ctx.layout.getFootprint(e))));if(ripe)return {entityId:ripe.id};}
      const sprites=[];
      for(const e of rows){
        const f=ctx.layout.getFootprint(e),r=visualRect(e),meta=isConnectedFence(e)?null:resolveWorldArt(e,ctx.state.now);
        if(!faded.has(e.id)){
          const ground=pointInPolygon(projected,footprintPolygon(e,f));
          const {u,v}=plantHitPoint(e,p,(projected.x-r.left)/r.width,(projected.y-r.top)/r.height);
          const spec=e.kind==='shelter'&&resolveShelterSpec(e);
          if(spec){
            sprites.push(...shelterHitCandidates(e,f,projected));
          }else{
            const alpha=e.kind==='field'&&!e.crop?false:meta?runtimeArtHit(meta,u,v,{mirror:mirroredArt(e)}):fallbackArtHit(e,u,v);
            if(e.kind==='road'?ground:alpha||ground)sprites.push({entityId:e.id,z:alpha&&runtimeArtFrontHit(meta,u,v,{mirror:mirroredArt(e)})?depth(e,f)+1:entityPaintDepth(e)});
          }
        }
        if(e.kind==='shelter'&&!draft&&!faded.has(e.id))for(const el of world.querySelectorAll(`[data-shelter="${e.id}"]`)){
          const r=(el.querySelector('.fw-animal-art')||el).getBoundingClientRect(),a=e.animals.find(a=>a.id===el.dataset.animal),meta=animalAnimation.getArt(a.id,animalMeta(a,e)),u=(p.x-r.left)/r.width,v=(p.y-r.top)/r.height;
          const badge=el.querySelector('.fw-animal-state')?.getBoundingClientRect();if((badge&&within(p,badge))||(meta?runtimeArtHit(meta,u,v,{mirror:meta.shelterLayered&&mirroredArt(e)}):u>=.15&&u<=.85&&v>=.1&&v<=.95))sprites.push({entityId:e.id,animalId:a.id,z:Number(el.dataset.depth)});
        }
      }
      const top=topmostHit(sprites);if(top)return top;
      if(id==='P12'){const land=ctx.layout.LAND_PATCHES.find(e=>pointInPolygon(projected,footprintPolygon(e,e)));if(land)return {landId:land.id};}
      return {};
    }
    const fallbackMasks=new Map();
    function fallbackArtHit(e,u,v){
      if(u<0||v<0||u>1||v>1)return false;
      const terrain=terrainArt(e),src=resolveObstacleArt(e)?.src||(terrain&&e.kind!=='field'?terrain.src:ctx.asset(entityArt(e)));let mask=fallbackMasks.get(src);
      if(!mask){mask={pixels:null};fallbackMasks.set(src,mask);const img=new win.Image();img.onload=()=>{try{const canvas=doc.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,64,64);mask.pixels=c.getImageData(0,0,64,64).data;}catch{mask.failed=true;}};img.src=src;}
      return !!mask.pixels&&mask.pixels[(Math.min(63,Math.floor(v*64))*64+Math.min(63,Math.floor(u*64)))*4+3]>24;
    }
    function handleDown(event){
      if(event.button!==undefined&&event.button!==0)return;
      if(pointers.size>1)return;
      const target=event.target,toolEl=target.closest('[data-tool]'),jobEl=target.closest('[data-job]'),productEl=target.closest('[data-product]');
      if(toolEl){if(toolEl.disabled)return;cancelGesture();lastFieldTap=null;gesture={type:'tool-pending',id:event.pointerId,start:point(event),last:point(event),tool:toolFrom(toolEl),source:toolEl,time:Date.now()};event.preventDefault();game.setPointerCapture?.(event.pointerId);return;}
      if(jobEl){lastFieldTap=null;const e=selectedEntity(),j=e?.queue.find(j=>j.id===jobEl.dataset.job);gesture={type:'job-pending',id:event.pointerId,start:point(event),last:point(event),jobId:j?.id,entityId:e?.id,time:Date.now()};event.preventDefault();game.setPointerCapture?.(event.pointerId);return;}
      if(productEl&&!draft&&!placement){lastFieldTap=null;gesture={type:'product-pending',id:event.pointerId,start:point(event),jobId:productEl.dataset.product,entityId:productEl.dataset.machine,rect:rectData(productEl.getBoundingClientRect()),directTool:!draft&&!placement?{action:'collectMachine',entityId:productEl.dataset.machine,itemId:entity(productEl.dataset.machine)?.completed.find(j=>j.id===productEl.dataset.product)?.recipeId}:null,time:Date.now()};event.preventDefault();game.setPointerCapture?.(event.pointerId);return;}
      if(target.closest('button')&&!target.closest('.fw-world'))return;
      if(!target.closest('.fw-map'))return;
      const p=point(event),pen=target.closest('[data-pen]'),hit=pen?{entityId:pen.dataset.pen}:typeof hitWorld==='function'?hitWorld(p):null,animal=hit?(hit.animalId?{dataset:{animal:hit.animalId,shelter:hit.entityId}}:null):target.closest('[data-animal]'),ent=hit?(hit.entityId?{dataset:{entity:hit.entityId}}:null):target.closest('[data-entity]'),land=hit?(hit.landId?{dataset:{land:hit.landId}}:null):target.closest('[data-land]');
      if(placement){gesture={type:'place',id:event.pointerId,start:p};const w=worldPoint(p);placement.x=Math.floor(w.x-placement.w/2);placement.y=Math.floor(w.y-placement.h/2);render();}
      else if(draft&&!growthPreview&&(ent||animal)){
        selected=animal?.dataset.shelter||ent.dataset.entity;selectedAnimal=null;
        if(ctx.layout.isFixedEntity(entity(selected)))gesture={type:'fixed',id:event.pointerId,start:p,last:p,entityId:selected};
        else {const w=worldPoint(p),pos=draft.positions.find(x=>x.id===selected);gesture={type:'edit',id:event.pointerId,start:p,last:p,entityId:selected,offset:{x:w.x-pos.x,y:w.y-pos.y},original:clone(draft.positions)};}
        renderMap();renderTransaction();
      }
      else{gesture={type:'pan-pending',id:event.pointerId,start:p,last:p,camera:{...camera},entityId:animal?.dataset.shelter||ent?.dataset.entity,animalId:animal?.dataset.animal,landId:land?.dataset.land,directTool:directWorldTool(entity(animal?.dataset.shelter||ent?.dataset.entity),animal?.dataset.animal,chosenSeed,ctx.state,config,!!draft||!!placement),time:Date.now()};}
      event.preventDefault();game.setPointerCapture?.(event.pointerId);
    }
    function handleMove(event){
      const g=gesture;if(!g||event.pointerId!==g.id)return;const p=point(event);g.last=p;
      if(!within(p,game.getBoundingClientRect())){cancelGesture('已移出地图，这一笔未执行');return;}
      const distance=Math.hypot(p.x-g.start.x,p.y-g.start.y);
      if(g.type==='tool-pending'){if(distance>=8)startToolDrag(g,p);return;}
      if(g.type==='product-pending'&&g.directTool&&distance>=8){startDirectDrag(g,p);if(gestureUI(g,p))cancelGesture('已划入工具区域，这一笔未执行');return;}
      if(g.type==='stroke'){
        if(!g.exited){if(within(p,g.trayRect))return;g.exited=true;g.stroke.last={...p};}
        if(gestureUI(g,p)){cancelGesture('已划入工具区域，这一笔未执行');return;}
        previewGesture(g,p);return;
      }
      if(g.type==='fixed'||g.type==='product-pending')return;
      if(g.type==='job-pending'){if(distance>=8&&Date.now()-g.time>=350){g.type='job-drag';note.hidden=false;note.textContent='拖到另一等待槽，抬手调整顺序';}return;}
      if(g.type==='job-drag')return;
      if(actualUI(p)){cancelGesture('已进入操作区域，预览已取消');return;}
      if(g.type==='place'){const w=worldPoint(p);placement.x=Math.floor(w.x-placement.w/2);placement.y=Math.floor(w.y-placement.h/2);renderGhost();renderTransaction();return;}
      if(g.type==='edit'){const w=worldPoint(p);draft.positions=draft.positions.map(x=>x.id===g.entityId?{...x,x:Math.floor(w.x-g.offset.x),y:Math.floor(w.y-g.offset.y)}:x);renderMap();renderTransaction();return;}
      if(distance>=8){g.type='pan';lastFieldTap=null;}
      if(g.type==='pan'){focusAnchor=null;camera.x=g.camera.x+p.x-g.start.x;camera.y=g.camera.y+p.y-g.start.y;transform();}
    }
    function handleUp(event){
      const g=gesture;if(!g||event.pointerId!==g.id)return;
      const p=point(event),inside=within(p,game.getBoundingClientRect()),distance=Math.hypot(p.x-g.start.x,p.y-g.start.y);
      if(g.type==='tool-pending'&&distance>=8&&inside)startToolDrag(g,p);
      if(g.type==='product-pending'&&g.directTool&&distance>=8&&inside)startDirectDrag(g,p);
      // Consume before state/render callbacks. A finished gesture cannot clear a newer one.
      gesture=null;note.hidden=true;cursor.hidden=true;
      if(!inside){if(g.stroke)cancelStroke(g.stroke,'outside');if(g.type==='edit'&&draft)draft.positions=g.original;render();ctx.say(g.immediate?'已停止，已完成的操作已保留':'移出地图未执行');return;}
      if(g.type==='tool-pending'){
        if(distance<8&&within(p,g.source.getBoundingClientRect()))tapTool(g.tool);else ctx.say('未落在工具上，没有执行');
      }else if(g.type==='stroke'){
        if(!g.exited||gestureUI(g,p)){cancelStroke(g.stroke,'outside');ctx.say(g.immediate?'已停止，已完成的操作已保留':'已取消，资源没有变化');render();return;}
        previewGesture(g,p);note.hidden=true;cursor.hidden=true;
        if(g.immediate){finishStroke(g.stroke);if(g.tool.action==='plant')selected=null;render();ctx.say(`这一笔完成 ${g.completed} ${g.unit||'格'}${g.skipped?`，跳过 ${g.skipped} ${g.unit||'格'}`:''}`);return;}
        if(g.tool.action==='enqueue'&&!targetsFor(g.tool).some(t=>within(p,t))){cancelStroke(g.stroke,'invalid-drop');ctx.say('请把配方拖到这台机器或上方生产槽');render();return;}
        const cmd=finishStroke(g.stroke);try{if(cmd)doAct(cmd,'这一笔已完成',true);else ctx.say('没有划到可操作对象');if(g.tool.action==='plant')selected=null;}finally{render();}
      }else if(g.type==='product-pending'){
        if(distance<8&&within(p,g.rect))doAct({type:'collectMachine',entityId:g.entityId,jobIds:[g.jobId]},'成品已入仓');
      }else if(g.type==='job-pending'){
        if(distance<8){activeJob=g.jobId;localPage='job';render();}
      }else if(g.type==='job-drag'){
        const drop=doc.elementFromPoint(p.x,p.y)?.closest('[data-job]'),e=entity(g.entityId),target=e.queue.find(j=>j.id===drop?.dataset.job);
        if(target?.startAt===null){const ids=e.queue.filter(j=>j.startAt===null).map(j=>j.id),from=ids.indexOf(g.jobId),to=ids.indexOf(target.id);if(from>=0&&to>=0){ids.splice(from,1);ids.splice(to,0,g.jobId);doAct({type:'reorderQueue',entityId:e.id,jobIds:ids},'队列已排序');}}render();
      }else if(g.type==='fixed'){ctx.say('这个物件固定，不能移动。请拖动其他物件。');render();
      }else if(g.type==='edit'){
        const next=clone(draft.positions);draft.positions=g.original;if(!pushDraft(next))render();
      }else if(g.type==='pan'){if(typeof rememberCamera==='function')rememberCamera(true);
      }else if(g.type==='pan-pending'&&distance<8){
        if(g.landId){lastFieldTap=null;selected=g.landId;more=false;render();}
        else if(g.entityId){if(draft){selected=g.entityId;render();}else openObject(g.entityId,g.animalId);}
        else{lastFieldTap=null;selected=null;selectedAnimal=null;more=false;localPage=null;render();}
      }
    }
    function edgeFrame(time){
      const g=gesture;if(!g||g.type!=='stroke'||!g.exited||doc.hidden){edgeRaf=0;return;}
      const p=g.last,r=game.getBoundingClientRect(),dx=p.x<r.left+24?1:p.x>r.right-24?-1:0,dy=p.y<r.top+24?1:p.y>r.bottom-24?-1:0;
      if((dx||dy)&&!gestureUI(g,p)){if(!g.edgeSince)g.edgeSince=time;if(time-g.edgeSince>=250&&edgeStamp){const dt=Math.min(50,time-edgeStamp)/1000;camera.x+=dx*180*dt;camera.y+=dy*180*dt;transform();previewGesture(g,p);}}else g.edgeSince=0;
      edgeStamp=time;edgeRaf=win.requestAnimationFrame(edgeFrame);
    }
    on(doc,'pointerdown',e=>{
      if(root.closest('[inert]'))return;
      pointers.set(e.pointerId,point(e));if(pointers.size>1){cancelGesture('第二根手指已取消未提交动作');const pts=[...pointers.values()];if(pts.length===2&&pts.every(p=>within(p,game.getBoundingClientRect())&&!actualUI(p))){const middle={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};focusAnchor=null;pinch={distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y),zoom:camera.zoom,ground:worldPoint(middle)};}}
    },true);
    on(doc,'pointermove',e=>{
      if(root.closest('[inert]')||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,point(e));if(!pinch||pointers.size!==2)return;const pts=[...pointers.values()],r=view.getBoundingClientRect(),middle={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
      if(pinch.distance<1)return;e.preventDefault();camera.zoom=Math.max(.75,Math.min(1.75,pinch.zoom*Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)/pinch.distance));camera.x=middle.x-r.left-project(pinch.ground.x,pinch.ground.y).x*camera.zoom;camera.y=middle.y-r.top-project(pinch.ground.x,pinch.ground.y).y*camera.zoom;transform();
    },{capture:true,passive:false});
    on(doc,'pointerup',e=>{const finishedPinch=!!pinch;pointers.delete(e.pointerId);if(pointers.size<2){pinch=null;if(finishedPinch)rememberCamera(true);}},true);
    on(doc,'pointercancel',e=>{pointers.delete(e.pointerId);cancelGesture('触控中断，未执行');},true);
    on(game,'pointerdown',e=>{handleDown(e);refreshMotion();});on(game,'pointermove',handleMove);on(game,'pointerup',e=>{handleUp(e);refreshMotion();});
    on(game,'lostpointercapture',e=>{if(gesture?.id===e.pointerId)cancelGesture('触控离开，未执行');});
    on(win,'blur',()=>{const pending=resizeHasPendingAction(gesture);pointers.clear();cancelGesture(pending?'窗口失焦，未提交动作已取消':undefined);});
    on(doc,'visibilitychange',()=>{game.dataset.paused=String(doc.hidden);if(doc.hidden){pointers.clear();cancelGesture();}});
    on(win,'resize',()=>{const pending=resizeHasPendingAction(gesture);cancelGesture(pending?'屏幕变化，未提交动作已取消':undefined);scheduleReframe();});
    on(root,'click',e=>{
      const actionEl=e.target.closest('[data-action]');if(actionEl){action(actionEl.dataset.action,actionEl);return;}
      const buy=e.target.closest('[data-buy]');if(buy){startPlacement(buy.dataset.category,buy.dataset.buy);return;}
      if(e.detail!==0)return;
      const t=e.target.closest('[data-tool]');if(t){tapTool(toolFrom(t));return;}
      const p=e.target.closest('[data-product]');if(p){doAct({type:'collectMachine',entityId:p.dataset.machine,jobIds:[p.dataset.product]},'成品已入仓');return;}
      const pen=e.target.closest('[data-pen]'),animal=e.target.closest('[data-animal]'),ent=e.target.closest('[data-entity]'),land=e.target.closest('[data-land]'),job=e.target.closest('[data-job]');
      if(pen)openObject(pen.dataset.pen);else if(animal)openObject(animal.dataset.shelter,animal.dataset.animal);else if(ent)openObject(ent.dataset.entity);else if(land){selected=land.dataset.land;render();}else if(job){activeJob=job.dataset.job;localPage='job';render();}
    });
    on(world,'focusin',event=>{
      const target=event.target.closest('[data-entity],[data-animal],[data-pen]');if(!target||gesture||draft||placement)return;
      const r=target.getBoundingClientRect(),v=view.getBoundingClientRect();
      if(r.left<v.left||r.right>v.right||r.top<v.top||r.bottom>v.bottom){const e=entity(target.dataset.entity||target.dataset.shelter||target.dataset.pen);if(e)focus(e,camera.zoom);}
    });
    on(view,'wheel',e=>{e.preventDefault();cancelGesture();focusAnchor=null;const p=point(e),before=worldPoint(p),r=view.getBoundingClientRect();camera.zoom=Math.max(.75,Math.min(1.75,camera.zoom+(e.deltaY>0?-.1:.1)));camera.x=p.x-r.left-project(before.x,before.y).x*camera.zoom;camera.y=p.y-r.top-project(before.x,before.y).y*camera.zoom;transform();rememberCamera();},{passive:false});
    on(root,'keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();if(gesture){cancelGesture('已取消');render();}else if(localPage){localPage=null;render();}else if(draft)cancelEdit();else if(placement){placement=null;ctx.openScene('P07');}else if(selected||more||chosenSeed||harvestView||clearPreview)closeTemporary();else ctx.navigateBack?.();return;}
      if(e.target.closest('input,select,textarea'))return;
      const vector={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!vector)return;
      e.preventDefault();cancelGesture();if(draft&&selected){const p=draft.positions.find(p=>p.id===selected);if(p)changeDraft(selected,{x:p.x+vector[0],y:p.y+vector[1]});}else if(placement){placement.x+=vector[0];placement.y+=vector[1];render();}else{focusAnchor=null;camera.x-=vector[0]*48;camera.y-=vector[1]*48;transform();rememberCamera();}
    });
    const stopFacilityRoute=ctx.registerFacilityRoute?.(entityId=>openObject(entityId));
    const unsubscribe=ctx.subscribe(()=>{if(!gesture&&!presentationDepth)render();});
    const itemId=ctx.focusItem,recipe=ctx.focusRecipe?config.RECIPES[ctx.focusRecipe]:config.RECIPES[itemId];
    const animal=Object.values(config.ANIMALS).find(a=>a.product===itemId);
    const candidates=ctx.state.entities.filter(e=>!e.stored);
    const e=entity(ctx.focusEntity)||candidates.find(e=>config.CROPS[itemId]?e.kind==='field'&&e.crop?.itemId===itemId&&e.crop.readyAt<=ctx.state.now:false)||candidates.find(e=>config.CROPS[itemId]?e.kind==='field'&&e.crop?.itemId===itemId:config.FRUITS[itemId]?e.kind==='fruit'&&e.configId===itemId:animal?e.kind==='shelter'&&e.configId===animal.id:recipe?e.kind==='machine'&&e.machineType===recipe.machineType:false)||candidates.find(e=>config.CROPS[itemId]&&e.kind==='field'&&!e.crop);
    selected=e?.id||null;
    if(config.CROPS[itemId])seedPage=Math.max(0,Math.floor(Object.values(config.CROPS).filter(c=>c.level<=ctx.state.level).findIndex(c=>c.id===itemId)/4));
    if(recipe&&e)recipePage=Math.max(0,Math.floor(Object.values(config.RECIPES).filter(r=>r.machineType===e.machineType&&r.level<=ctx.state.level).findIndex(r=>r.id===recipe.id)/3));
    if(e)focus(e,e.kind==='machine'?1.6:1.2);else if(id==='P01'&&ctx.state.camera){const saved=ctx.state.camera;viewSize=viewportSize();camera={zoom:saved.zoom,x:viewSize.w/2-project(saved.centerX,saved.centerY).x*saved.zoom,y:viewSize.h/2-project(saved.centerX,saved.centerY).y*saved.zoom};cameraReady=viewSize.w>0&&viewSize.h>0;}else defaultFocus();
    if(itemId&&!e)ctx.say('还没有对应设施，请先购买或解锁');
    if(ctx.initialPlacement)startPlacement(ctx.initialPlacement.category,ctx.initialPlacement.itemId);
    render();
    const resizeObserver=typeof win.ResizeObserver==='function'?new win.ResizeObserver(scheduleReframe):null;resizeObserver?.observe(view);
    function rememberCamera(immediate=false){win.clearTimeout(cameraSaveTimer);cameraSaveTimer=0;if(immediate)saveCamera();else cameraSaveTimer=win.setTimeout(()=>{cameraSaveTimer=0;if(!destroyed)saveCamera();},160);}
    on(win,'pagehide',()=>{win.clearTimeout(cameraSaveTimer);saveCamera();});
    function saveCamera(){if(cameraReady&&!root.closest('[inert]')){const p=unproject((view.clientWidth/2-camera.x)/camera.zoom,(view.clientHeight/2-camera.y)/camera.zoom);const next={centerX:Math.max(0,Math.min(63.999,p.x)),centerY:Math.max(0,Math.min(63.999,p.y)),zoom:camera.zoom},saved=ctx.state.camera;if(!saved||Object.keys(next).some(k=>Math.abs(next[k]-saved[k])>1e-7))ctx.saveCamera?.(next);}}
    const stopConfirmResume=ctx.onConfirmClosed?.(()=>{if(!destroyed)coopPanel?.resume?.();});
    const stopDeactivate=ctx.onDeactivate?.((reason)=>{win.clearTimeout(cameraSaveTimer);cameraSaveTimer=0;if(reason==='confirm'&&coopPanel?.suspend)coopPanel.suspend();else {coopPanel?.destroy();coopPanel=null;}cancelGesture();pointers.clear();persistLayoutDraft();saveCamera();});
    function cleanup(){if(destroyed)return;destroyed=true;coopPanel?.destroy();coopPanel=null;animalAnimation.destroy();machineAnimation.destroy();win.clearTimeout(forestRetreatTimer);win.clearTimeout(cameraSaveTimer);saveCamera();stopDeactivate?.();stopConfirmResume?.();stopFacilityRoute?.();cancelGesture();persistLayoutDraft();win.cancelAnimationFrame?.(edgeRaf);win.cancelAnimationFrame?.(resizeRaf);win.cancelAnimationFrame?.(motionRaf);listeners.splice(0).forEach(off=>off());unsubscribe?.();resizeObserver?.disconnect();root.classList.remove('fw-root');if(ownsDocument)doc.documentElement?.classList.remove('fw-document');}
    ctx.onExit?.(cleanup);
    if(!ctx.initialPlacement&&e&&(['P04','P05'].includes(id))&&(e.kind==='shelter'||e.kind==='machine'&&e.built))openObject(e.id);
    return cleanup;
  }

export {segmentHits,createStroke,extendStroke,cancelStroke,finishStroke,obstacleTargets,commandPreview,layoutThumbnail,worldScenePresentation,machineTrayPlacement,projectedMachineTray,directCropHarvestCommand,cropDoubleTapCommand,directWorldTool,resizeHasPendingAction,resizeWorldCamera};
