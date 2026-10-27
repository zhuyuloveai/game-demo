/** Presentation-only chicken frames. Never writes animals, production or world positions. */
import {ANIMAL_ANIMATION_METADATA} from './farm-runtime-animal-animation-metadata.mjs';
export {ANIMAL_ANIMATION_METADATA};
export const ANIMAL_ANIMATION_FPS=12;
export const ANIMAL_ANIMATION_MAX_VISIBLE=12;
const descriptors=new Map();
export function resolveAnimalAnimationFrame(action,index){
 const key=`${action}/${String(index).padStart(2,'0')}`,data=ANIMAL_ANIMATION_METADATA[key];
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
 const media=matchMedia?.('(prefers-reduced-motion: reduce)'),feeds=new Map(),live=new Map(),loaded=new Set(),failed=new Set();
 let nodes=[],elapsed=0,last=null,raf=null,dead=false,wasBlocked=true,lastDraw=-Infinity,lastVisibility=-Infinity,canRun=false;
 const visibility=new WeakMap(),painted=new WeakMap();
 const cap=Math.max(0,Math.min(ANIMAL_ANIMATION_MAX_VISIBLE,Math.floor(maxVisible)||0));
 const blocked=()=>Boolean(doc?.hidden||media?.matches||isReduced()||isPaused()||root?.closest?.('[inert]'));
 // Decode once, not once per animal/frame. A failed/pending asset keeps the state PNG.
 for(const key of Object.keys(ANIMAL_ANIMATION_METADATA)){
  if(!ImageCtor){loaded.add(key);continue;}
  const img=new ImageCtor();img.onload=()=>{if(!dead)loaded.add(key);};img.onerror=()=>failed.add(key);img.src=resolveAnimalAnimationFrame(...key.split('/').map((v,i)=>i?Number(v):v)).src;
 }
 function visible(el){const r=el.getBoundingClientRect?.();if(!r)return true;const clip=(root.closest?.('.fw-map')||root).getBoundingClientRect?.();
  const win=doc?.defaultView;return r.width>0&&r.height>0&&r.right>Math.max(0,clip?.left??0)&&r.bottom>Math.max(0,clip?.top??0)&&r.left<Math.min(win?.innerWidth??Infinity,clip?.right??Infinity)&&r.top<Math.min(win?.innerHeight??Infinity,clip?.bottom??Infinity);}
 function paint(el,art,active){const image=el.querySelector?.('.fw-animal-art image');if(!image||!art)return;
  if(painted.get(image)!==art.src){image.setAttribute('href',art.src);painted.set(image,art.src);}
  if(active){el.dataset.fwFrameRunning='true';el.dataset.fwFrameAction=art.action;el.dataset.fwFrame=String(art.frame);live.set(el.dataset.animal,art);}
  else{delete el.dataset.fwFrameRunning;delete el.dataset.fwFrameAction;delete el.dataset.fwFrame;live.delete(el.dataset.animal);}}
 function draw(){let count=0;const stop=blocked();live.clear();canRun=false;
  for(const el of nodes){const id=el.dataset.animal,entry=getAnimal(id,el.dataset.shelter),a=entry?.animal,s=entry?.shelter;if(!a)continue;
   const fallback=getStaticArt(a,s),eligible=a.configId==='chicken'&&!s?.skinId&&fallback?.shelterLayered;
   const onscreen=visibility.get(el);if(!onscreen)feeds.delete(id);
   const eat=feeds.get(id);if(eat!==undefined&&elapsed-eat>=1000)feeds.delete(id);
   if(!stop&&eligible&&onscreen&&(a.status==='hungry'||feeds.has(id)))canRun=true;
   const sample=!stop&&eligible&&onscreen&&count<cap?animalAnimationSample({id,status:a.status,elapsed,eatStarted:feeds.get(id)??null}):null;
   const frame=sample&&resolveAnimalAnimationFrame(sample.action,sample.frame),active=frame&&loaded.has(frame.key)&&!failed.has(frame.key);
   if(active)count++;paint(el,active?frame:fallback,Boolean(active));
  }
 }
 function refreshVisibility(){for(const el of nodes)visibility.set(el,visible(el));lastVisibility=elapsed;}
 function schedule(){if(!canRun)last=null;if(!dead&&canRun&&raf===null&&!blocked())raf=requestFrame?.(tick)??null;}
 function tick(now){raf=null;if(dead)return;const stop=blocked();if(last!==null&&!stop&&!wasBlocked)elapsed+=Math.max(0,Math.min(100,now-last));last=now;wasBlocked=stop;
  if(stop){draw();last=null;return;}
  if(elapsed-lastVisibility>=250)refreshVisibility();
  const bucket=Math.floor(elapsed*12/1000);if(bucket!==lastDraw){draw();lastDraw=bucket;}
  schedule();
 }
 function sync(){if(dead)return;nodes=Array.from(root?.querySelectorAll?.('[data-animal][data-shelter]')||[]);const ids=new Set(nodes.map(n=>n.dataset.animal));for(const id of feeds.keys())if(!ids.has(id))feeds.delete(id);refreshVisibility();draw();schedule();}
 function visibilityChanged(){if(dead)return;if(blocked()){if(raf!==null)cancelFrame?.(raf);raf=null;last=null;wasBlocked=true;draw();}else sync();}
 doc?.addEventListener?.('visibilitychange',visibilityChanged);media?.addEventListener?.('change',visibilityChanged);
 function playEat(ids){if(dead||blocked())return;for(const id of ids||[]){if(nodes.some(n=>n.dataset.animal===id))feeds.set(id,elapsed);}draw();schedule();}
 function destroy(){if(dead)return;dead=true;doc?.removeEventListener?.('visibilitychange',visibilityChanged);media?.removeEventListener?.('change',visibilityChanged);if(raf!==null)cancelFrame?.(raf);raf=null;for(const el of nodes){const entry=getAnimal(el.dataset.animal,el.dataset.shelter);if(entry?.animal)paint(el,getStaticArt(entry.animal,entry.shelter),false);}nodes=[];feeds.clear();live.clear();}
 return {sync,playEat,getArt:(id,fallback)=>live.get(id)||fallback,destroy};
}
