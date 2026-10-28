import test from 'node:test';
import assert from 'node:assert/strict';
import {coopCommand,coopCrossedTargets} from '../farm-coop-panel.mjs';
import {createFarm,executeFarm,advanceFarm} from '../farm-core.mjs';
const fresh=()=>createFarm(0);
test('coop only targets one chicken in the selected shelter and matching live state',()=>{
 const s=fresh(),e=s.entities.find(e=>e.kind==='shelter'&&e.configId==='chicken'),a=e.animals[0];
 assert.deepEqual(coopCommand(s,e.id,a.id,'feed'),{type:'feed',entityId:e.id,animalIds:[a.id]});
 assert.equal(coopCommand(s,'other',a.id,'feed'),null);assert.equal(coopCommand(s,e.id,'absent','feed'),null);assert.equal(coopCommand(s,e.id,a.id,'collect'),null);assert.equal(coopCommand(s,e.id,a.id,'invalid'),null);
});
test('feeding is durable per bird before release; stopping does not undo prior successes',()=>{
 let s=fresh();const e=s.entities.find(e=>e.kind==='shelter'&&e.configId==='chicken'),before=s.inventory.chicken_feed;
 const r=executeFarm(s,coopCommand(s,e.id,e.animals[0].id,'feed'),0);s=r.state;
 assert.equal(s.inventory.chicken_feed,before-1);assert.equal(s.entities.find(x=>x.id===e.id).animals[0].status,'producing');
 assert.equal(coopCommand(s,e.id,e.animals[0].id,'feed'),null);assert.equal(s.entities.find(x=>x.id===e.id).animals[1].status,'hungry');
});
test('ready egg collection returns exact successful bird event and becomes hungry',()=>{
 let s=fresh();const e=s.entities.find(e=>e.kind==='shelter'&&e.configId==='chicken'),a=e.animals[0];
 s=executeFarm(s,coopCommand(s,e.id,a.id,'feed'),0).state;s=advanceFarm(s,1200000).state;
 const before=s.inventory.egg||0,r=executeFarm(s,coopCommand(s,e.id,a.id,'collect'),s.now);s=r.state;
 assert.equal(s.inventory.egg,before+1);assert.ok(r.delta.events.some(e=>e.id===a.id));assert.equal(coopCommand(s,e.id,a.id,'collect'),null);
});
test('fast diagonal sweep intersects visible target boxes in path order',()=>{
 const targets=[{id:'second',left:20,right:30,top:20,bottom:30},{id:'first',left:0,right:10,top:0,bottom:10}];
 assert.deepEqual(coopCrossedTargets({x:-5,y:-5},{x:40,y:40},targets).map(t=>t.id),['first','second']);
 assert.deepEqual(coopCrossedTargets({x:11,y:11},{x:19,y:19},targets),[]);
 assert.deepEqual(coopCrossedTargets({x:NaN,y:0},{x:10,y:10},targets),[]);
});
import {growthFixture} from './farm-growth-fixtures.mjs';
import {ANIMALS} from '../farm-config.mjs';
test('all five animal farms retain their real feed/product and per-pen scope',()=>{
 const fixture=growthFixture(3),pens=fixture.entities.filter(e=>e.kind==='shelter');assert.equal(new Set(pens.map(e=>e.configId)).size,5);
 for(const e of pens){let s=structuredClone(fixture);const cfg=ANIMALS[e.configId],a=s.entities.find(p=>p.id===e.id).animals[0];a.status='hungry';a.readyAt=null;s.inventory[cfg.feedItem]=20;
  const feed=coopCommand(s,e.id,a.id,'feed');assert.equal(feed.animalIds.length,1);const fed=executeFarm(s,feed,s.now);assert.equal(fed.state.inventory[cfg.feedItem],19);
  s=advanceFarm(fed.state,s.now+cfg.durationMs).state;const before=s.inventory[cfg.product]||0,r=executeFarm(s,coopCommand(s,e.id,a.id,'collect'),s.now);assert.ok(r.state.inventory[cfg.product]>before);assert.ok(r.delta.events.some(v=>v.id===a.id));
  assert.equal(coopCommand(s,pens.find(p=>p.id!==e.id).id,a.id,'collect'),null);
 }
});
import {coopBatchCommand} from '../farm-coop-panel.mjs';
test('one pointer event batches crossed animals once with ordered partial success',()=>{
 const s=fresh(),e=s.entities.find(e=>e.kind==='shelter'&&e.configId==='chicken');s.inventory.chicken_feed=1;
 const ids=e.animals.map(a=>a.id),command=coopBatchCommand(s,e.id,[ids[0],ids[0],ids[1],ids[2]],'feed');
 assert.deepEqual(command.animalIds,ids);const result=executeFarm(s,command,s.now);
 assert.equal(result.delta.events.length,1);assert.equal(result.skipped.length,2);assert.equal(result.state.inventory.chicken_feed,0);
 assert.equal(result.state.entities.find(p=>p.id===e.id).animals[0].status,'producing');
 assert.equal(coopBatchCommand(result.state,e.id,[ids[0]],'feed'),null);
});

