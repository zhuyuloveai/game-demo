/** Bounded presentation-only farm feedback. Never reads or writes economic state.
 * Import farm-delight.css once. Mount on .farm-app after it exists. Call refresh()
 * after render/camera changes; play only after authoritative successful commands.
 * Sources/target accept DOM elements OR captured DOMRects (before a rerender).
 * point is an optional {x,y} in client pixels. itemId uses the licensed asset index.
 */
import {farmAssetUrl} from './farm-assets.mjs';
export const FARM_DELIGHT_LIMITS=Object.freeze({perAction:8,total:32,idle:30,ambient:3,ttl:1500,cooldown:70});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
export function delightCount(count=1,reducedMotion=false){return reducedMotion?1:clamp(Math.ceil(finite(count,1)),1,FARM_DELIGHT_LIMITS.perAction);}
/** Stable per-entity phases prevent synchronized swaying after rerenders. */
export function delightPhase(id=''){
  let hash=2166136261;for(const char of String(id)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return (hash>>>0)%11000;
}
/** Recovered motion-v3 profile: deterministic identity, period, phase and envelope.
 * No global RNG or economic state. Inner art only; hit geometry stays static. */
export function delightProfile(id='',kind='animal'){
  let seed=2166136261;
  for(const char of `${kind}:${id}`){seed^=char.charCodeAt(0);seed=Math.imul(seed,16777619);}
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const ranges={animal:[4100,6400],crop:[2700,3900],tree:[3500,5100],machine:[3600,6100],ready:[3300,5700]};
  const [min,max]=ranges[kind]||ranges.animal;
  const duration=Math.round(min+(max-min)*random()),phase=Math.round(duration*random()),hold=Math.floor(random()*3),strength=random();
  return {duration,phase,hold,scaleX:1.018+strength*.01,scaleY:1.045+strength*.015,angle:(kind==='tree'?1.6:2)+strength*(kind==='tree'?.6:.8),brightness:1.08+strength*.04,readyScale:1.08+strength*.06};
}
const motionProperties=['--ripe-pop-delay','--ripe-cycle-delay','--ripe-cycle-duration','--delight-delay','--delight-duration','--delight-envelope','--delight-scale-x','--delight-scale-y','--delight-angle','--delight-brightness','--delight-ready-scale'];
function clearIdle(el){
  delete el.dataset.delightIdle;delete el.dataset.delightRipe;delete el.dataset.delightFresh;
  for(const property of motionProperties)el.style.removeProperty(property);
}
/** Optional frame-selector input: walk briefly, then rest, within the same pen.
 * Feeding/collection/ready states must keep precedence in the caller. */
export function delightAnimalActivity(id,time,{reducedMotion=false,eligible=true}={}){
  if(reducedMotion||!eligible)return {walking:false,elapsed:0};
  const elapsed=(Math.max(0,finite(time))+delightPhase(id))%11000;
  return {walking:elapsed>=2400&&elapsed<3400||elapsed>=6500&&elapsed<7500,elapsed:elapsed>=6500?elapsed-6500:Math.max(0,elapsed-2400)};
}
export function delightPoint(rect,bounds){
  return {x:clamp(finite(rect.left)+finite(rect.width)/2-bounds.left,14,Math.max(14,bounds.width-14)),y:clamp(finite(rect.top)+finite(rect.height)/2-bounds.top,14,Math.max(14,bounds.height-14))};
}
/** Curved flight with no layout reads per frame, endpoints exact. */
export function delightFlight(from,to,progress,index=0){
  const t=clamp(finite(progress),0,1),ease=1-(1-t)**3;
  return {x:from.x+(to.x-from.x)*ease+Math.sin(Math.PI*t)*(index%2?12:-12),y:from.y+(to.y-from.y)*ease-Math.sin(Math.PI*t)*Math.min(72,24+Math.abs(to.x-from.x)*.13),scale:.75+.35*Math.sin(Math.PI*t),opacity:t>.8?(1-t)/.2:Math.min(1,t*9)};
}
/** TTL + FIFO eviction applies even during rapid repeats. Cleanup owns animations. */
export function createDelightBudget(limit=FARM_DELIGHT_LIMITS.total){
  const records=[];
  const remove=record=>{const i=records.indexOf(record);if(i>=0){records.splice(i,1);record.dispose();}};
  return {add(record){while(records.length>=Math.max(1,limit))remove(records[0]);records.push(record);return record;},remove,sweep(now){for(const record of [...records])if(record.until<=now)remove(record);},clear(){for(const record of [...records])remove(record);},get size(){return records.length;},entries(){return [...records];}};
}
const labels={click:'✓',plant:'已播种',sow:'已播种',harvest:'已收获',collect:'已领取',collectAnimal:'已领取',collectMachine:'已领取',feed:'已喂养',coins:'金币到账',sale:'交易完成',upgrade:'升级啦',firstClear:'首次通关',complete:'加工完成',revive:'已复苏'};
const glyphs={click:'✧',plant:'❧',sow:'❧',feed:'♥',coins:'●',sale:'●',upgrade:'✦',firstClear:'✦',complete:'✦',revive:'❧'};
// Layout/input safety must not depend on the optional presentation stylesheet.
// Keep these inline before insertion: failed CSS must never create a flex item
// or let an intrinsic-size SVG cover the farm's controls.
function applyDelightSafety(node,properties){
  for(const [key,value] of Object.entries(properties))node.style.setProperty(key,value,'important');
  node.style.setProperty('pointer-events','none','important');
  node.style.setProperty('user-select','none','important');
}
const flying=new Set(['harvest','collect','collectAnimal','collectMachine','coins','sale']);
export function mountFarmDelight(root,{reducedMotion=false,enabled=true}={}){
  if(!root?.ownerDocument)throw new TypeError('mountFarmDelight requires a DOM root');
  const doc=root.ownerDocument,win=doc.defaultView,query=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const layer=doc.createElement('div');layer.className='farm-delight-layer';layer.setAttribute('aria-hidden','true');applyDelightSafety(layer,{position:'absolute',inset:'0',overflow:'hidden','z-index':'25',contain:'layout style paint'});root.append(layer);
  const ambient=doc.createElement('div');ambient.className='farm-delight-ambient';ambient.setAttribute('aria-hidden','true');applyDelightSafety(ambient,{position:'absolute',inset:'0',overflow:'hidden','z-index':'2',contain:'layout paint'});
  for(let i=0;i<FARM_DELIGHT_LIMITS.ambient;i++){const mote=doc.createElement('i');mote.className=i===0?'farm-delight-butterfly':'farm-delight-mote';applyDelightSafety(mote,{position:'absolute','max-width':'13px','max-height':'8px'});ambient.append(mote);}
  root.querySelector('.farm-viewport')?.append(ambient);
  const budget=createDelightBudget();let destroyed=false,manualPause=false,raf=0,lastAction='',lastAt=-Infinity;
  let idle=[];
  const readiness=new Map();
  const reduced=()=>!!reducedMotion||!!query?.matches;
  const paused=()=>manualPause||doc.hidden||!enabled||destroyed;
  const time=()=>win.performance.now();
  let pausedAt=null,pausedDuration=0;
  const motionTime=()=>time()-pausedDuration-(pausedAt===null?0:time()-pausedAt);
  const stop=()=>{if(raf)win.cancelAnimationFrame(raf);raf=0;budget.clear();};
  function state(){const freeze=paused()||reduced();if(freeze&&pausedAt===null)pausedAt=time();else if(!freeze&&pausedAt!==null){pausedDuration+=time()-pausedAt;pausedAt=null;}root.dataset.delight=enabled?'on':'off';root.dataset.delightPaused=String(paused());root.dataset.delightReduced=String(reduced());ambient.hidden=paused()||reduced();if(paused()||reduced())stop();}
  function tick(now){
    raf=0;if(paused()){stop();return;}budget.sweep(now);
    for(const r of budget.entries())if(r.flight){const p=delightFlight(r.from,r.to,(now-r.start)/r.duration,r.index);r.node.style.transform=`translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%) scale(${p.scale})`;r.node.style.opacity=String(p.opacity);}
    if(budget.size)raf=win.requestAnimationFrame(tick);
  }
  function schedule(){if(!raf&&budget.size)raf=win.requestAnimationFrame(tick);}
  function refresh(){
    if(destroyed)return;
    const previous=idle;idle=[];
    const cleanup=()=>{for(const el of previous)if(!idle.includes(el))clearIdle(el);};
    if(!enabled){cleanup();return;}
    const maps=Array.from(root.querySelectorAll('.fw-map')).filter(map=>!map.closest?.('[inert]'));
    const view=maps.at(-1)||root.querySelector('.farm-viewport');
    if(!view){ambient.hidden=true;cleanup();return;}
    if(ambient.parentNode!==view)view.append(ambient);
    ambient.hidden=paused()||reduced();
    if(maps.length){
      const bounds=view.getBoundingClientRect(),counts={animal:0,crop:0,tree:0,machine:0,ready:0};
      const limits={animal:12,crop:6,tree:4,machine:4,ready:4};
      const elements=Array.from(view.querySelectorAll('[data-fw-motion]')),fresh=new Set(),seen=new Set();
      for(const el of elements){
        const id=el.dataset.entity;if(!id||el.dataset.fwReady===undefined)continue;
        seen.add(id);const ready=el.dataset.fwReady==='true',prior=readiness.get(id);
        if(ready&&prior?.ready===false)fresh.add(id);
        readiness.set(id,{ready,popAt:ready?prior?.popAt??null:null});
      }
      for(const id of readiness.keys())if(!seen.has(id))readiness.delete(id);
      let pops=[...readiness.values()].filter(record=>record.popAt!==null&&motionTime()-record.popAt<1100).length;
      for(const el of elements){
        const kind=el.dataset.fwMotion;
        if(!limits[kind]||counts[kind]>=limits[kind]||idle.length>=FARM_DELIGHT_LIMITS.idle||
          el.closest?.('.fw-layout-world,.fw-occluder-faded,.fw-muted-neighbor,[data-motion-blocked="true"]'))continue;
        const rect=el.getBoundingClientRect();
        if(!rect.width||!rect.height||rect.right<=bounds.left||rect.left>=bounds.right||rect.bottom<=bounds.top||rect.top>=bounds.bottom)continue;
        el.dataset.delightIdle=kind;
        if(!previous.includes(el)){
          const profile=delightProfile(el.dataset.animal||el.dataset.entity||el.dataset.pen||el.dataset.product,kind);
          const envelope={animal:'breathe',crop:'plant',tree:'plant',machine:'work',ready:'ready'}[kind];
          const properties={'--delight-delay':`${-(motionTime()+profile.phase)}ms`,'--delight-duration':`${profile.duration}ms`,
            '--delight-envelope':`fw-delight-${envelope}-${profile.hold}`,'--delight-scale-x':profile.scaleX,'--delight-scale-y':profile.scaleY,
            '--delight-angle':`${profile.angle}deg`,'--delight-brightness':profile.brightness,'--delight-ready-scale':profile.readyScale};
          for(const [key,value] of Object.entries(properties))el.style.setProperty(key,String(value));
        }
        const record=readiness.get(el.dataset.entity);
        if(record?.ready&&(kind==='crop'||kind==='tree')){
          const phase=delightPhase(el.dataset.entity);
          if(!previous.includes(el)||el.dataset.delightRipe!=='true'){
            el.style.setProperty('--ripe-cycle-duration',`${5600+phase%1900}ms`);
            el.style.setProperty('--ripe-cycle-delay',`${-(motionTime()+phase)}ms`);
          }
          el.dataset.delightRipe='true';
          if(fresh.has(el.dataset.entity)&&pops<2&&!paused()&&!reduced()){record.popAt=motionTime();pops++;}
          if(record.popAt!==null&&motionTime()-record.popAt<1100){
            if(el.dataset.delightFresh!=='true'){el.dataset.delightFresh='true';el.style.setProperty('--ripe-pop-delay',`${-(motionTime()-record.popAt)}ms`);}
          }else{delete el.dataset.delightFresh;el.style.removeProperty('--ripe-pop-delay');}
        }else{
          delete el.dataset.delightRipe;delete el.dataset.delightFresh;
          for(const key of ['--ripe-pop-delay','--ripe-cycle-duration','--ripe-cycle-delay'])el.style.removeProperty(key);
        }
        idle.push(el);counts[kind]++;
      }
      cleanup();return;
    }
    const bounds=view.getBoundingClientRect();
    for(const el of root.querySelectorAll('.farm-entity:not(.is-ghost)')){
      if(idle.length>=FARM_DELIGHT_LIMITS.idle)break;
      const r=el.getBoundingClientRect();if(r.right<bounds.left||r.left>bounds.right||r.bottom<bounds.top||r.top>bounds.bottom)continue;
      const src=el.querySelector('.farm-sprite')?.getAttribute('src')||'';
      let kind='';
      if(el.classList.contains('kind-field')&&/\/plants\//.test(src))kind='crop';
      else if(el.classList.contains('kind-fruit')&&!/wilt/.test(src))kind='tree';
      else if(el.classList.contains('kind-obstacle')&&/tree|bush/.test(src))kind='tree';
      else if(el.classList.contains('kind-shelter'))kind='animal';
      else if(el.querySelector('[data-machine-state="processing"]'))kind='machine';
      if(!kind)continue;
      el.dataset.delightIdle=kind;el.dataset.delightRipe=String(!!el.querySelector('.farm-ready-badge'));el.style.setProperty('--delight-delay',`${-delightPhase(el.dataset.entity)}ms`);idle.push(el);
    }
    cleanup();
  }
  function play(action,{sourceElements=[],targetElement=null,itemId=null,count=1,point=null}={}){
    if(paused())return 0;
    const now=time();if(action===lastAction&&now-lastAt<FARM_DELIGHT_LIMITS.cooldown)return 0;lastAction=action;lastAt=now;
    const bounds=root.getBoundingClientRect(),rectOf=e=>typeof e?.getBoundingClientRect==='function'?e.getBoundingClientRect():e;
    const sources=Array.from(sourceElements||[]).slice(0,FARM_DELIGHT_LIMITS.perAction).map(rectOf).filter(Boolean);
    if(!sources.length){const view=root.querySelector('.farm-viewport');sources.push(point?{left:point.x,top:point.y,width:0,height:0}:rectOf(view)||bounds);}
    const target=targetElement?delightPoint(rectOf(targetElement),bounds):null;
    const small=reduced(),n=small?1:delightCount(Math.max(count,sources.length,action==='click'?2:action==='firstClear'||action==='upgrade'?8:4));
    // Representatives + sparkles share a single per-action budget, never 8 of each.
    for(let i=0;i<n;i++){
      const from=delightPoint(sources[Math.floor(i*sources.length/n)],bounds);
      const node=doc.createElement('span');node.className=`farm-delight-particle${small?' is-still':''}`;
      applyDelightSafety(node,{position:'absolute',width:small?'112px':'26px',height:small?'28px':'26px','max-width':small?'112px':'30px','max-height':'30px','font-size':small?'11px':'22px','line-height':'1.2','box-sizing':'border-box'});
      const isFlight=!small&&flying.has(action)&&!!target;
      if(small){node.textContent=labels[action]||'已完成';}
      else if(isFlight&&itemId&&i%2===0){const img=doc.createElement('img');img.src=farmAssetUrl(itemId);img.alt='';img.draggable=false;applyDelightSafety(img,{position:'absolute',inset:'0',width:'30px',height:'30px','max-width':'30px','max-height':'30px','object-fit':'contain'});node.append(img);node.classList.add('is-item');}
      else {node.textContent=glyphs[action]||(i%2?'✧':'❧');node.classList.add(action==='feed'?'is-heart':action==='coins'||action==='sale'?'is-coin':action==='plant'||action==='sow'||action==='revive'?'is-leaf':'is-spark');}
      layer.append(node);
      const duration=small?800:isFlight?650+Math.min(i*35,180):650;
      node.style.left=isFlight?'0px':`${from.x}px`;node.style.top=isFlight?'0px':`${Math.max(14,from.y-22)}px`;
      node.style.setProperty('--delight-dx',`${(i%2?-1:1)*(12+i*5)}px`);node.style.setProperty('--delight-rise',`${-28-i*4}px`);
      node.style.setProperty('--delight-duration',`${duration}ms`);
      if(isFlight){node.classList.add('is-flight');node.style.opacity='0';}
      const record={node,flight:isFlight,from,to:target,start:now,duration,index:i,until:now+Math.min(duration+100,FARM_DELIGHT_LIMITS.ttl),dispose(){node.remove();}};
      budget.add(record);
    }
    schedule();return n;
  }
  const onVisibility=()=>state(),onMotion=()=>state();doc.addEventListener('visibilitychange',onVisibility);query?.addEventListener?.('change',onMotion);
  state();refresh();
  return {play,refresh,setReducedMotion(value){reducedMotion=!!value;state();},setEnabled(value){enabled=!!value;state();refresh();},pause(value=true){manualPause=!!value;state();},get activeCount(){return budget.size;},destroy(){if(destroyed)return;destroyed=true;stop();readiness.clear();for(const el of idle)clearIdle(el);idle=[];doc.removeEventListener('visibilitychange',onVisibility);query?.removeEventListener?.('change',onMotion);layer.remove();ambient.remove();delete root.dataset.delight;delete root.dataset.delightPaused;delete root.dataset.delightReduced;}};
}
