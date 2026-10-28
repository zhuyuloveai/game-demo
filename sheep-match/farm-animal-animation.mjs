import {ownFarmAnimationImage} from './farm-dom-patch.mjs';
/** Presentation-only registered animal frames. Never writes animals, production or world positions. */
import {ANIMAL_ANIMATION_METADATA} from './farm-runtime-animal-animation-metadata.mjs';
import {resolveShelterSpec} from './farm-runtime-shelters.mjs';
export {ANIMAL_ANIMATION_METADATA};
export const ANIMAL_ANIMATION_FPS=12;
export const ANIMAL_ANIMATION_MAX_VISIBLE=12;
const descriptors=new Map();
const speciesKeys=new Map();
for(const [key,data] of Object.entries(ANIMAL_ANIMATION_METADATA)){const species=data.species||'chicken';if(!speciesKeys.has(species))speciesKeys.set(species,[]);speciesKeys.get(species).push(key);}
// Shared by world and close-up controllers: opening a pen does not decode all
// species again. Only species actually visible in a controller are requested.
const imageCaches=new WeakMap();
export function resolveAnimalAnimationFrame(action,index,species='chicken'){
 const key=`${species==='chicken'?'':species+'/'}${action}/${String(index).padStart(2,'0')}`,data=ANIMAL_ANIMATION_METADATA[key];
 if(!data)return null;
 if(!descriptors.has(key))descriptors.set(key,Object.freeze({...data,src:new URL(data.path,import.meta.url).href,aspect:360/280,animation:action,fullCanvas:true,shelterLayered:true}));
 return descriptors.get(key);
}
/** Stable across rerenders; no random changes to the saved entity. */
export function animalAnimationPhase(id){let hash=2166136261;for(const c of String(id))hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0)%8000;}
export function animalAnimationSample({id,status,elapsed,eatStarted=null}){
 if(eatStarted!==null){const age=elapsed-eatStarted;if(age>=0&&age<1000)return {action:'eat',frame:Math.min(11,Math.floor(age*12/1000))};}
 if(status!=='hungry')return null;
 const phase=(elapsed+animalAnimationPhase(id))%8000;
 return phase<1000?{action:'walk',frame:Math.min(11,Math.floor(phase*12/1000))}:null;
}
/**
 * Call sync() after each world render and playEat(ids) only after a successful feed.
 * getArt(id,fallback) supplies the exact currently painted frame's alpha mask.
 * isPaused includes dialogs/gestures; isReduced includes the game's motion setting.
 */
