import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveMachinePartArt,machineIsProducing,MACHINE_PART_METADATA} from '../farm-runtime-machines.mjs';
import {machinePartPhase,machinePartTransform,createMachineAnimationController} from '../farm-machine-animation.mjs';
import {resolveWorldArt,renderRuntimeArt,runtimeArtHit,RUNTIME_ART_METADATA} from '../farm-runtime-art.mjs';
import {anchoredArtRect,compactTrayPlacement} from '../farm-art-presentation.mjs';
const base=new URL('../',import.meta.url),machine=(id='m',configId='feed_mill_1')=>({id,kind:'machine',configId,built:true,queue:[{startAt:0,readyAt:100000}],completed:[]});
function fixture(entities=[machine()],options={}){
 let pending=null,paused=false,reduced=false,now=1000,writes=0,reads=0,cancelled=0;
 const bounds={left:0,top:0,right:200,bottom:180,width:200,height:180},events=new Map(),mediaEvents=new Map(),media={matches:false,addEventListener:(k,fn)=>mediaEvents.set(k,fn),removeEventListener:k=>mediaEvents.delete(k)};
 class Style extends Map{getPropertyValue(k){return this.get(k)||'';}setProperty(k,v){writes++;this.set(k,v);}}
 const nodes=entities.map(e=>{const part={style:new Style()},owner={dataset:{entity:e.id}};return {part,style:new Style(),dataset:{},bounds:{...bounds},querySelector:()=>part,closest:s=>s==='[data-entity]'?owner:null,getBoundingClientRect(){reads++;return this.bounds;}};});
 const doc={hidden:false,defaultView:{innerWidth:1000,innerHeight:1000},addEventListener:(k,fn)=>events.set(k,fn),removeEventListener:k=>events.delete(k)};
 const root={ownerDocument:doc,closest:()=>null,querySelectorAll:()=>nodes,getBoundingClientRect:()=>bounds};
 const c=createMachineAnimationController({root,getEntity:id=>entities.find(e=>e.id===id),getNow:()=>now,isPaused:()=>paused,isReduced:()=>reduced,Image:null,matchMedia:()=>media,requestFrame:fn=>(pending=fn,1),cancelFrame:()=>{pending=null;cancelled++;},...options});
 return {c,nodes,entities,doc,media,events,mediaEvents,setNow:v=>now=v,pause:v=>paused=v,reduce:v=>reduced=v,tick:t=>{const fn=pending;pending=null;fn?.(t);},get pending(){return pending;},get writes(){return writes;},get reads(){return reads;},get cancelled(){return cancelled;}};
}
test('only five approved existing mechanisms resolve, feed mills share exact descriptors',()=>{
 const a=resolveMachinePartArt(machine());assert.equal(a,resolveMachinePartArt(machine('b','feed_mill_2')));assert.equal(a,resolveWorldArt(machine()));
 for(const id of ['loom','juice_press','sewing_machine'])assert.ok(resolveMachinePartArt(machine('m',id)));
 assert.equal(resolveMachinePartArt({kind:'decoration',configId:'windmill'}).id,'windmill');
 for(const id of ['decor_windmill','new_windmill','bakery'])assert.equal(resolveMachinePartArt({kind:'decoration',configId:id}),null);
 assert.equal(resolveMachinePartArt(machine('m','bakery')),null);
});
test('runtime contains fourteen hashed independent PNGs, no diagnostic frames or source documents',()=>{
 const manifest=JSON.parse(readFileSync(new URL('assets/farm-runtime/machine-parts-v1/manifest.json',base)));
 assert.equal(manifest.assets.length,14);assert.equal(Object.keys(MACHINE_PART_METADATA).length,5);
 for(const a of manifest.assets){assert.ok(existsSync(new URL(a.path,base)));assert.doesNotMatch(a.path,/previews|phase-|\.ora|\.svg/);const data=readFileSync(new URL(a.path,base));assert.equal(createHash('sha256').update(data).digest('hex'),a.sha256);assert.deepEqual([...data.subarray(0,8)],[137,80,78,71,13,10,26,10]);}
});
test('full-canvas art preserves previous world anchor, output tray and reflected registration',()=>{
 for(const [id,a] of Object.entries(MACHINE_PART_METADATA))for(const rotation of [0,270]){
  const e={...machine('m',id),x:20,y:20,w:2,h:2,rotation},old=RUNTIME_ART_METADATA[a.legacyKey],legacy={...old,aspect:(old.bounds[2]-old.bounds[0])/(old.bounds[3]-old.bounds[1])};
  const fresh={...a,aspect:800/750},r=anchoredArtRect(e,e,fresh),previous=anchoredArtRect(e,e,legacy);assert.deepEqual(r.foot,previous.foot);
  const support={x:r.left+r.width*(rotation===270?1-a.anchor[0]:a.anchor[0]),y:r.top+r.height*a.anchor[1]};assert.deepEqual(support,r.foot);
  if(a.outputAnchor){const t=compactTrayPlacement(r,fresh,1,rotation===270),p=compactTrayPlacement(previous,legacy,1,rotation===270);assert.ok(Math.abs(t.x-p.x)<.01);assert.ok(Math.abs(t.y-p.y)<.02);}
  assert.equal(runtimeArtHit(fresh,0,0),false);assert.equal(runtimeArtHit(fresh,.99,.99),false);
 }
});
test('rotors rotate in their own plane inside a stationary projection and only local parts transform',()=>{
 const art=resolveMachinePartArt(machine()),html=renderRuntimeArt(art,{mirror:true,alt:'<wheel>'});
 assert.match(html,/translate\(800 0\) scale\(-1 1\)/);assert.match(html,/translate\(525 421.5\) matrix\(0.82 -0.3 0.1 0.99 0 0\)"><g data-fw-part=/);
 assert.match(html,/data-render-key="mechanism:feed-mill"/);assert.match(html,/transform:var\(--fw-part-transform,rotate\(0deg\)\)/);assert.match(html,/&lt;wheel&gt;/);assert.equal((html.match(/data-fw-part=/g)||[]).length,1);
 assert.ok(html.indexOf(art.layers.base)<html.indexOf(art.layers.moving));assert.ok(html.indexOf(art.layers.moving)<html.indexOf(art.layers.foreground));assert.doesNotMatch(html,/phase-|<canvas/);
});
test('analytic transforms obey authored range, loop seam and slow windmill cycle',()=>{
 const art=id=>Object.values(MACHINE_PART_METADATA).find(a=>a.id===id);
 assert.equal(machinePartTransform(art('feed-mill'),.25),'rotate(90deg)');assert.equal(machinePartTransform(art('feed-mill'),1),'rotate(0deg)');
 assert.equal(machinePartTransform(art('loom'),.25),'translate(52.5px,26.25px)');assert.equal(machinePartTransform(art('loom'),.75),'translate(-52.5px,-26.25px)');
 assert.equal(machinePartTransform(art('juice-press'),.5),'translate(0px,10px)');assert.equal(machinePartTransform(art('sewing-machine'),.5),'translate(0px,-14px)');
 for(const a of Object.values(MACHINE_PART_METADATA))assert.equal(machinePartTransform(a,0),machinePartTransform(a,1));
 assert.equal(art('windmill').motion.cycleMs,8500);assert.equal(machinePartPhase('a'),machinePartPhase('a'));assert.notEqual(machinePartPhase('a'),machinePartPhase('b'));
});
test('running is exact current production, never just any queue or completed output',()=>{
 const e=machine();assert.ok(machineIsProducing(e,1000));
 for(const changed of [{built:false},{stored:true},{queue:[]},{queue:[{startAt:null,readyAt:null}]},{queue:[{startAt:2000,readyAt:3000}]},{queue:[{startAt:0,readyAt:1000}]},{queue:[],completed:[{id:'done'}]}])assert.equal(machineIsProducing({...e,...changed},1000),false);
});
test('continuous part transform survives sync, idle resets once and never mutates economics',()=>{
 const f=fixture(),before=structuredClone(f.entities);f.c.sync();const part=f.nodes[0].part;assert.equal(f.nodes[0].dataset.fwFrameMachineRunning,'true');f.tick(0);f.tick(40);const transformed=part.style.get('--fw-part-transform');assert.notEqual(transformed,'rotate(0deg)');
 f.c.sync();assert.equal(f.nodes[0].part,part);assert.equal(part.style.get('--fw-part-transform'),transformed);assert.deepEqual(f.entities,before);
 f.entities[0].queue=[];f.c.sync();assert.equal(part.style.get('--fw-part-transform'),'rotate(0deg)');assert.equal(f.pending,null);const writes=f.writes;f.c.sync();assert.equal(f.writes,writes);f.c.destroy();
});
test('clock-only production expiry stops even without a scene rerender',()=>{
 const f=fixture();f.c.sync();f.tick(0);f.tick(40);f.setNow(100000);f.tick(80);assert.equal(f.nodes[0].part.style.get('--fw-part-transform'),'rotate(0deg)');assert.equal(f.nodes[0].dataset.fwFrameMachineRunning,'false');assert.equal(f.pending,null);f.c.destroy();
});
test('pause/offscreen freeze without catch-up; both reduced-motion settings use exact rest pose',()=>{
 const f=fixture();f.c.sync();f.tick(0);f.tick(40);const pose=f.nodes[0].part.style.get('--fw-part-transform');
 f.pause(true);f.tick(80);assert.equal(f.nodes[0].part.style.get('--fw-part-transform'),pose);assert.equal(f.pending,null);f.pause(false);f.c.sync();f.tick(5000);assert.equal(f.nodes[0].part.style.get('--fw-part-transform'),pose);
 f.nodes[0].bounds.left=2000;f.c.sync();assert.equal(f.pending,null);assert.equal(f.nodes[0].part.style.get('--fw-part-transform'),pose);
 f.reduce(true);f.c.sync();assert.equal(f.nodes[0].part.style.get('--fw-part-transform'),'rotate(0deg)');f.reduce(false);f.nodes[0].bounds.left=0;f.c.sync();f.tick(5100);f.tick(5140);
 f.media.matches=true;f.mediaEvents.get('change')();assert.equal(f.nodes[0].part.style.get('--fw-part-transform'),'rotate(0deg)');assert.equal(f.pending,null);f.c.destroy();assert.equal(f.events.size,0);assert.equal(f.mediaEvents.size,0);
});
test('one visible budget: at most four machines and two windmills, no offscreen work',()=>{
 const rows=Array.from({length:20},(_,i)=>machine('m'+i));rows.push(...Array.from({length:10},(_,i)=>({id:'w'+i,kind:'decoration',configId:'windmill'})));
 const f=fixture(rows);f.nodes[0].bounds.left=2000;f.c.sync();assert.equal(f.nodes.filter(n=>n.dataset.fwFrameMachineRunning==='true').length,6);assert.equal(f.nodes[0].dataset.fwFrameMachineRunning,'false');
 f.tick(0);const writes=f.writes;for(let t=16;t<1000;t+=16)f.tick(t);assert.ok(f.writes-writes<=6*30,`writes ${f.writes-writes}`);assert.ok(f.writes-writes>=6*28,'continuous transforms do not drift down to 20fps');assert.ok(f.reads<=rows.length*5,`reads ${f.reads}`);f.c.destroy();assert.equal(f.pending,null);
});
test('cold/partial/error layers keep fallback, atomic decode switch never swaps image URLs',()=>{
 const images=[];class DelayedImage{constructor(){images.push(this);}set src(v){this.url=v;}}
 const f=fixture([machine()],{Image:DelayedImage});f.c.sync();assert.equal(images.length,3);assert.equal(f.pending,null);assert.equal(f.nodes[0].style.get('--fw-part-fallback'),'visible');
 images[2].onload();images[0].onload();assert.equal(f.pending,null);assert.equal(f.nodes[0].style.get('--fw-part-fallback'),'visible');
 images[1].onload();assert.equal(f.nodes[0].style.get('--fw-part-fallback'),'hidden');assert.equal(f.nodes[0].style.get('--fw-part-visibility'),'visible');assert.ok(f.pending);assert.equal(images.length,3);f.c.destroy();
 class FailedImage{set src(v){this.onerror();}}
 const failed=fixture([machine()],{Image:FailedImage});failed.c.sync();assert.equal(failed.pending,null);assert.equal(failed.nodes[0].style.get('--fw-part-fallback'),'visible');failed.c.destroy();
});
test('hidden tab cancels work and decode settlement cannot resurrect a destroyed controller',()=>{
 const images=[];class DelayedImage{constructor(){images.push(this);}set src(v){this.url=v;}}
 const f=fixture([machine()],{Image:DelayedImage});f.c.sync();f.c.destroy();const writes=f.writes;for(const i of images)i.onload?.();assert.equal(f.writes,writes);assert.equal(f.pending,null);
 const visible=fixture();visible.c.sync();visible.doc.hidden=true;visible.events.get('visibilitychange')();assert.equal(visible.pending,null);visible.doc.hidden=false;visible.events.get('visibilitychange')();assert.ok(visible.pending);visible.c.destroy();
});
test('world lifecycle synchronizes both controllers, preserves local CSS transforms and avoids whole-machine sway',()=>{
 const world=readFileSync(new URL('farm-scene-world.mjs',base),'utf8');
 assert.match(world,/machineAnimation\.prepareSync\(\)/);assert.match(world,/machineAnimation\.commitSync\(\)/);assert.match(world,/machineAnimation\.destroy\(\)/);
 assert.match(world,/!resolveMachinePartArt\(e\)&&machineIsProducing\(e,now\)/);
});

for(const outcome of ['ready','failed'])test(`same entity ID changing mechanism restores fallback until replacement is ${outcome}`,()=>{
 const images=[];class DelayedImage{constructor(){images.push(this);}set src(v){this.url=v;}}
 const f=fixture([machine()],{Image:DelayedImage});f.c.sync();for(const image of images.slice())image.onload();f.tick(0);f.tick(40);
 const svg=f.nodes[0],part=svg.part;assert.equal(svg.style.get('--fw-part-visibility'),'visible');assert.equal(svg.style.get('--fw-part-fallback'),'hidden');assert.notEqual(part.style.get('--fw-part-transform'),'rotate(0deg)');
 // Worst-case adapter retains the SVG/part and all previous controller CSS.
 // The real renderer also keys by mechanism to prevent cross-art DOM reuse.
 f.entities[0].configId='loom';f.c.sync();assert.equal(f.nodes[0],svg);assert.equal(images.length,6);
 assert.equal(svg.style.get('--fw-part-visibility'),'hidden');assert.equal(svg.style.get('--fw-part-fallback'),'visible');assert.equal(part.style.get('--fw-part-transform'),'translate(0px,0px)');assert.equal(f.pending,null);
 const replacement=images.slice(3);replacement[0].onload();replacement[1].onload();f.c.sync();
 assert.equal(svg.style.get('--fw-part-visibility'),'hidden');assert.equal(svg.style.get('--fw-part-fallback'),'visible');assert.equal(f.pending,null);
 if(outcome==='ready'){
  replacement[2].onload();assert.equal(svg.style.get('--fw-part-visibility'),'visible');assert.equal(svg.style.get('--fw-part-fallback'),'hidden');assert.equal(part.style.get('--fw-part-transform'),'translate(0px,0px)');assert.ok(f.pending);
 }else{
  replacement[2].onerror();f.c.sync();assert.equal(svg.style.get('--fw-part-visibility'),'hidden');assert.equal(svg.style.get('--fw-part-fallback'),'visible');assert.equal(f.pending,null);
 }
 const html=renderRuntimeArt(resolveMachinePartArt(f.entities[0]));assert.match(html,/data-render-key="mechanism:loom"/);assert.doesNotMatch(html,/data-render-key="mechanism:feed-mill"/);f.c.destroy();
});