import {mountChickenCoop} from '../farm-coop-panel.mjs';
import {createFarmStore,makeEnvelope} from '../farm-save.mjs';
import {readFileSync} from 'node:fs';

// Exercise the actual mounted event handlers and real durable store. This small
// DOM adapter models event capture/bubbling and deliberately replaces target
// buttons on repaint, so a gesture must be owned by the stable overlay. Native
// touch arbitration, computed CSS and retained DOM have a real-browser fixture.
function touchHarness({count=3,feedCount=count,ready=false,captureFails=false}={}){
 const box=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top});
 class Element {
  constructor(selector=''){this.selector=selector;this.dataset={};this.style={};this.listeners=new Map();this.attributes=new Map();this.disabled=false;this.hidden=false;this.isConnected=true;this.rect=box(0,0,390,600);const classes=new Set();this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)};}
  addEventListener(type,fn,options){const list=this.listeners.get(type)||[];list.push({fn,capture:options===true||!!options?.capture});this.listeners.set(type,list);}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(v=>v.fn!==fn));}
  emit(type,event,capture){for(const entry of [...this.listeners.get(type)||[]])if(capture===undefined||entry.capture===capture)entry.fn(event);}
  setAttribute(k,v){this.attributes.set(k,v);}getAttribute(k){return this.attributes.get(k)??null;}
  getBoundingClientRect(){return this.dataset.feedTarget||this.dataset.egg?{...this.rect,left:this.rect.left-rows.scrollLeft,right:this.rect.right-rows.scrollLeft}:this.rect;}focus(){doc.activeElement=this;}append(){}before(){}remove(){this.isConnected=false;}
  closest(selector){return selector===this.selector?this:null;}
  querySelector(selector){return parts.get(selector)||null;}
  querySelectorAll(selector){if(this===rows)return selector==='[data-feed-target]'?birds:selector==='[data-egg]'?eggs:[];return [];}
  set innerHTML(markup){this.markup=markup;if(this===rows){birds=[];eggs=[];let i=0;for(const match of markup.matchAll(/data-feed-target="([^"]+)"/g)){const el=new Element('[data-feed-target]');el.dataset.feedTarget=match[1];el.rect=box(20+i*105,100,100+i*105,180);birds.push(el);i++;}for(const match of markup.matchAll(/data-egg="([^"]+)"/g)){const el=new Element('[data-egg]');el.dataset.egg=match[1];const index=birds.findIndex(b=>b.dataset.feedTarget===match[1]);el.rect=box(30+index*105,190,90+index*105,250);eggs.push(el);}}}
  get innerHTML(){return this.markup||'';}
 }
 let birds=[],eggs=[],overlay,rows,releases=0,clears=0,interval,rafId=0;const parts=new Map(),captured=new Set(),frames=new Map();
 for(const selector of ['.fc-panel','.fc-animals','.fc-feed','.fc-cargo','.fc-status','.fc-cursor','.fc-close','[role=dialog]','h2','header p','.fc-instruction','[data-coop-action=adopt]','[data-coop-action=move-animal-panel]'])parts.set(selector,new Element(selector));
 rows=parts.get('.fc-animals');rows.rect=box(10,80,380,280);rows.scrollLeft=0;rows.clientWidth=370;rows.scrollWidth=Math.max(370,count*105+5);const feed=parts.get('.fc-feed');feed.rect=box(155,320,235,400);
 const doc=new Element(),win=new Element();doc.head=new Element();doc.body=new Element();doc.activeElement=new Element();doc.defaultView=win;doc.querySelector=()=>({});
 doc.createElement=tag=>{const el=new Element();if(tag==='section'){overlay=el;el.setPointerCapture=id=>{if(captureFails)throw Error('NotFoundError');captured.add(id);};el.hasPointerCapture=id=>captured.has(id);el.releasePointerCapture=id=>{captured.delete(id);releases++;el.emit('lostpointercapture',{pointerId:id});};}return el;};
 Object.assign(win,{requestAnimationFrame:fn=>{frames.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>frames.delete(id),matchMedia:()=>({matches:true,addEventListener(){},removeEventListener(){}}),setInterval:fn=>{interval=fn;return 1;},clearInterval(){}});
 let initial=createFarm(1000);if(count>3)initial=executeFarm(initial,{type:'buy',category:'animal',entityId:'shelter_chicken_1',quantity:count-3},initial.now).state;initial.inventory.chicken_feed=feedCount;const pen=initial.entities.find(e=>e.kind==='shelter'&&e.configId==='chicken'),ids=pen.animals.map(a=>a.id);
 if(ready){initial=executeFarm(initial,{type:'feed',entityId:pen.id},initial.now).state;initial=advanceFarm(initial,initial.now+ANIMALS.chicken.durationMs).state;}
 const key='coop-touch-test',disk=new Map([[key+':a',JSON.stringify(makeEnvelope(initial))],[key+':active','a']]),storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)},options={storage,key,locks:null,now:()=>initial.now,monotonicNow:()=>0};
 const store=createFarmStore(options),commands=[],root=new Element();root.inert=false;root.parentElement=new Element();root.ownerDocument=doc;
 const ctx={root,doc,win,config:{ANIMALS},get state(){return store.getState();},item:id=>`<img draggable="false" src="${id}.png">`,name:String,act(command){commands.push(command);return store.dispatch(command);},clearFeedback(){clears++;}};
 const mounted=mountChickenCoop(ctx,{entityId:pen.id});
 function fire(type,{target=overlay,x=60,y=140,id=1,primary=true,outside=false}={}){
  const event={type,target,clientX:x,clientY:y,pointerId:id,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,isPrimary:primary,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
  doc.emit(type,event,true);if(!outside){overlay.emit(type,event,true);overlay.emit(type,event,false);}doc.emit(type,event,false);return event;
 }
 return {doc,win,root,parts,commands,captured,fire,ids,get overlay(){return overlay;},get birds(){return birds;},get eggs(){return eggs;},get releases(){return releases;},get clears(){return clears;},get state(){return store.getState();},get feedCount(){return store.getState().inventory.chicken_feed;},get statuses(){return store.getState().entities.find(e=>e.id===pen.id).animals.map(a=>a.status);},get frames(){return frames.size;},frame(time){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time));},down:()=>fire('pointerdown',{target:feed,x:195,y:360}),tick:()=>interval(),destroy(){mounted.destroy();store.close();},reload(){const copy=createFarmStore(options);const state=copy.getState();copy.close();return state;}};
}