export function createAnimalAnimationController({root,getAnimal,getStaticArt,isPaused=()=>false,isReduced=()=>false,maxVisible=ANIMAL_ANIMATION_MAX_VISIBLE,
 requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),
 document:doc=root?.ownerDocument,matchMedia=globalThis.matchMedia?.bind(globalThis),Image:ImageCtor=globalThis.Image}={}){
 const media=matchMedia?.('(prefers-reduced-motion: reduce)'),feeds=new Map(),live=new Map(),requestedSpecies=new Set(),subscriptions=new Set();
 const cache=ImageCtor?(imageCaches.get(ImageCtor)||new Map()):new Map();
 if(ImageCtor&&!imageCaches.has(ImageCtor))imageCaches.set(ImageCtor,cache);
 let nodes=[],elapsed=0,last=null,raf=null,dead=false,drawing=false,wasBlocked=true,lastDraw=-Infinity,lastVisibility=-Infinity,canRun=false;
 const clipFor=(species,action)=>cache.get(`${species}/${action}`);
 function clipSettled(){if(dead||drawing||blocked())return;refreshVisibility();draw();schedule();}
 function requestSpecies(species){if(requestedSpecies.has(species))return;requestedSpecies.add(species);
  for(const action of ['eat','walk']){
   const clipKey=`${species}/${action}`;let clip=cache.get(clipKey);
   if(!clip){clip={status:ImageCtor?'pending':'ready',remaining:12,images:[],listeners:new Set()};cache.set(clipKey,clip);}
   if(clip.status==='pending'){clip.listeners.add(clipSettled);subscriptions.add(clip);}
   if(clip.images.length||!ImageCtor)continue;
   for(const key of (speciesKeys.get(species)||[]).filter(key=>ANIMAL_ANIMATION_METADATA[key].action===action)){
    const data=ANIMAL_ANIMATION_METADATA[key],img=new ImageCtor();clip.images.push(img);let settled=false;
    const finish=ok=>{if(settled)return;settled=true;img.onload=null;img.onerror=null;
     if(clip.status!=='pending')return;
     if(!ok)clip.status='failed';else if(--clip.remaining===0)clip.status='ready';
     if(clip.status!=='pending'){for(const notify of [...clip.listeners])notify();clip.listeners.clear();}
    };
    img.onload=()=>{if(typeof img.decode==='function'){Promise.resolve().then(()=>img.decode()).then(()=>finish(true),()=>finish(false));}else finish(true);};
    img.onerror=()=>finish(false);img.src=resolveAnimalAnimationFrame(data.action,data.frame,species).src;
   }
  }
 }
 const visibility=new WeakMap(),painted=new WeakMap(),staticBases=new WeakMap();
 const cap=Math.max(0,Math.min(ANIMAL_ANIMATION_MAX_VISIBLE,Math.floor(maxVisible)||0));
 const blocked=()=>Boolean(doc?.hidden||media?.matches||isReduced()||isPaused()||root?.closest?.('[inert]'));
 function visible(el,clip){const r=el.getBoundingClientRect?.();if(!r)return true;
  const win=doc?.defaultView;return r.width>0&&r.height>0&&r.right>Math.max(0,clip?.left??0)&&r.bottom>Math.max(0,clip?.top??0)&&r.left<Math.min(win?.innerWidth??Infinity,clip?.right??Infinity)&&r.top<Math.min(win?.innerHeight??Infinity,clip?.bottom??Infinity);}
 function paint(el,art,active,base=art){const image=el.querySelector?.('.fw-animal-art image');if(!image||!art)return;
  if(painted.get(image)!==art.src||image.getAttribute?.('href')!==art.src){image.setAttribute('href',art.src);painted.set(image,art.src);}
  ownFarmAnimationImage(image,active?base?.src:null);staticBases.set(image,base?.src);
  if(active){el.dataset.fwFrameRunning='true';el.dataset.fwFrameAction=art.action;el.dataset.fwFrame=String(art.frame);live.set(el.dataset.animal,art);}
  else{delete el.dataset.fwFrameRunning;delete el.dataset.fwFrameAction;delete el.dataset.fwFrame;live.delete(el.dataset.animal);}}
 function draw(){let count=0;const stop=blocked(),reduced=media?.matches||isReduced(),previousLive=new Map(live);live.clear();canRun=false;drawing=true;
  // Reduced motion opts out of the action, unlike a temporary background pause.
  // Do not replay a pending/active feed when that preference is turned off later.
  if(media?.matches||isReduced())feeds.clear();
  try{for(const el of nodes){const id=el.dataset.animal,entry=getAnimal(id,el.dataset.shelter),a=entry?.animal,s=entry?.shelter;if(!a)continue;
   const fallback=getStaticArt(a,s),eligible=speciesKeys.has(a.configId)&&(!s?.skinId||!!resolveShelterSpec(s))&&fallback?.shelterLayered;
   const onscreen=visibility.get(el);if(!onscreen||!eligible)feeds.delete(id);
   // A transient gesture/background pause freezes the already decoded frame.
   // Reduced motion, state changes and offscreen cleanup still restore static art.
   const frozen=previousLive.get(id),image=el.querySelector?.('.fw-animal-art image');
   if(stop&&!reduced&&eligible&&onscreen&&frozen&&count<cap&&staticBases.get(image)===fallback?.src){live.set(id,frozen);count++;continue;}
   if(!stop&&eligible&&onscreen&&(a.status==='hungry'||feeds.has(id)))requestSpecies(a.configId);
   const eatClip=clipFor(a.configId,'eat'),walkClip=clipFor(a.configId,'walk');
   if(feeds.has(id)&&eatClip?.status==='failed')feeds.delete(id);
   // A successful feed waits for the complete decoded clip, then starts at frame
   // zero. Partial downloads never alternate action frames with the static pose.
   if(!stop&&feeds.has(id)&&feeds.get(id)===null&&eatClip?.status==='ready')feeds.set(id,elapsed);
   const eat=feeds.get(id);if(typeof eat==='number'&&elapsed-eat>=1000)feeds.delete(id);
   if(!stop&&eligible&&onscreen&&(a.status==='hungry'&&walkClip?.status==='ready'||feeds.has(id)&&eatClip?.status==='ready'))canRun=true;
   const sample=!stop&&eligible&&onscreen&&count<cap?animalAnimationSample({id,status:a.status,elapsed,eatStarted:feeds.get(id)??null}):null;
   const ready=sample&&clipFor(a.configId,sample.action)?.status==='ready';
   const frame=ready&&resolveAnimalAnimationFrame(sample.action,sample.frame,a.configId);
   if(frame)count++;paint(el,frame||fallback,Boolean(frame),fallback);
  }}finally{drawing=false;}
 }
 function refreshVisibility(){const clip=(root.closest?.('.fw-map')||root).getBoundingClientRect?.();for(const el of nodes)visibility.set(el,visible(el,clip));lastVisibility=elapsed;}
 function schedule(){if(!canRun)last=null;if(!dead&&canRun&&raf===null&&!blocked())raf=requestFrame?.(tick)??null;}
 function tick(now){raf=null;if(dead)return;const stop=blocked();if(last!==null&&!stop&&!wasBlocked)elapsed+=Math.max(0,Math.min(100,now-last));last=now;wasBlocked=stop;
  if(stop){draw();last=null;return;}
  if(elapsed-lastVisibility>=250)refreshVisibility();
  const bucket=Math.floor(elapsed*12/1000);if(bucket!==lastDraw){draw();lastDraw=bucket;}
  schedule();
 }
 // prepareSync reads layout only; commitSync writes sprites. Call consecutively
 // in the same task when coordinating with other presentation controllers.
 function prepareSync(){if(dead)return;nodes=Array.from(root?.querySelectorAll?.('[data-animal][data-shelter]')||[]);const ids=new Set(nodes.map(n=>n.dataset.animal));for(const id of feeds.keys())if(!ids.has(id))feeds.delete(id);refreshVisibility();}
 function commitSync(){if(dead)return;draw();schedule();}
 function sync(){prepareSync();commitSync();}
 function visibilityChanged(){if(dead)return;if(blocked()){if(raf!==null)cancelFrame?.(raf);raf=null;last=null;wasBlocked=true;draw();}else sync();}
 doc?.addEventListener?.('visibilitychange',visibilityChanged);media?.addEventListener?.('change',visibilityChanged);
 function playEat(ids){if(dead||blocked())return;for(const id of ids||[]){if(nodes.some(n=>n.dataset.animal===id))feeds.set(id,null);}draw();schedule();}
 function destroy(){if(dead)return;dead=true;for(const clip of subscriptions)clip.listeners.delete(clipSettled);subscriptions.clear();doc?.removeEventListener?.('visibilitychange',visibilityChanged);media?.removeEventListener?.('change',visibilityChanged);if(raf!==null)cancelFrame?.(raf);raf=null;for(const el of nodes){const entry=getAnimal(el.dataset.animal,el.dataset.shelter);if(entry?.animal)paint(el,getStaticArt(entry.animal,entry.shelter),false);}nodes=[];feeds.clear();live.clear();}
 return {sync,prepareSync,commitSync,playEat,getArt:(id,fallback)=>live.get(id)||fallback,destroy};
}
