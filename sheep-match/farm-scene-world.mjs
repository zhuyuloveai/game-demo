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
      let lo=0,hi=1;
      for (const [p,q] of [[-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.top],[dy,r.bottom-a.y]]) {
        if (!p) { if(q<0)return null; continue; }
        const t=q/p; if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t); if(lo>hi)return null;
      }
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
  function directCropHarvestCommand(e,now,editing=false){
    return !editing&&e?.kind==='field'&&e.crop&&e.crop.readyAt<=now?{type:'harvest',entityIds:[e.id]}:null;
  }
  function directWorldTool(e,animalId,seed,state,config,editing=false) {
    if(editing||!e)return null;
    if(e.kind==='field') {
      if(e.crop?.readyAt<=state.now)return {action:'harvest',entityId:e.id};
      if(!e.crop&&seed&&config.CROPS[seed]?.level<=state.level&&(state.inventory[seed]||0)>0)return {action:'plant',entityId:e.id,itemId:seed};
    }
    if(e.kind==='fruit'&&e.status==='ready')return {action:'harvest',entityId:e.id,itemId:e.configId};
    if(e.kind==='shelter'&&animalId) {
      const a=e.animals.find(a=>a.id===animalId),c=config.ANIMALS[e.configId];
      if(a?.status==='ready')return {action:'collectAnimal',entityId:e.id,itemId:c.product};
      if(a?.status==='hungry'&&(state.inventory[c.feedItem]||0)>0)return {action:'feed',entityId:e.id,itemId:c.feedItem};
    }
    return null;
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
export function mountWorldScene(ctx) {
    const id=ctx.id||'P01';
    const root=ctx.root,doc=ctx.doc||root.ownerDocument,win=ctx.win||doc.defaultView;
    const esc=ctx.esc||((s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
    const config=ctx.config;let destroyed=false,selected=null,selectedAnimal=null,more=false,localPage=null,seedPage=0,recipePage=0;
    let camera={x:0,y:0,zoom:1},cameraReady=false,viewSize={w:0,h:0},focusAnchor=null,resizeRaf=0,gesture=null,pointers=new Map(),pinch=null,edgeRaf=0,edgeStamp=0,draft=null,undo=[],redo=[],placement=null,clearPreview=null,activeJob=null;
    let preserveStoredDraft=false,pendingRecipe=null,chosenSeed=null,lastCollectedAnimal=null,longPressTimer=0;
    const listeners=[];
    root.classList.add('fw-root');
    const ownsDocument=root.parentElement===doc.body;
    if(ownsDocument)doc.documentElement?.classList.add('fw-document');
    root.innerHTML=`<section class="fw-game" aria-label="${esc(CHAPTERS[id])}"><div class="fw-map" tabindex="0" aria-label="农场地图。空白拖图；从成熟作物、果实、动物或成品上划过连续操作；空田选种后划种；长按物件布置"><div class="fw-world"></div></div><div class="fw-corners"></div><div class="fw-context"></div><div class="fw-local"></div><div class="fw-transaction"></div><div class="fw-stroke-note" role="status" aria-live="polite" hidden></div><div class="fw-cursor" aria-hidden="true" hidden></div></section>`;
    const game=root.querySelector('.fw-game'),view=root.querySelector('.fw-map'),world=root.querySelector('.fw-world'),corners=root.querySelector('.fw-corners'),context=root.querySelector('.fw-context'),local=root.querySelector('.fw-local'),transaction=root.querySelector('.fw-transaction'),note=root.querySelector('.fw-stroke-note'),cursor=root.querySelector('.fw-cursor');
    world.style.backgroundImage=`url("${ctx.asset('terrain/grass-0.svg')}")`;
    function on(el,event,fn,options){el.addEventListener(event,fn,options);listeners.push(()=>el.removeEventListener(event,fn,options));}
    function vouchersEnabled(){return ctx.state.features?.constructionVouchersEnabled!==false;}
    function entity(id){return ctx.state.entities.find(e=>e.id===id);}
    function selectedEntity(){return entity(selected);}
    function image(path,alt='',cls=''){return `<img class="${esc(cls)}" src="${ctx.asset(path)}" alt="${esc(alt)}" draggable="false">`;}
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
    function art(e,cls=''){const path=entityArt(e);if(e.kind==='field'&&e.crop)return image('terrain/field-empty.svg','',cls+' fw-field-soil')+image(path,title(e),cls+' fw-crop-overlay');return path?image(path,title(e),cls):`<img class="${cls}" src="${ctx.art?ctx.art(e.configId):ctx.asset('ui/info.svg')}" alt="${esc(title(e))}" draggable="false">`;}
    function animalArt(a){return image(`animals/${a.configId}/front/${a.status==='producing'?'producing':a.status==='ready'?'ready':'idle'}_00.svg`,name(a.configId),'fw-animal-art');}
    function effectiveEntities(){return ctx.state.entities.map(e=>draft?{...e,...draft.positions.find(p=>p.id===e.id)}:e);}
    function rectStyle(e){const f=ctx.layout.getFootprint(e);return `left:${e.x*TILE}px;top:${e.y*TILE}px;width:${f.w*TILE}px;height:${f.h*TILE}px;z-index:${Math.round((e.y+f.h)*10)}`;}
    function stateBadge(e){
      if(e.kind==='field')return e.crop?(e.crop.readyAt<=ctx.state.now?'✓':remaining(e.crop.readyAt)):'';
      if(e.kind==='fruit')return ({ready:'果熟了',revive:'待复苏',withered:'待清理'})[e.status]||remaining(e.readyAt);
      if(e.kind==='machine')return !e.built?(e.buildReadyAt<=ctx.state.now?'可揭幕':`施工 ${remaining(e.buildReadyAt)}`):e.completed.length?`${e.completed.length}份待收`:e.queue.length?remaining(e.queue[0].readyAt):'';
      if(e.kind==='barn'||e.kind==='silo')return `${ctx.core.storageUsed(ctx.state,e.kind)}/${ctx.state.storage[e.kind].capacity}`;
      return '';
    }
    function renderMap(){
      const focused=doc.activeElement?.dataset?.entity;
      const entities=effectiveEntities().filter(e=>!e.stored),layoutCheck=draft?draftCheck():null;
      world.classList.toggle('fw-layout-world',!!draft);
      let html=`<div class="fw-owned" style="left:768px;top:768px;width:1536px;height:1536px"></div>`;
      if(id==='P12')for(const p of ctx.layout.LAND_PATCHES){const open=ctx.state.openedLand.includes(p.id),check=ctx.layout.canExpandLand(ctx.state,p.id);html+=`<button class="fw-land ${open?'opened':check.ok?'available':'locked'} ${selected===p.id?'selected':''}" data-land="${p.id}" style="left:${p.x*TILE}px;top:${p.y*TILE}px;width:${p.w*TILE}px;height:${p.h*TILE}px" aria-label="${p.id} ${open?'已开放':check.ok?'可以开垦':'暂不能开垦'}">${open?'已开垦':check.ok?'点选这块土地':'未开放'}</button>`;}
      for(const e of entities){
        const presentation=worldScenePresentation(id,selectedEntity(),e),badge=presentation.showBadge?stateBadge(e):'',marked=gesture?.stroke?.seen.has(e.id)||clearPreview?.ids.includes(e.id);
        html+=`<button class="fw-entity fw-${e.kind} ${selected===e.id?'selected':''} ${marked?'marked':''} ${draft?'editing':''} ${draft&&ctx.layout.isFixedEntity(e)?'fw-layout-fixed':''} ${draft&&selected===e.id&&!layoutCheck.ok?'fw-invalid-position':''} ${presentation.focused?'fw-focused-entity':''} ${presentation.muted?'fw-muted-neighbor':''}" data-entity="${e.id}" style="${rectStyle(e)}${presentation.focused?';z-index:800':''}" aria-label="${esc(title(e))}${draft?ctx.layout.isFixedEntity(e)?'，固定建筑，不能移动':'，拖动布置，完成后保存':badge?'，'+esc(badge):''}">${art(e,'fw-entity-art')}${draft&&selected===e.id?`<span class="fw-drag-handle" aria-hidden="true">${ctx.layout.isFixedEntity(e)?'固定':'✥ 拖动'}</span>`:''}${badge?`<span class="fw-badge">${esc(badge)}</span>`:''}${e.kind==='machine'&&!e.built?image('terrain/construction-scaffold.svg','','fw-scaffold'):''}</button>`;
        if(e.kind==='shelter'){
          const f=ctx.layout.getFootprint(e),cols=3,space=f.w*TILE/cols;
          (e.animals||[]).forEach((a,i)=>{const ax=e.x*TILE+(i%cols)*space,ay=e.y*TILE+f.h*TILE*.48+Math.floor(i/cols)*space*.75;html+=`<button class="fw-animal ${presentation.muted?'fw-muted-neighbor':''} ${selectedAnimal===a.id?'selected':''} ${gesture?.stroke?.seen.has(a.id)?'marked':''}" data-animal="${a.id}" data-shelter="${e.id}" style="left:${ax}px;top:${ay}px;width:${space}px;height:${space*.9}px;z-index:${Math.round((e.y+f.h)*10)+2}" aria-label="${esc(name(a.configId))}，${a.status==='hungry'?'饿了':a.status==='ready'?'产物待收':remaining(a.readyAt)}">${animalArt(a)}<span class="fw-animal-state ${a.status==='ready'?'fw-ready-output':''}">${a.status==='ready'?item(config.ANIMALS[a.configId].product):a.status==='hungry'?item(config.ANIMALS[a.configId].feedItem):'◷'}</span></button>`;});
        }
        if(e.kind==='machine'&&e.completed.length&&presentation.showProducts){const tray=machineTrayPlacement(e,ctx.layout.getFootprint(e));html+=`<div class="fw-products" style="left:${tray.x}px;top:${tray.y}px;width:${tray.width}px;height:${tray.height}px;z-index:${presentation.focused?801:Math.round((e.y+ctx.layout.getFootprint(e).h)*10)+3}">${e.completed.slice(0,tray.slots).map(j=>`<button data-product="${j.id}" data-machine="${e.id}" aria-label="领取${esc(name(j.recipeId))}">${item(j.recipeId)}</button>`).join('')}</div>`;}
      }
      world.innerHTML=html;
      if(focused){world.querySelector(`[data-entity="${focused}"]`)?.focus({preventScroll:true});}
      renderGhost();transform();
    }
    function transform(){world.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;}
    function worldPoint(p){const r=world.getBoundingClientRect();return {x:(p.x-r.left)/camera.zoom/TILE,y:(p.y-r.top)/camera.zoom/TILE};}
    function viewportSize(){return {w:view.clientWidth,h:view.clientHeight};}
    function focus(e,zoom){if(!e)return;const f=ctx.layout.getFootprint(e),size=viewportSize();if(!(size.w>0&&size.h>0))return;camera.zoom=zoom||camera.zoom;camera.x=size.w/2-(e.x+f.w/2)*TILE*camera.zoom;camera.y=size.h*(id==='P05'&&e.kind==='machine'?.34:.43)-(e.y+f.h/2)*TILE*camera.zoom;viewSize=size;focusAnchor=id==='P05'&&e.kind==='machine'?{id:e.id,rx:.5,ry:.34}:null;cameraReady=true;transform();}
    function reframeViewport(){
      resizeRaf=0;if(destroyed)return;const next=viewportSize();if(!(next.w>0&&next.h>0))return;
      if(!cameraReady){defaultFocus();return;}
      const target=focusAnchor&&selected===focusAnchor.id?entity(focusAnchor.id):null,f=target?ctx.layout.getFootprint(target):null;
      const anchor=target?{x:(target.x+f.w/2)*TILE,y:(target.y+f.h/2)*TILE,rx:focusAnchor.rx,ry:focusAnchor.ry}:null;
      camera=resizeWorldCamera(camera,viewSize,next,anchor);viewSize=next;transform();
    }
    function scheduleReframe(){if(!resizeRaf)resizeRaf=win.requestAnimationFrame(reframeViewport);}

    function defaultFocus(){const all=ctx.state.entities;const target=id==='P03'?all.find(e=>e.kind==='fruit'):id==='P04'?all.find(e=>e.kind==='shelter'&&e.configId==='chicken'):id==='P05'?all.find(e=>e.kind==='machine'&&e.configId==='bakery'):id==='P12'?ctx.layout.LAND_PATCHES.find(p=>ctx.layout.canExpandLand(ctx.state,p.id).ok):id==='P16'?all.find(e=>!ctx.layout.isFixedEntity(e)&&!e.stored):all.find(e=>e.kind==='field');focus(target||all.find(e=>e.kind==='field')||all[0],id==='P04'?1.5:id==='P05'?1.6:id==='P03'?1.4:id==='P12'?.75:1);}
    function renderCorners(){corners.innerHTML=`<div class="fw-corner fw-tl"><div class="fw-top-actions">${button('exit-farm','回首页','<span aria-hidden="true">⌂</span>','class="fw-home-button" aria-label="返回小院首页"')}${button('chapter:P13',`${ctx.state.level}级`,'<span>★</span>','aria-label="等级与任务"')}</div><small>${ctx.state.xp} XP</small></div><div class="fw-corner fw-tr">${button('shop',String(ctx.state.coins),'<span>●</span>','aria-label="金币与商店"')}${button('chapter:P07',vouchersEnabled()?`${ctx.state.vouchers}券`:'建设券功能关闭','',vouchersEnabled()?'aria-label="建设券"':'disabled aria-label="建设券功能关闭"')}</div><div class="fw-corner fw-bl">${button('shop','商店',image('ui/shop.svg','','fw-icon'))}</div><div class="fw-corner fw-br">${button('more','更多','<span>•••</span>',`aria-expanded="${more}"`)}</div>${more?`<nav class="fw-more" aria-label="农场更多入口">${[['chapter:P08','粮仓 / 货仓'],['chapter:P11','订单板'],['chapter:P09','乡间集市'],['chapter:P13','任务册'],['chapter:P14','牧场故事'],['chapter:P12','开垦土地'],['chapter:P19','外观与收纳'],['edit','布置农场'],['chapter:P17','设置与帮助'],['home-camera','回到农场中心'],['zoom-in','放大地图'],['zoom-out','缩小地图']].map(([a,n])=>button(a,n)).join('')}<button type="button" data-display-open aria-haspopup="dialog">屏幕与方向</button>${button('more','收起')}</nav>`:''}`;}
    function tool(action,label,itemId,entityId,recipeId){return `<button class="fw-tool" ${action==='feed'&&!(ctx.state.inventory[itemId]>0)?'disabled':''} data-tool="${action}" data-owner="${entityId||''}" data-item="${itemId||''}" data-recipe="${recipeId||''}" aria-label="${esc(label)}，拖向目标；点击可操作所选对象">${itemId?item(itemId):image('ui/harvest.svg')}<span>${esc(label)}</span>${action==='enqueue'?`<small class="fw-recipe-cost">${Object.entries(config.RECIPES[recipeId].inputs).map(([key,n])=>`${esc(name(key))}×${n}${(ctx.state.inventory[key]||0)<n?'（缺）':''}`).join(' · ')}</small>`:''}</button>`;}
    function renderContext(){
      if(chosenSeed&&!selected&&!gesture&&!draft&&!placement&&!more&&!localPage){context.innerHTML=`<div class="fw-seed-mode">${tool('plant',name(chosenSeed),chosenSeed,'__seedmode')}<span>${esc(name(chosenSeed))} · 余 ${ctx.state.inventory[chosenSeed]||0}份<br>从空田起手划过，或拖种子连续播种</span>${button('stop-seeding','结束播种')}</div>`;return;}
      if(gesture||draft||placement||more||localPage){context.innerHTML='';return;}
      const e=selectedEntity();if(!e){context.innerHTML='';return;}
      let body='',sub='';
      if(e.kind==='field'){
        if(!e.crop){const crops=Object.values(config.CROPS).filter(c=>c.level<=ctx.state.level),group=crops.slice(seedPage*4,seedPage*4+4);body=group.map(c=>tool('plant',`${c.name} ${ctx.state.inventory[c.id]||0}`,c.id,e.id)).join('')+button('seeds-next','更多种子');sub='点种子选定并播下这一格；接着从空田起手划过其他空田，连续播种。也可直接拖种子划种。';}
        else if(e.crop.readyAt<=ctx.state.now){context.innerHTML='';return;}
        else{sub=`${name(e.crop.itemId)}还需 ${remaining(e.crop.readyAt)}`;body=image(entityArt(e),'正在生长','fw-growing');}
      }else if(e.kind==='fruit'){
        const c=config.FRUITS[e.configId];sub=e.status==='ready'?`这次 ${c.sequence[e.harvestStage]}个 · 第${e.harvestStage+1}次果实`:e.status==='growing'?`再等 ${remaining(e.readyAt)}`:e.status==='revive'?`园丁免费次数：${Math.max(0,3-(ctx.state.npc.freeRevives||0))}`:'已完成最后一轮结果';
        body=e.status==='ready'?'<span>点树冠采果，按住划过其他成熟果树连续采摘</span>':e.status==='revive'?button('revive','请园丁复苏',item(e.configId))+button('revive-voucher',vouchersEnabled()?'使用 1 建设券':'建设券功能关闭','',vouchersEnabled()?'':'disabled'):e.status==='withered'?button('clear-tree',`清理 · ${name(c.clearTool)}×1`,item(c.clearTool)):image(entityArt(e),'生长中','fw-growing');
      }else if(e.kind==='shelter'){
        const c=config.ANIMALS[e.configId],a=e.animals.find(a=>a.id===selectedAnimal);sub=`${e.animals.length}/${c.capacity}只 · 饲料 ${ctx.state.inventory[c.feedItem]||0}${a?' · '+(a.status==='producing'?remaining(a.readyAt):a.status==='ready'?'这一只待收':'这一只饿了'):''}`;
        body=(e.animals.some(a=>a.status==='hungry')?tool('feed','连续喂养',c.feedItem,e.id):'')+(e.animals.some(a=>a.status==='ready')?tool('collectAnimal','连续收取',c.product,e.id):'')+button('adopt','领养',item(c.product),e.animals.length>=c.capacity?'disabled':'');if(e.animals.length)body+=button('move-animal-panel','迁移伙伴');sub+=' · 从饲料或产物上划过，可连续喂养或收取；同一笔不会自动改做另一种操作';if(!(ctx.state.inventory[c.feedItem]>0)&&e.animals.some(a=>a.status==='hungry'))body+=button('source:'+c.feedItem,'去制作饲料');
      }else if(e.kind==='machine'){body=machineBoard(e);sub='点配方或拖到上方生产槽排产；划过完成品连续收取。等待中的任务长按拖动排序。';}
      else if(e.kind==='obstacle'){const t=e.configId==='natural_tree'?'saw':e.configId==='natural_bush'?'axe':'shovel';body=button(`obstacle:${t}`,`${name(t)} ×1`,item(t));if(e.configId==='rock')body+=button('obstacle:dynamite','炸药 ×1',item('dynamite'))+button('obstacle:tnt','TNT ×1',item('tnt'));sub='选工具先看实际清理目标，确认前不消耗。';}
      else if(e.kind==='barn'||e.kind==='silo'){body=button('chapter:P08','打开仓库',art(e))+button(`upgrade-storage:${e.kind}`,'查看扩容');sub=`${ctx.core.storageUsed(ctx.state,e.kind)} / ${ctx.state.storage[e.kind].capacity}`;}
      else if(ctx.layout.isFixedEntity(e)){body=button('edit','布置其他物件');sub='小屋是固定建筑，不能移动或旋转。田地、仓库和工坊可自由布置。';}
      if(!ctx.layout.isFixedEntity(e))body+=button('edit',`移动${title(e)}`,'','class="fw-move-object"');
      context.innerHTML=`<div class="fw-object-panel ${e.kind==='machine'?'fw-machine-panel':''}"><header><strong>${esc(title(e))}</strong>${button('close-tool','×','','aria-label="收起对象工具"')}</header><div class="fw-tool-row">${body}</div><p>${esc(sub)}</p></div>`;
    }
    function machineBoard(e){
      if(!e.built)return `<div class="fw-build-state">${image('terrain/construction-scaffold.svg')}${e.buildReadyAt<=ctx.state.now?button('complete-building','揭幕 · 领取建成经验'):`<span>施工中 · ${remaining(e.buildReadyAt)}</span>`}</div>`;
      const recipes=Object.values(config.RECIPES).filter(r=>r.machineType===e.machineType&&r.level<=ctx.state.level),show=recipes.slice(recipePage*3,recipePage*3+3);
      const slots=Array.from({length:e.slots},(_,i)=>{const j=e.queue[i];return j?`<button class="fw-job ${j.startAt!==null?'running':'waiting'}" data-job="${j.id}" aria-label="${esc(name(j.recipeId))}，${j.startAt!==null?'制作中':'等待；可拖动排序'}">${item(j.recipeId)}<small>${j.startAt!==null?remaining(j.readyAt):`等待 ${i}`}</small></button>`:`<div class="fw-job empty" aria-label="空生产槽">＋</div>`;}).join('');
      return `<div class="fw-production"><div class="fw-tray" aria-label="完成品托盘">${e.completed.length?e.completed.map(j=>`<button data-product="${j.id}" data-machine="${e.id}" aria-label="领取${esc(name(j.recipeId))}">${item(j.recipeId)}<small>领取</small></button>`).join(''):'<span>完成品会摆在这里</span>'}</div><div class="fw-queue" data-queue-owner="${e.id}" aria-label="运行与等待槽，拖配方到这里排产">${slots}${button('upgrade-machine',vouchersEnabled()?(e.slots>=9?'槽位已满':'扩槽'):'扩槽功能关闭','',vouchersEnabled()&&e.slots<9?'':'disabled')}</div><div class="fw-recipe-row">${show.map(r=>`<div class="fw-recipe-choice">${tool('enqueue',`${r.name} · ${Math.ceil(r.durationMs/60000)}分`,r.id,e.id,r.id)}${button('recipe-detail:'+r.id,'详情','','aria-label="查看'+esc(r.name)+'原料详情"')}</div>`).join('')}${recipes.length>3?button('recipes-next','更多配方'):''}</div></div>`;
    }
    function doAct(command,success='已完成') {
      const result=ctx.act(command);
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
      const changes=Object.entries(result.delta?.items||{}).filter(([,q])=>q).map(([key,q])=>`${name(key)} ${q>0?'+':''}${q}`);
      ctx.say(`${success}${result.delta?.coins?' · 金币 '+(result.delta.coins>0?'+':'')+result.delta.coins:''}${changes.length?' · '+changes.join('，'):''}${skipped.length?` · 跳过 ${skipped.length} 个`:''}`);return result;
    }
    function ask(command,title,body,success){ctx.confirm({title,body,onConfirm:()=>doAct(command,success||'已完成')});}
    function renderLocal(){
      if(!localPage){local.innerHTML='';return;}
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
        body=!e||!targets.length?'<p>还没有有空位的同类栏舍。可先在商店建造同类栏舍。</p>':`<p>选择伙伴和目标栏舍。迁移不收费、不喂养，也不重置生产或待收产物。</p>${e.animals.map((a,i)=>`<section class="fw-animal-transfer">${animalArt(a)}<strong>${esc(name(a.configId))} ${i+1} · ${a.status==='ready'?'产物待收':a.status==='hungry'?'饿了':remaining(a.readyAt)}</strong><div>${targets.map(t=>button('move-animal:'+a.id+':'+t.id,`迁入 (${t.x},${t.y}) · ${t.animals.length}/${config.ANIMALS[t.configId].capacity}`)).join('')}</div></section>`).join('')}`;
      }else if(localPage==='layouts'){
        heading='两张布局方案';body=`<div class="fw-layout-slots">${[0,1].map(slot=>{const positions=ctx.state.layoutSlots[slot];return `<section><strong>方案 ${slot+1}</strong>${renderLayoutThumbnail(positions,slot)}${button(`save-slot:${slot}`,'记录草稿')}${button(`load-slot:${slot}`,'放入草稿','',positions?'':'disabled')}</section>`;}).join('')}</div>`;
      }
      local.innerHTML=`<section class="fw-local-sheet" aria-label="${esc(heading)}"><header><h3>${esc(heading)}</h3>${button('close-local','×','','aria-label="关闭局部面板"')}</header>${body}</section>`;
    }
    function renderLayoutThumbnail(positions,slot){
      if(!positions)return '<div class="fw-minimap fw-minimap-empty"><span>还没保存</span></div>';
      const {entities,bounds:raw}=layoutThumbnail(ctx.state,positions),side=Math.max(raw.w,raw.h),b={x:raw.x-(side-raw.w)/2,y:raw.y-(side-raw.h)/2,w:side,h:side};
      return `<div class="fw-minimap fw-scene-thumbnail" role="img" aria-label="方案${slot+1}的场景缩略图，${entities.length}个物件；只保存位置" style="aspect-ratio:${b.w}/${b.h};background-image:url('${ctx.asset('terrain/grass-0.svg')}')">${entities.map((e,index)=>`<span class="fw-mini-entity" aria-hidden="true" data-mini-entity="${e.id}" style="left:${(e.x-b.x)/b.w*100}%;top:${(e.y-b.y)/b.h*100}%;width:${e.displayW/b.w*100}%;height:${e.displayH/b.h*100}%;z-index:${index+1}">${art(e)}${e.kind==='shelter'?(e.animals||[]).map((a,i)=>`<span class="fw-mini-animal" style="left:${i%3*33}%;top:${48+Math.floor(i/3)*25}%">${animalArt(a)}</span>`).join(''):''}</span>`).join('')}</div>`;
    }
    function buyCommand(){return placement?{type:'buy',category:placement.category,itemId:placement.configId,x:placement.x,y:placement.y,rotation:placement.rotation}:null;}
    function placementCheck(){return placement?commandPreview(ctx,buyCommand()):{ok:false};}
    function renderGhost(){
      world.querySelector('.fw-ghost')?.remove();
      if(placement){const check=placementCheck();world.insertAdjacentHTML('beforeend',`<div class="fw-ghost ${check.ok?'valid':'invalid'}" style="${rectStyle(placement)}">${art(placement)}<span>${check.ok?'✓ 可放置':'× 不能放置'}</span></div>`);}
    }
    function draftCheck(){return draft?ctx.layout.validateLayout(ctx.state,draft):{ok:false};}
    function renderTransaction(){
      if(placement){const check=placementCheck();transaction.innerHTML=`<div class="fw-placement-panel"><strong>${esc(title(placement))} · ${placement.coins} 金币</strong><small>${check.ok?'拖动建筑或点空地选位置':esc(check.message)}</small><div>${button('rotate-placement','旋转')}${button('cancel-placement','取消')}${button('confirm-placement',`支付 ${placement.coins} 金币并放置`,'',check.ok?'':'disabled')}</div></div>`;return;}
      if(draft){const check=draftCheck(),e=selectedEntity();transaction.innerHTML=`<div class="fw-edit-panel"><strong>布置模式${e?' · '+esc(title(e)):''} · ${check.ok?'✓ 位置有效':'× '+esc(check.errors[0]?.message)}</strong><small class="fw-layout-instruction">${e&&ctx.layout.isFixedEntity(e)?'这个物件固定，不能移动。请拖动田地、仓库、工坊等其他物件。':'抓住物件直接拖动，拖空白移动地图。完成布置后保存，取消则恢复原位。'}</small><div>${button('rotate-draft','旋转','',e&&!ctx.layout.isFixedEntity(e)?'':'disabled')}${button('undo','撤销','',undo.length?'':'disabled')}${button('redo','重做','',redo.length?'':'disabled')}${button('layouts','方案')}${button('cancel-edit','取消')}${button('save-edit','完成布置','',check.ok?'':'disabled')}</div>${e&&ctx.layout.canStoreEntity(e)?button('store-object','收起此装饰'):''}<small>也可用方向键微调选中的可移动物件。</small></div>`;return;}
      if(clearPreview){transaction.innerHTML=`<div class="fw-placement-panel"><strong>${esc(name(clearPreview.tool))} ×1 → 清理 ${clearPreview.ids.length} 处</strong><small>消耗工具后，轮廓高亮的障碍将永久消失，不可撤销，不赠送材料。</small><div>${button('cancel-clear','取消')}${button('confirm-clear',`消耗 ${name(clearPreview.tool)} ×1 并清理 ${clearPreview.ids.length}处`)}</div></div>`;return;}
      if(selected?.startsWith('land_')){const p=ctx.layout.LAND_PATCHES.find(p=>p.id===selected),check=ctx.layout.canExpandLand(ctx.state,selected),owned=ctx.state.openedLand.includes(selected);transaction.innerHTML=`<div class="fw-land-panel"><header><strong>${owned?'已开放土地':'开垦 8 × 8 格'}</strong>${button('close-tool','×')}</header>${!owned?`<div class="fw-materials">${['land_deed','mallet','marker_stake'].map(key=>`<div>${item(key)}<strong class="${(ctx.state.inventory[key]||0)<p[key]?'short':''}">${ctx.state.inventory[key]||0} / ${p[key]}</strong></div>`).join('')}</div><small>${check.ok?'材料足够后可开垦，不自动清障':esc(check.message)}</small>${button('expand-land','消耗所示材料并开垦','',check.ok?'':'disabled')}`:'<p>边界已经开放。自然障碍需要另选工具清理。</p>'}</div>`;return;}
      transaction.innerHTML='';
    }
    function render(){if(destroyed)return;renderMap();renderCorners();renderContext();renderLocal();renderTransaction();game.style.setProperty('--fw-output-phase',`-${(ctx.state.now%5800)/1000}s`);game.dataset.reducedMotion=String(!!ctx.state.settings.reducedMotion);game.dataset.paused=String(doc.hidden||ctx.effectsPaused===true);}
    function closeTemporary(){chosenSeed=null;cancelGesture();more=false;localPage=null;clearPreview=null;pendingRecipe=null;activeJob=null;selected=null;selectedAnimal=null;render();}
    function openStorage(kind){if(ctx.openScene)ctx.openScene('P08',{initialStorage:kind});else ctx.say('仓库入口暂不可用');}
    function goToSource(itemId){if(ctx.openSource)ctx.openSource(itemId);else ctx.say('请前往'+name(itemId)+'对应的田地或生产设施');}
    function openObject(id,animal){
      cancelGesture();more=false;localPage=null;clearPreview=null;selected=id;selectedAnimal=animal||null;seedPage=0;recipePage=0;
      const e=entity(id),harvest=directCropHarvestCommand(e,ctx.state.now,!!draft||!!placement);
      if(draft||placement){render();return;}
      if(harvest){chosenSeed=null;selected=null;selectedAnimal=null;doAct(harvest,'作物已入仓');render();return;}
      if(e?.kind==='field'&&!e.crop&&chosenSeed){doAct({type:'plant',entityIds:[e.id],itemId:chosenSeed},'已播种');selected=null;render();return;}
      if(e?.kind==='fruit'&&e.status==='ready'){selected=null;doAct({type:'harvest',entityIds:[e.id]},'果实已入仓');render();return;}
      if(e?.kind==='shelter'&&animal){const a=e.animals.find(a=>a.id===animal),c=config.ANIMALS[e.configId];
        if(a?.status==='ready'){doAct({type:'collectAnimal',entityId:e.id,animalIds:[a.id]},'产物已入仓');lastCollectedAnimal={id:a.id,at:Date.now()};selectedAnimal=null;render();return;}
        if(a?.status==='hungry'){if(lastCollectedAnimal?.id===a.id&&Date.now()-lastCollectedAnimal.at<500){render();return;}if((ctx.state.inventory[c.feedItem]||0)>0){doAct({type:'feed',entityId:e.id,animalIds:[a.id]},'这一只已喂养');render();return;}ctx.say('缺少'+name(c.feedItem)+'，可点去制作饲料');}
        else if(a?.status==='producing'){ctx.say('生产中，还需 '+remaining(a.readyAt));}
      }
      if(e?.kind==='machine'&&!e.built&&e.buildReadyAt<=ctx.state.now){doAct({type:'completeBuilding',entityId:e.id},'新建筑已揭幕');render();return;}
      if(e?.kind==='barn'||e?.kind==='silo'){openStorage(e.kind);return;}
      if(e?.kind==='shelter')focus(e,1.5);else if(e?.kind==='machine')focus(e,id==='P05'?1.6:1.4);else if(e?.kind==='fruit')focus(e,1.35);
      render();
    }
    function startPlacement(category,key){
      cancelGesture();localPage=null;more=false;selected=null;
      const c=placementConfig(config,category,key);
      if(!c){ctx.say('这个物件暂时不能购买');return;}
      placement={id:'__preview',kind:category,category,configId:key,w:c.footprint[0],h:c.footprint[1],x:35,y:35,rotation:0,coins:c.coins};
      let found=false;for(let y=18;y<46&&!found;y++)for(let x=18;x<46&&!found;x++){placement.x=x;placement.y=y;if(placementCheck().ok)found=true;}
      focus(placement,1.25);render();
    }
    function persistLayoutDraft(){if(!draft||preserveStoredDraft)return;const result=ctx.store?.saveDraft?.(draft);if(result?.ok===false)ctx.say(result.message||'布局草稿未能自动保存，请勿关闭页面');return result;}
    function clearLayoutDraft(){const result=ctx.store?.clearDraft?.();if(result?.ok===false)ctx.say(result.message||'旧布局草稿未能清除');return result;}
    function enterEdit(){
      if(placement||draft)return;cancelGesture();more=false;localPage=null;draft=ctx.layout.beginLayout(ctx.state);undo=[];redo=[];render();
      preserveStoredDraft=false;const saved=ctx.store?.loadDraft?.();if(!saved)return true;preserveStoredDraft=true;
      const recovered=recoverWorldLayoutDraft(ctx.state,saved,ctx.layout);if(!recovered.ok){ctx.say(recovered.message);return true;}
      if(JSON.stringify(recovered.draft.positions)===JSON.stringify(draft.positions)){preserveStoredDraft=false;return true;}
      ctx.confirm({title:'继续上次未保存的布置？',body:'<p>只恢复物件位置草稿。库存、生产计时、金币和正式布局不会回退；取消则先查看当前布局。</p>',onConfirm:()=>{const latest=recoverWorldLayoutDraft(ctx.state,saved,ctx.layout);if(!latest.ok){ctx.say(latest.message);return latest;}draft=latest.draft;preserveStoredDraft=false;undo=[];redo=[];render();return {ok:true};}});return false;
    }
    function pushDraft(next){const check=ctx.layout.validateLayout(ctx.state,next);if(!check.ok){ctx.say(check.errors[0]?.message||'这个位置不合适');return false;}undo.push(clone(draft.positions));if(undo.length>50)undo.shift();redo=[];preserveStoredDraft=false;draft.positions=clone(next);persistLayoutDraft();render();return true;}
    function changeDraft(id,values){if(!draft)return;const e=entity(id);if(!e||ctx.layout.isFixedEntity(e)){ctx.say('固定物件不能挪动');return;}pushDraft(draft.positions.map(p=>p.id===id?{...p,...values}:p));}
    function saveDraft(){const r=doAct({type:'applyLayout',positions:draft.positions},'布局已保存，生产继续计时');if(r.ok){clearLayoutDraft();draft=null;undo=[];redo=[];render();}}
    function cancelEdit(){if(!draft)return;const changed=undo.length||JSON.stringify(draft.positions)!==JSON.stringify(ctx.layout.beginLayout(ctx.state).positions);if(!changed){if(!preserveStoredDraft)clearLayoutDraft();draft=null;render();return;}ctx.confirm({title:'放弃这次布置？',body:'<p>只丢弃未保存位置，生产与库存不回退。</p>',onConfirm:()=>{clearLayoutDraft();draft=null;undo=[];redo=[];render();}});}
    function reorderJob(direction){const e=selectedEntity(),ids=e.queue.filter(j=>j.startAt===null).map(j=>j.id),index=ids.indexOf(activeJob),to=index+direction;if(index<0||to<0||to>=ids.length)return;[ids[index],ids[to]]=[ids[to],ids[index]];doAct({type:'reorderQueue',entityId:e.id,jobIds:ids},'等待顺序已调整');}
    function action(action,el){
      if(action==='exit-farm'){cancelGesture();if(persistLayoutDraft()?.ok===false)return;more=false;ctx.exitFarm?.();return;}
      if(action.startsWith('chapter:')){if(draft){ctx.say('请先保存或取消布置');return;}closeTemporary();ctx.openScene?.(action.slice(8));return;}
      const e=selectedEntity();
      if(action==='more'){cancelGesture();selected=null;selectedAnimal=null;localPage=null;more=!more;render();}
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
      else if(action==='home-camera'){cancelGesture();more=false;defaultFocus();render();}
      else if(action==='zoom-in'||action==='zoom-out'){cancelGesture();const before={x:(view.clientWidth/2-camera.x)/camera.zoom,y:(view.clientHeight/2-camera.y)/camera.zoom};camera.zoom=Math.max(.75,Math.min(1.75,camera.zoom+(action==='zoom-in'?.15:-.15)));camera.x=view.clientWidth/2-before.x*camera.zoom;camera.y=view.clientHeight/2-before.y*camera.zoom;transform();}
      else if(action==='revive'||action==='revive-voucher'){if(action==='revive-voucher'&&!vouchersEnabled()){ctx.say('建设券功能关闭');return;}ask({type:'reviveTree',entityId:e.id,useVoucher:action==='revive-voucher'},'请园丁帮忙',`<p>${action==='revive-voucher'?'消耗 1 建设券':'使用今天的 1 次免费复苏机会'}。复苏后重新生长。</p>`,'果树已复苏');}
      else if(action==='clear-tree'){const toolId=config.FRUITS[e.configId].clearTool;ask({type:'clearTree',entityId:e.id,confirmed:true},'清理这棵树？',`<p>${name(toolId)} ×1。树会移除，不能撤销。</p>`,'树已清理');}
      else if(action==='adopt'){const c=config.ANIMALS[e.configId],cost=c.prices[e.tier||0];ask({type:'buy',category:'animal',itemId:e.configId,entityId:e.id,quantity:1},'领养一位伙伴',`<p>${cost} 金币 · 入住当前${c.name}舍。</p>`,'新伙伴入住啦');}
      else if(action==='complete-building')doAct({type:'completeBuilding',entityId:e.id},'新建筑揭幕啦');
      else if(action==='enqueue-confirm'){const r=doAct({type:'enqueue',entityId:e.id,recipeId:pendingRecipe},'配方已放入队列');if(r.ok){localPage=null;render();}}
      else if(action==='upgrade-machine'){if(!vouchersEnabled()){ctx.say('建设券扩槽功能关闭');return;}if(e.slots>=9){ctx.say('槽位已满');return;}const n=config.FARM_CONFIG.constructionVoucher.ordinarySlots[e.slotUpgrades||0];ask({type:'upgradeMachine',entityId:e.id},'增加一个生产槽',`<p>消耗 ${n} 建设券。当前 ${e.slots}/9 槽。</p>`,'生产槽已增加');}
      else if(action.startsWith('upgrade-storage:')){const kind=action.split(':')[1],ids=kind==='silo'?['nail','screw','wood_panel']:['bolt','duct_tape','plank'],n=ctx.state.storage[kind].upgrades+1;ask({type:'upgradeStorage',storage:kind},'扩建仓库',`<p>消耗 ${ids.map(key=>`${name(key)}×${n}`).join('、')}。</p>`,'仓库扩建完成');}
      else if(action.startsWith('obstacle:')){const toolId=action.split(':')[1];clearPreview={tool:toolId,ids:obstacleTargets(ctx.state,e,toolId)};render();}
      else if(action==='cancel-clear'){clearPreview=null;render();}
      else if(action==='confirm-clear'){const p={...clearPreview};const r=doAct({type:'clearObstacle',entityIds:p.ids,toolId:p.tool,confirmed:true},'障碍已清理');if(r.ok)clearPreview=null;render();}
      else if(action==='expand-land'){doAct({type:'expandLand',patchId:selected},'土地已开放');render();}
      else if(action==='rotate-placement'){placement.rotation=(placement.rotation+90)%360;render();}
      else if(action==='cancel-placement'){placement=null;ctx.openScene('P07');}
      else if(action==='confirm-placement'){const r=doAct(buyCommand(),'购买完成');if(r.ok){placement=null;selected=null;render();}}
      else if(action==='edit')enterEdit();
      else if(action==='rotate-draft'){const p=draft.positions.find(p=>p.id===selected);if(e.kind==='road')ctx.say('道路不需要旋转');else changeDraft(selected,{rotation:(p.rotation+90)%360});}
      else if(action==='undo'&&undo.length){redo.push(clone(draft.positions));draft.positions=undo.pop();persistLayoutDraft();render();}
      else if(action==='redo'&&redo.length){undo.push(clone(draft.positions));draft.positions=redo.pop();persistLayoutDraft();render();}
      else if(action==='save-edit')saveDraft();
      else if(action==='cancel-edit')cancelEdit();
      else if(action==='store-object'){changeDraft(selected,{stored:true});ctx.say('完成布置后，可在更多 → 外观与收纳重新摆出，不重复收费');}
      else if(action==='layouts'){localPage='layouts';render();}
      else if(action.startsWith('save-slot:'))doAct({type:'saveLayoutSlot',slot:Number(action.split(':')[1]),positions:draft.positions},'方案已记录');
      else if(action.startsWith('load-slot:')){const p=ctx.state.layoutSlots[Number(action.split(':')[1])];if(p&&pushDraft(p)){localPage=null;render();}}
      else if(action==='job-earlier')reorderJob(-1);
      else if(action==='job-later')reorderJob(1);
      else if(action==='job-cancel'){const j=e.queue.find(j=>j.id===activeJob);ask({type:'cancelJob',entityId:e.id,jobId:j.id},'取消等待中的这一批？',`<p>退还 ${Object.entries(j.inputs).map(([key,n])=>`${name(key)}×${n}`).join('、')}。货仓空间不足则不取消。</p>`,'原料已退回');}
    }
    function point(event){return {x:event.clientX,y:event.clientY};}
    function within(p,r){return p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;}
    function visibleTargetRect(el){
      const r=rectData(el.getBoundingClientRect()),panel=el.closest('.fw-object-panel');
      for(const bounds of [game.getBoundingClientRect(),...(panel?[panel.getBoundingClientRect()]:[])]) {
        r.left=Math.max(r.left,bounds.left);r.top=Math.max(r.top,bounds.top);r.right=Math.min(r.right,bounds.right);r.bottom=Math.min(r.bottom,bounds.bottom);
      }
      return r;
    }
    function targetsFor(tool){
      if(tool.action==='collectMachine')return [...root.querySelectorAll('[data-product]')].filter(el=>el.dataset.machine===tool.entityId).map(el=>({id:el.dataset.product,entityId:el.dataset.machine,...visibleTargetRect(el)}));
      if(tool.action==='feed'||tool.action==='collectAnimal')return [...world.querySelectorAll('[data-animal]')].filter(el=>{
        const shelter=entity(el.dataset.shelter),a=shelter?.animals.find(a=>a.id===el.dataset.animal);
        return a?.status===(tool.action==='feed'?'hungry':'ready');
      }).map(el=>({id:el.dataset.animal,entityId:el.dataset.shelter,...rectData(el.getBoundingClientRect())}));
      const origin=entity(tool.entityId);
      const targets=[...world.querySelectorAll('[data-entity]')].filter(el=>{const e=entity(el.dataset.entity);return tool.action==='enqueue'?e.id===tool.entityId:tool.action==='plant'?e.kind==='field'&&!e.crop:origin?.kind==='fruit'?e.kind==='fruit'&&e.status==='ready':e.kind==='field'&&e.crop?.readyAt<=ctx.state.now;}).map(el=>({id:el.dataset.entity,...rectData(el.getBoundingClientRect())}));
      if(tool.action==='enqueue')for(const el of root.querySelectorAll('[data-queue-owner]'))if(el.dataset.queueOwner===tool.entityId)targets.push({id:tool.entityId,...visibleTargetRect(el)});
      return targets;
    }
    function rectData(r){return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};}
    function actualUI(p,except){const el=doc.elementFromPoint(p.x,p.y);return !!el?.closest('.fw-corner,.fw-more,.fw-local-sheet,.fw-transaction>div,.fw-object-panel,.fw-seed-mode')&&!except?.contains(el);}
    function cancelGesture(reason){win.clearTimeout?.(longPressTimer);longPressTimer=0;pinch=null;const wasEdit=gesture?.type==='edit'&&draft;if(wasEdit)draft.positions=gesture.original;if(gesture?.stroke)cancelStroke(gesture.stroke,reason);gesture=null;note.hidden=true;cursor.hidden=true;root.querySelectorAll('.marked').forEach(el=>el.classList.remove('marked'));if(wasEdit){renderMap();renderTransaction();}root.querySelectorAll('.fw-drop-target').forEach(el=>el.classList.remove('fw-drop-target'));if(reason)ctx.say(reason);}
    function previewGesture(g,p){
      if(!g.stroke)return;
      extendStroke(g.stroke,p,targetsFor(g.tool));
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
      let cmd;
      if(['feed','collectAnimal'].includes(tool.action)){const wanted=tool.action==='feed'?'hungry':'ready',chosen=e.animals.find(a=>a.id===selectedAnimal&&a.status===wanted)||e.animals.find(a=>a.status===wanted);if(!chosen){ctx.say(tool.action==='feed'?'没有待喂的小伙伴':'还没有待收产物');return;}cmd={type:tool.action,entityId:e.id,animalIds:[chosen.id]};}
      else cmd={type:tool.action,entityIds:[e.id],...(tool.action==='plant'?{itemId:tool.itemId}:{})};
      doAct(cmd,'这一处已完成');if(tool.action==='plant')selected=null;render();
    }
    function startToolDrag(g,p){
      if(g.tool.action==='plant')chosenSeed=g.tool.itemId;
      g.type='stroke';edgeStamp=0;win.cancelAnimationFrame?.(edgeRaf);edgeRaf=win.requestAnimationFrame?.(edgeFrame)||0;g.stroke=createStroke(g.tool,g.start);g.sourceRect=rectData(g.source.getBoundingClientRect());g.exited=false;
      cursor.innerHTML=g.tool.itemId?item(g.tool.itemId):image('ui/harvest.svg');
      // Ignore the tool tray itself. The stroke begins where the pointer leaves its source tray.
      const r=g.source.closest(g.tool.action==='enqueue'?'.fw-recipe-row':'.fw-object-panel,.fw-seed-mode').getBoundingClientRect();g.trayRect=rectData(r);
      if(!within(p,r)){
        let lo=0,hi=1;for(let i=0;i<20;i++){const t=(lo+hi)/2,q={x:g.start.x+(p.x-g.start.x)*t,y:g.start.y+(p.y-g.start.y)*t};if(within(q,r))lo=t;else hi=t;}
        g.stroke.last={x:g.start.x+(p.x-g.start.x)*hi,y:g.start.y+(p.y-g.start.y)*hi};g.exited=true;previewGesture(g,p);
      }
    }
    function gestureUI(g,p){
      const el=doc.elementFromPoint(p.x,p.y);
      const allowed=g.tool?.action==='enqueue'?el?.closest('.fw-production'):g.tool?.action==='collectMachine'?el?.closest('.fw-tray'):null;
      return actualUI(p,allowed&&selectedEntity()?.id===g.tool.entityId?allowed:null);
    }
    function startDirectDrag(g,p){
      g.type='stroke';g.tool=g.directTool;g.stroke=createStroke(g.tool,g.start);g.exited=true;
      if(g.tool.action!=='collectMachine'){selected=null;selectedAnimal=null;if(g.tool.action!=='plant')chosenSeed=null;renderContext();}
      cursor.innerHTML=g.tool.itemId?item(g.tool.itemId):image('ui/harvest.svg');
      edgeStamp=0;win.cancelAnimationFrame?.(edgeRaf);edgeRaf=win.requestAnimationFrame?.(edgeFrame)||0;
      previewGesture(g,p);
    }
    function handleDown(event){
      if(event.button!==undefined&&event.button!==0)return;
      if(pointers.size>1)return;
      const target=event.target,toolEl=target.closest('[data-tool]'),jobEl=target.closest('[data-job]'),productEl=target.closest('[data-product]');
      if(toolEl){if(toolEl.disabled)return;cancelGesture();gesture={type:'tool-pending',id:event.pointerId,start:point(event),last:point(event),tool:toolFrom(toolEl),source:toolEl,time:Date.now()};event.preventDefault();game.setPointerCapture?.(event.pointerId);return;}
      if(jobEl){const e=selectedEntity(),j=e?.queue.find(j=>j.id===jobEl.dataset.job);gesture={type:'job-pending',id:event.pointerId,start:point(event),last:point(event),jobId:j?.id,entityId:e?.id,time:Date.now()};event.preventDefault();game.setPointerCapture?.(event.pointerId);return;}
      if(productEl&&!draft&&!placement){gesture={type:'product-pending',id:event.pointerId,start:point(event),jobId:productEl.dataset.product,entityId:productEl.dataset.machine,rect:rectData(productEl.getBoundingClientRect()),directTool:!draft&&!placement?{action:'collectMachine',entityId:productEl.dataset.machine,itemId:entity(productEl.dataset.machine)?.completed.find(j=>j.id===productEl.dataset.product)?.recipeId}:null,time:Date.now()};event.preventDefault();game.setPointerCapture?.(event.pointerId);return;}
      if(target.closest('button')&&!target.closest('.fw-world'))return;
      if(!target.closest('.fw-map'))return;
      const p=point(event),animal=target.closest('[data-animal]'),ent=target.closest('[data-entity]'),land=target.closest('[data-land]');
      if(placement){gesture={type:'place',id:event.pointerId,start:p};const w=worldPoint(p);placement.x=Math.floor(w.x-placement.w/2);placement.y=Math.floor(w.y-placement.h/2);render();}
      else if(draft&&ent){
        selected=ent.dataset.entity;selectedAnimal=null;
        if(ctx.layout.isFixedEntity(entity(selected)))gesture={type:'fixed',id:event.pointerId,start:p,last:p,entityId:selected};
        else {const w=worldPoint(p),pos=draft.positions.find(x=>x.id===selected);gesture={type:'edit',id:event.pointerId,start:p,last:p,entityId:selected,offset:{x:w.x-pos.x,y:w.y-pos.y},original:clone(draft.positions)};}
        renderMap();renderTransaction();
      }
      else{gesture={type:'pan-pending',id:event.pointerId,start:p,last:p,camera:{...camera},entityId:animal?.dataset.shelter||ent?.dataset.entity,animalId:animal?.dataset.animal,landId:land?.dataset.land,directTool:directWorldTool(entity(animal?.dataset.shelter||ent?.dataset.entity),animal?.dataset.animal,chosenSeed,ctx.state,config,!!draft||!!placement),time:Date.now()};}
      if(gesture?.type==='pan-pending'&&gesture.entityId&&!gesture.animalId&&!draft&&!placement&&!ctx.layout.isFixedEntity(entity(gesture.entityId))){const g=gesture;longPressTimer=win.setTimeout(()=>{if(gesture!==g||g.type!=='pan-pending')return;selected=g.entityId;chosenSeed=null;if(enterEdit()===false)return;const w=worldPoint(g.last),pos=draft.positions.find(x=>x.id===selected);gesture={type:'edit',id:g.id,start:g.start,last:g.last,entityId:selected,offset:{x:w.x-pos.x,y:w.y-pos.y},original:clone(draft.positions)};ctx.say('已拿起物件，拖动后点完成布置；取消不改位置');},500);}
      event.preventDefault();game.setPointerCapture?.(event.pointerId);
    }
    function handleMove(event){
      const g=gesture;if(!g||event.pointerId!==g.id)return;const p=point(event);g.last=p;
      if(!within(p,game.getBoundingClientRect())){cancelGesture('已移出地图，这一笔未执行');return;}
      const distance=Math.hypot(p.x-g.start.x,p.y-g.start.y);
      if(distance>=8){win.clearTimeout?.(longPressTimer);longPressTimer=0;}
      if(g.type==='tool-pending'){if(distance>=8)startToolDrag(g,p);return;}
      if(['pan-pending','product-pending'].includes(g.type)&&g.directTool&&distance>=8){startDirectDrag(g,p);if(gestureUI(g,p))cancelGesture('已划入工具区域，这一笔未执行');return;}
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
      if(distance>=8)g.type='pan';
      if(g.type==='pan'){focusAnchor=null;camera.x=g.camera.x+p.x-g.start.x;camera.y=g.camera.y+p.y-g.start.y;transform();}
    }
    function handleUp(event){
      const g=gesture;if(!g||event.pointerId!==g.id)return;win.clearTimeout?.(longPressTimer);longPressTimer=0;
      const p=point(event),inside=within(p,game.getBoundingClientRect()),distance=Math.hypot(p.x-g.start.x,p.y-g.start.y);
      if(g.type==='tool-pending'&&distance>=8&&inside)startToolDrag(g,p);
      if(['pan-pending','product-pending'].includes(g.type)&&g.directTool&&distance>=8&&inside)startDirectDrag(g,p);
      // Consume before state/render callbacks. A finished gesture cannot clear a newer one.
      gesture=null;note.hidden=true;cursor.hidden=true;
      if(!inside){if(g.stroke)cancelStroke(g.stroke,'outside');if(g.type==='edit'&&draft)draft.positions=g.original;render();ctx.say('移出地图未执行');return;}
      if(g.type==='tool-pending'){
        if(distance<8&&within(p,g.source.getBoundingClientRect()))tapTool(g.tool);else ctx.say('未落在工具上，没有执行');
      }else if(g.type==='stroke'){
        if(!g.exited||gestureUI(g,p)){cancelStroke(g.stroke,'outside');ctx.say('已取消，资源没有变化');render();return;}
        previewGesture(g,p);note.hidden=true;cursor.hidden=true;
        if(g.tool.action==='enqueue'&&!targetsFor(g.tool).some(t=>within(p,t))){cancelStroke(g.stroke,'invalid-drop');ctx.say('请把配方拖到这台机器或上方生产槽');render();return;}
        const cmd=finishStroke(g.stroke);if(cmd)doAct(cmd,'这一笔已完成');else ctx.say('没有划到可操作对象');if(g.tool.action==='plant')selected=null;render();
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
      }else if(g.type==='pan-pending'&&distance<8&&Date.now()-g.time<=500){
        if(g.landId){selected=g.landId;more=false;render();}
        else if(g.entityId){if(draft){selected=g.entityId;render();}else openObject(g.entityId,g.animalId);}
        else{selected=null;selectedAnimal=null;more=false;localPage=null;render();}
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
      if(pinch.distance<1)return;e.preventDefault();camera.zoom=Math.max(.75,Math.min(1.75,pinch.zoom*Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)/pinch.distance));camera.x=middle.x-r.left-pinch.ground.x*TILE*camera.zoom;camera.y=middle.y-r.top-pinch.ground.y*TILE*camera.zoom;transform();
    },{capture:true,passive:false});
    on(doc,'pointerup',e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;},true);
    on(doc,'pointercancel',e=>{pointers.delete(e.pointerId);cancelGesture('触控中断，未执行');},true);
    on(game,'pointerdown',handleDown);on(game,'pointermove',handleMove);on(game,'pointerup',handleUp);
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
      const animal=e.target.closest('[data-animal]'),ent=e.target.closest('[data-entity]'),land=e.target.closest('[data-land]'),job=e.target.closest('[data-job]');
      if(animal)openObject(animal.dataset.shelter,animal.dataset.animal);else if(ent)openObject(ent.dataset.entity);else if(land){selected=land.dataset.land;render();}else if(job){activeJob=job.dataset.job;localPage='job';render();}
    });
    on(world,'focusin',event=>{
      const target=event.target.closest('[data-entity],[data-animal]');if(!target||gesture||draft||placement)return;
      const r=target.getBoundingClientRect(),v=view.getBoundingClientRect();
      if(r.left<v.left||r.right>v.right||r.top<v.top||r.bottom>v.bottom){const e=entity(target.dataset.entity||target.dataset.shelter);if(e)focus(e,camera.zoom);}
    });
    on(view,'wheel',e=>{e.preventDefault();cancelGesture();focusAnchor=null;const p=point(e),before=worldPoint(p),r=view.getBoundingClientRect();camera.zoom=Math.max(.75,Math.min(1.75,camera.zoom+(e.deltaY>0?-.1:.1)));camera.x=p.x-r.left-before.x*TILE*camera.zoom;camera.y=p.y-r.top-before.y*TILE*camera.zoom;transform();},{passive:false});
    on(root,'keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();if(gesture){cancelGesture('已取消');render();}else if(localPage){localPage=null;render();}else if(draft)cancelEdit();else if(placement){placement=null;ctx.openScene('P07');}else closeTemporary();return;}
      if(e.target.closest('input,select,textarea'))return;
      const vector={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!vector)return;
      e.preventDefault();cancelGesture();if(draft&&selected){const p=draft.positions.find(p=>p.id===selected);if(p)changeDraft(selected,{x:p.x+vector[0],y:p.y+vector[1]});}else if(placement){placement.x+=vector[0];placement.y+=vector[1];render();}else{focusAnchor=null;camera.x-=vector[0]*48;camera.y-=vector[1]*48;transform();}
    });
    const unsubscribe=ctx.subscribe(()=>{if(!gesture)render();});
    const itemId=ctx.focusItem,recipe=ctx.focusRecipe?config.RECIPES[ctx.focusRecipe]:config.RECIPES[itemId];
    const animal=Object.values(config.ANIMALS).find(a=>a.product===itemId);
    const candidates=ctx.state.entities.filter(e=>!e.stored);
    const e=entity(ctx.focusEntity)||candidates.find(e=>config.CROPS[itemId]?e.kind==='field'&&e.crop?.itemId===itemId&&e.crop.readyAt<=ctx.state.now:false)||candidates.find(e=>config.CROPS[itemId]?e.kind==='field'&&e.crop?.itemId===itemId:config.FRUITS[itemId]?e.kind==='fruit'&&e.configId===itemId:animal?e.kind==='shelter'&&e.configId===animal.id:recipe?e.kind==='machine'&&e.machineType===recipe.machineType:false)||candidates.find(e=>config.CROPS[itemId]&&e.kind==='field'&&!e.crop);
    selected=e?.id||null;
    if(config.CROPS[itemId])seedPage=Math.max(0,Math.floor(Object.values(config.CROPS).filter(c=>c.level<=ctx.state.level).findIndex(c=>c.id===itemId)/4));
    if(recipe&&e)recipePage=Math.max(0,Math.floor(Object.values(config.RECIPES).filter(r=>r.machineType===e.machineType&&r.level<=ctx.state.level).findIndex(r=>r.id===recipe.id)/3));
    if(e)focus(e,e.kind==='machine'?1.6:1.2);else if(id==='P01'&&ctx.state.camera){const saved=ctx.state.camera;viewSize=viewportSize();camera={zoom:saved.zoom,x:viewSize.w/2-saved.centerX*TILE*saved.zoom,y:viewSize.h/2-saved.centerY*TILE*saved.zoom};cameraReady=viewSize.w>0&&viewSize.h>0;}else defaultFocus();
    if(itemId&&!e)ctx.say('还没有对应设施，请先购买或解锁');
    if(ctx.initialPlacement)startPlacement(ctx.initialPlacement.category,ctx.initialPlacement.itemId);
    render();
    const resizeObserver=typeof win.ResizeObserver==='function'?new win.ResizeObserver(scheduleReframe):null;resizeObserver?.observe(view);
    function saveCamera(){if(cameraReady)ctx.saveCamera?.({centerX:Math.max(0,Math.min(63.999,(view.clientWidth/2-camera.x)/camera.zoom/TILE)),centerY:Math.max(0,Math.min(63.999,(view.clientHeight/2-camera.y)/camera.zoom/TILE)),zoom:camera.zoom});}
    const stopDeactivate=ctx.onDeactivate?.(()=>{cancelGesture();pointers.clear();persistLayoutDraft();saveCamera();});
    function cleanup(){if(destroyed)return;destroyed=true;saveCamera();stopDeactivate?.();cancelGesture();persistLayoutDraft();win.cancelAnimationFrame?.(edgeRaf);win.cancelAnimationFrame?.(resizeRaf);listeners.splice(0).forEach(off=>off());unsubscribe?.();resizeObserver?.disconnect();root.classList.remove('fw-root');if(ownsDocument)doc.documentElement?.classList.remove('fw-document');}
    ctx.onExit?.(cleanup);return cleanup;
  }

export {segmentHits,createStroke,extendStroke,cancelStroke,finishStroke,obstacleTargets,commandPreview,layoutThumbnail,worldScenePresentation,machineTrayPlacement,directCropHarvestCommand,directWorldTool,resizeHasPendingAction,resizeWorldCamera};