test('touch bag stroke commits before release in movement order, survives repaint, and never feeds twice',()=>{
 const h=touchHarness();try{
  assert.equal(h.down().defaultPrevented,true);assert(h.captured.has(1));
  h.fire('pointermove',{x:60,y:140});assert.deepEqual(h.statuses,['producing','hungry','hungry']);assert.equal(h.feedCount,2);
  const overlay=h.overlay;h.tick();assert.equal(h.overlay,overlay);assert(h.captured.has(1));
  h.fire('pointermove',{x:270,y:140});assert.equal(h.feedCount,0);assert.deepEqual(h.commands.flatMap(c=>c.animalIds),h.ids);
  h.fire('pointermove',{x:60,y:140});h.fire('pointerup');h.fire('pointerup');assert.equal(h.commands.length,2);assert.equal(h.releases,1);
  assert.deepEqual(h.reload().entities.find(e=>e.kind==='shelter'&&e.configId==='chicken').animals.map(a=>a.status),h.statuses);
 }finally{h.destroy();}
});

test('shortage during a touch sweep preserves first-hit partial success without negative inventory',()=>{
 const h=touchHarness({feedCount:1});try{h.down();h.fire('pointermove',{x:60,y:140});h.fire('pointermove',{x:270,y:140});h.fire('pointerup');assert.equal(h.feedCount,0);assert.deepEqual(h.statuses,['producing','hungry','hungry']);assert.deepEqual(h.commands.flatMap(c=>c.animalIds),h.ids);assert.equal(h.parts.get('.fc-feed').disabled,true);}finally{h.destroy();}
});

test('second finger stops the stroke; outside releases cannot leave stale IDs blocking the next drag',()=>{
 const h=touchHarness();try{h.down();h.fire('pointermove');h.fire('pointerdown',{id:2,primary:false,outside:true});assert.equal(h.captured.size,0);h.fire('pointermove',{x:270});assert.equal(h.feedCount,2);h.fire('pointerup',{id:2,outside:true});h.fire('pointerup',{outside:true});h.down();h.fire('pointermove',{x:165});h.fire('pointerup',{x:165});assert.equal(h.feedCount,1);}finally{h.destroy();}
});

