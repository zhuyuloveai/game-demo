/** Transform real parts, never a whole projected machine or a diagnostic sprite sheet. */
import {resolveMachinePartArt,machineIsProducing} from './farm-runtime-machines.mjs';
export const MACHINE_PART_MAX_VISIBLE=6;
export const MACHINE_PART_FPS=30;
export function machinePartPhase(id){let hash=2166136261;for(const c of String(id))hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0)/4294967296;}
const number=n=>Math.abs(n)<.0001?'0':String(Number(n.toFixed(4)));
/** Travel is in source pixels; all approved layers use a shared 0.5 scale. */
export function machinePartTransform(art,phase){
 const p=((phase%1)+1)%1,m=art.motion;
 if(m.type==='rotor')return `rotate(${number(p*360)}deg)`;
 const factor=m.type==='shuttle'?Math.sin(p*Math.PI*2)*.25:(.5-.5*Math.cos(p*Math.PI*2))*.5;
 const [x,y]=m.travelSourcePx;return `translate(${number(x*factor)}px,${number(y*factor)}px)`;
}
const imageCaches=new WeakMap();
export function createMachineAnimationController({root,getEntity,getNow=()=>0,isPaused=()=>false,isReduced=()=>false,maxVisible=MACHINE_PART_MAX_VISIBLE,
 document:doc=root?.ownerDocument,requestFrame=doc?.defaultView?.requestAnimationFrame?.bind(doc.defaultView)||globalThis.requestAnimationFrame?.bind(globalThis),
 cancelFrame=doc?.defaultView?.cancelAnimationFrame?.bind(doc.defaultView)||globalThis.cancelAnimationFrame?.bind(globalThis),
 matchMedia=doc?.defaultView?.matchMedia?.bind(doc.defaultView)||globalThis.matchMedia?.bind(globalThis),Image:ImageCtor=doc?.defaultView?.Image||globalThis.Image}={}){
 const media=matchMedia?.('(prefers-reduced-motion: reduce)'),cache=ImageCtor?(imageCaches.get(ImageCtor)||new Map()):new Map(),subscriptions=new Set(),records=new Map();
 if(ImageCtor&&!imageCaches.has(ImageCtor))imageCaches.set(ImageCtor,cache);
 const cap=Math.max(0,Math.min(MACHINE_PART_MAX_VISIBLE,Math.floor(maxVisible)||0));
 let nodes=[],raf=null,last=null,dead=false,drawing=false,active=false,clock=0,lastVisibility=-Infinity,lastPaint=-Infinity,lastBucket=-1;
 const reduced=()=>Boolean(media?.matches||isReduced());
 const blocked=()=>Boolean(doc?.hidden||isPaused()||root?.closest?.('[inert]'));
 function assetSettled(){if(dead||drawing)return;draw();schedule();}
 function requestArt(art){
  let clip=cache.get(art.id);if(clip)return clip;
  clip={status:ImageCtor?'pending':'ready',remaining:Object.keys(art.layers).length,images:[],listeners:new Set()};cache.set(art.id,clip);
  if(!ImageCtor)return clip;
  clip.listeners.add(assetSettled);subscriptions.add(clip);
  for(const src of Object.values(art.layers)){
   const image=new ImageCtor();clip.images.push(image);let settled=false;
   const finish=ok=>{if(settled)return;settled=true;image.onload=null;image.onerror=null;if(clip.status!=='pending')return;
    if(!ok)clip.status='failed';else if(--clip.remaining===0)clip.status='ready';
    if(clip.status!=='pending'){for(const notify of [...clip.listeners])notify();clip.listeners.clear();}
   };
   image.onload=()=>{if(typeof image.decode==='function')Promise.resolve().then(()=>image.decode()).then(()=>finish(true),()=>finish(false));else finish(true);};image.onerror=()=>finish(false);image.src=src;
  }
  return clip;
 }
 function setStyle(node,name,value){if(node?.style?.getPropertyValue?.(name)!==value)node?.style?.setProperty?.(name,value);}
 function draw(delta=0){if(dead)return;drawing=true;active=false;let count=0,machines=0,windmills=0;const stop=blocked(),reduce=reduced();
  try{for(const record of nodes){const {svg,part,id,art}=record,e=getEntity(id);if(!e)continue;
   let clip=cache.get(art.id);
   // Decode only visible types; pending/error types retain their old static art.
   if(record.visible&&!doc?.hidden){clip=requestArt(art);if(clip.status==='pending'){clip.listeners.add(assetSettled);subscriptions.add(clip);}}
   // A keyed entity can change mechanism after save import. Do not let an old
   // ready mechanism's retained CSS expose incomplete/failed replacement layers.
   const ready=clip?.status==='ready';
   setStyle(svg,'--fw-part-visibility',ready?'visible':'hidden');
   setStyle(svg,'--fw-part-fallback',ready?'hidden':'visible');
   const windmill=e.kind==='decoration',working=windmill?!e.stored:machineIsProducing(e,getNow());
   const run=Boolean(working&&!stop&&!reduce&&record.visible&&clip?.status==='ready'&&count<cap&&(windmill?windmills<2:machines<4));
   if(!working||reduce)record.elapsed=0;
   if(run){count++;windmill?windmills++:machines++;active=true;record.elapsed+=delta;}
   // Temporary pauses keep their current transform, with no catch-up on resume.
   // Idle/reduced restore the authored rest pose and do not animate that change.
   const phase=(!working||reduce)?0:record.elapsed/art.motion.cycleMs+(windmill?machinePartPhase(id):0);
   const transform=machinePartTransform(art,phase);setStyle(part,'--fw-part-transform',transform);
   svg.dataset.fwFrameMachineRunning=String(run);
  }}finally{drawing=false;}
 }
 function refreshVisibility(){const clip=(root?.closest?.('.fw-map')||root)?.getBoundingClientRect?.(),win=doc?.defaultView;
  for(const r of nodes){const b=r.svg.getBoundingClientRect?.();r.visible=!r.svg.closest?.('.fw-occluder-faded,.fw-muted-neighbor')&&(!b||(b.width>0&&b.height>0&&b.right>Math.max(0,clip?.left??0)&&b.bottom>Math.max(0,clip?.top??0)&&b.left<Math.min(win?.innerWidth??Infinity,clip?.right??Infinity)&&b.top<Math.min(win?.innerHeight??Infinity,clip?.bottom??Infinity)));}
  lastVisibility=clock;
 }
 function schedule(){if(dead||!active||blocked()||reduced()){if(raf!==null)cancelFrame?.(raf);raf=null;last=null;return;}if(raf===null)raf=requestFrame?.(tick)??null;}
 function tick(now){raf=null;if(dead)return;const delta=last===null?0:Math.max(0,Math.min(100,now-last));last=now;
  if(blocked()||reduced()){draw();schedule();return;}
  clock+=delta;if(clock-lastVisibility>=250)refreshVisibility();
  // RAF samples continuous transforms at <=30fps; the 12 art phases are never loaded.
  const bucket=Math.floor(clock*MACHINE_PART_FPS/1000);
  if(bucket!==lastBucket){const elapsed=lastPaint===-Infinity?0:clock-lastPaint;draw(elapsed);lastPaint=clock;lastBucket=bucket;}
  schedule();
 }
 function prepareSync(){if(dead)return;const seen=new Set();nodes=[];
  for(const svg of root?.querySelectorAll?.('[data-fw-mechanism]')||[]){const id=svg.closest?.('[data-entity]')?.dataset.entity,e=getEntity(id),art=resolveMachinePartArt(e),part=svg.querySelector?.('[data-fw-part]');if(!art||!part)continue;
   const old=records.get(id),record={id,art,svg,part,visible:false,elapsed:old?.art.id===art.id?old.elapsed:0};records.set(id,record);nodes.push(record);seen.add(id);
  }
  for(const id of records.keys())if(!seen.has(id))records.delete(id);refreshVisibility();
 }
 function commitSync(){if(dead)return;draw();schedule();}
 function sync(){prepareSync();commitSync();}
 function visibilityChanged(){if(dead)return;if(doc?.hidden||reduced()){draw();schedule();}else sync();}
 doc?.addEventListener?.('visibilitychange',visibilityChanged);media?.addEventListener?.('change',visibilityChanged);
 function destroy(){if(dead)return;dead=true;if(raf!==null)cancelFrame?.(raf);raf=null;for(const clip of subscriptions)clip.listeners.delete(assetSettled);subscriptions.clear();doc?.removeEventListener?.('visibilitychange',visibilityChanged);media?.removeEventListener?.('change',visibilityChanged);nodes=[];records.clear();}
 return {sync,prepareSync,commitSync,destroy};
}