test('a non-tool touch ending outside the dialog does not poison later feeding',()=>{
 const h=touchHarness();try{h.fire('pointerdown',{target:h.parts.get('.fc-panel'),id:5});h.fire('pointerup',{id:5,outside:true});h.down();h.fire('pointermove');assert.equal(h.feedCount,2);}finally{h.destroy();}
});

test('pointercancel, capture loss, blur, hidden document, resize and leaving panel preserve committed feed and stop later moves',()=>{
 for(const interrupt of ['pointercancel','lostpointercapture','blur','visibilitychange','resize','leave']){
  const h=touchHarness();try{h.down();h.fire('pointermove');
   if(interrupt==='pointercancel')h.fire(interrupt);
   else if(interrupt==='lostpointercapture')h.overlay.emit(interrupt,{pointerId:1});
   else if(interrupt==='visibilitychange'){h.doc.hidden=true;h.doc.emit(interrupt,{});}
   else if(interrupt==='leave')h.fire('pointermove',{x:450});
   else h.win.emit(interrupt,{});
   h.fire('pointermove',{x:270});h.fire('pointerup',{x:270});h.fire('pointercancel');assert.equal(h.feedCount,2,interrupt);assert.equal(h.commands.length,1,interrupt);assert.equal(h.captured.size,0,interrupt);
  }finally{h.destroy();}
 }
});

test('document move/up fallback completes a touch stroke if pointer capture throws',()=>{
 const h=touchHarness({captureFails:true});try{assert.doesNotThrow(()=>h.down());h.fire('pointermove',{outside:true});h.fire('pointerup',{outside:true});assert.equal(h.feedCount,2);h.down();h.fire('pointermove',{x:270,outside:true});h.fire('pointerup',{x:270,outside:true});assert.equal(h.feedCount,1);}finally{h.destroy();}
});

test('collected egg may disappear during pointerdown without losing the remaining touch sweep',()=>{
 const h=touchHarness({ready:true});try{const oldEgg=h.eggs[0];h.fire('pointerdown',{target:oldEgg,x:60,y:220});assert.equal(h.state.inventory.egg,1);assert(!h.eggs.includes(oldEgg));assert(h.captured.has(1));h.fire('pointermove',{x:270,y:220});assert.equal(h.state.inventory.egg,3);h.fire('pointerup',{x:270,y:220});assert.deepEqual(h.statuses,['hungry','hungry','hungry']);}finally{h.destroy();}
});

test('offscreen animal hit boxes are clipped to the scrollable row',()=>{
 const h=touchHarness();try{h.parts.get('.fc-animals').rect.right=215;h.down();h.fire('pointermove');h.fire('pointermove',{x:270});assert.deepEqual(h.statuses,['producing','producing','hungry']);}finally{h.destroy();}
});

test('tool touch-action beats host buttons without disabling native row scrolling',()=>{
 const css=readFileSync(new URL('../farm-coop-panel.css',import.meta.url),'utf8'),host=readFileSync(new URL('../farm-scene-host.css',import.meta.url),'utf8');
 assert.match(host,/\.farm-scenes button\{[^}]*touch-action:manipulation/);
 assert.match(css,/\.fc-panel button\.fc-feed,\.fc-panel button\.fc-egg\{[^}]*touch-action:none/);
 assert.match(css,/\.fc-panel button\.fc-bird\{touch-action:pan-x\}/);
 assert.doesNotMatch(css,/\.fc-(?:panel|animals|backdrop)\{[^}]*touch-action:none/);
});

test('held feed tool edge-pans a six-animal row and commits only newly visible animals under the finger',()=>{
 const h=touchHarness({count:6});try{const rows=h.parts.get('.fc-animals');h.down();h.fire('pointermove');h.fire('pointermove',{x:355});
  assert.equal(rows.scrollLeft,0);assert.deepEqual(h.statuses,['producing','producing','producing','producing','hungry','hungry']);assert.equal(h.frames,1);
  h.frame(0);h.frame(1000);assert.equal(rows.scrollLeft,11,'long frames are capped at 50ms / 220px per second');assert.equal(h.statuses[4],'hungry','hidden animals are not batched by scrolling intent');
  for(let time=1050;time<2500;time+=50)h.frame(time);
  assert.deepEqual(h.statuses,Array(6).fill('producing'));assert.equal(h.feedCount,0);assert.equal(h.frames,0,'exhausted feed stops the edge loop');assert.deepEqual(h.commands.flatMap(c=>c.animalIds),h.ids);assert(h.captured.has(1),'all commits happened before pointerup');
  h.fire('pointerup',{x:355});assert.equal(h.frames,0);
 }finally{h.destroy();}
});

test('edge-pan reverses left within one feed stroke without repeating committed animals',()=>{
 const h=touchHarness({count:6,feedCount:8});try{const rows=h.parts.get('.fc-animals');h.down();h.fire('pointermove');h.fire('pointermove',{x:355});for(let time=0;time<1800;time+=50)h.frame(time);
  assert.equal(rows.scrollLeft,rows.scrollWidth-rows.clientWidth);assert.equal(h.frames,0,'right boundary stops scheduling');
  h.fire('pointermove',{x:35});for(let time=2000;time<3800;time+=50)h.frame(time);
  assert.equal(rows.scrollLeft,0);assert.equal(h.feedCount,2);assert.deepEqual(h.commands.flatMap(c=>c.animalIds),h.ids);assert.equal(h.frames,0);
 }finally{h.destroy();}
});

test('collect tool edge-pans and collects six eggs while removed eggs stay gone',()=>{
 const h=touchHarness({count:6,ready:true});try{h.fire('pointerdown',{target:h.eggs[0],x:60,y:220});h.fire('pointermove',{x:345,y:220});assert.equal(h.state.inventory.egg,4);for(let time=0;time<1800;time+=50)h.frame(time);assert.equal(h.state.inventory.egg,6);assert.deepEqual(h.commands.flatMap(c=>c.animalIds),h.ids);assert.equal(h.frames,0);h.fire('pointerup',{x:345,y:220});}finally{h.destroy();}
});

test('native row touches and tool movement away from the row never trigger or continue edge-pan',()=>{
 const h=touchHarness({count:6});try{const rows=h.parts.get('.fc-animals');h.fire('pointerdown',{target:h.birds[0]});h.fire('pointermove',{x:355});assert.equal(h.frames,0);assert.equal(h.commands.length,0);h.fire('pointerup');
  h.down();h.fire('pointermove',{x:355,y:340});assert.equal(h.frames,0,'moving beside the feed bag does not scroll animals');h.fire('pointermove',{x:355,y:140});assert.equal(h.frames,1);h.frame(0);h.frame(50);const before=rows.scrollLeft;assert(before>0);h.fire('pointermove',{x:355,y:300});assert.equal(h.frames,0);h.frame(100);assert.equal(rows.scrollLeft,before);
 }finally{h.destroy();}
});

test('all interruption paths cancel a pending edge frame, keeping prior commits and scroll position',()=>{
 for(const interrupt of ['pointercancel','pointerup','lostpointercapture','blur','visibilitychange','resize','second-finger','leave','destroy']){
  const h=touchHarness({count:6});let destroyed=false;try{const rows=h.parts.get('.fc-animals');h.down();h.fire('pointermove');h.fire('pointermove',{x:355});h.frame(0);h.frame(50);assert.equal(h.frames,1,interrupt);const before=rows.scrollLeft,commands=h.commands.length;
   if(interrupt==='pointercancel'||interrupt==='pointerup')h.fire(interrupt,{x:355});
   else if(interrupt==='lostpointercapture')h.overlay.emit(interrupt,{pointerId:1});
   else if(interrupt==='visibilitychange'){h.doc.hidden=true;h.doc.emit(interrupt,{});}
   else if(interrupt==='second-finger')h.fire('pointerdown',{id:2,primary:false});
   else if(interrupt==='leave')h.fire('pointermove',{x:450});
   else if(interrupt==='destroy'){h.destroy();destroyed=true;}
   else h.win.emit(interrupt,{});
   assert.equal(h.frames,0,interrupt);h.frame(500);assert.equal(rows.scrollLeft,before,interrupt);assert.equal(h.commands.length,commands,interrupt);
  }finally{if(!destroyed)h.destroy();}
 }
});

test('running out of feed during edge-pan stops at the last paid animal without scrolling hidden ones into a batch',()=>{
 const h=touchHarness({count:6,feedCount:5});try{const rows=h.parts.get('.fc-animals');h.down();h.fire('pointermove');h.fire('pointermove',{x:355});for(let time=0;time<1800;time+=50)h.frame(time);
  assert.equal(h.feedCount,0);assert.deepEqual(h.statuses,['producing','producing','producing','producing','producing','hungry']);assert.equal(h.frames,0);assert.deepEqual(h.commands.flatMap(c=>c.animalIds),h.ids.slice(0,5));const before=rows.scrollLeft;h.frame(2000);assert.equal(rows.scrollLeft,before);
 }finally{h.destroy();}
});
