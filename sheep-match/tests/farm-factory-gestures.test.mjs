import test from 'node:test';
import assert from 'node:assert/strict';
import * as config from '../farm-config.mjs';
import {mountFactoryPanel,factorySlots,factoryDragIntent,factoryCrossedTargets,factoryFocusable} from '../farm-factory-panel.mjs';
import {createFarmStore,makeEnvelope} from '../farm-save.mjs';
import {factoryFixture} from './farm-factory-fixtures.mjs';

// Mounted production handlers, durable A/B store, asynchronous timers and a DOM
// that replaces products on each paint. Native arbitration/computed CSS live in
// farm-factory-workspace-browser.html, rather than being claimed by this adapter.
function harness({factory='bakery',mode='idle',captureFails=false}={}){
 const rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top});
 let overlay,recipes=[],goods=[],slotCount=0,releases=0,interval,failWrites=false,writes=0,confirmation=null,mounted;const parts=new Map(),captured=new Set(),timers=[];
 class Element{
  constructor(selector=''){this.selector=selector;this.dataset={};this.attributes=new Map();this.listeners=new Map();this.style={setProperty(){}};this.rect=rect(5,0,385,650);this.hidden=false;this.isConnected=true;this.disabled=false;const names=new Set();this.classList={add:(...xs)=>xs.forEach(x=>names.add(x)),remove:(...xs)=>xs.forEach(x=>names.delete(x)),toggle:(x,on)=>on?names.add(x):names.delete(x),contains:x=>names.has(x)};}
  addEventListener(type,fn,options){const list=this.listeners.get(type)||[];list.push({fn,capture:options===true||!!options?.capture});this.listeners.set(type,list);}removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(x=>x.fn!==fn));}
  emit(type,event,capture){for(const entry of [...this.listeners.get(type)||[]])if(capture===undefined||entry.capture===capture)entry.fn(event);}
  closest(selector){return selector===this.selector?this:null;}getBoundingClientRect(){return this.rect;}setAttribute(k,v){this.attributes.set(k,v);}getAttribute(k){return this.attributes.get(k)??null;}focus(){doc.activeElement=this;}append(){}remove(){this.isConnected=false;}contains(el){return el===this||[...parts.values(),...recipes,...goods].includes(el);}
  querySelector(selector){return parts.get(selector)||null;}querySelectorAll(selector){if(selector==='[data-ff-collect]')return goods;if(selector==='button:not(:disabled),summary')return [...recipes,...goods,parts.get('.ff-close')];return [];}
  set innerHTML(markup){this.markup=markup;if(this.selector==='.ff-recipes'){recipes=[...markup.matchAll(/data-ff-recipe="([^"]+)"/g)].map((m,i)=>{const el=new Element('[data-ff-recipe]');el.dataset.ffRecipe=m[1];el.rect=rect(15+i*70,350,80+i*70,445);return el;});}if(this.selector==='.ff-shelf'){goods=[];let i=0;for(const m of markup.matchAll(/data-render-key="(goods|collected):([^"]+)"/g)){if(m[1]==='goods'){const el=new Element('[data-ff-collect]');el.dataset.ffCollect=m[2];el.rect=rect(15+(i%3)*60,110+Math.floor(i/3)*70,70+(i%3)*60,175+Math.floor(i/3)*70);goods.push(el);}i++;}}if(this.selector==='.ff-box')slotCount=[...markup.matchAll(/data-ff-slot=/g)].length;}
  get innerHTML(){return this.markup||'';}
 }
 for(const selector of ['.ff-panel','.ff-shelf','.ff-box','.ff-clock','.ff-details','.ff-recipes','.ff-status','.ff-waiting','.ff-cargo','.ff-cursor','.ff-close','.ff-upgrade','.ff-capacity','h2','header'])parts.set(selector,new Element(selector));
 parts.get('header').rect=rect(5,0,385,75);
 parts.get('.ff-shelf').rect=rect(10,80,195,330);parts.get('.ff-box').rect=rect(205,110,375,320);
 const doc=new Element(),win=new Element();doc.body=new Element();doc.head=new Element();doc.activeElement=new Element();doc.defaultView=win;doc.querySelector=()=>({});doc.createElement=()=>{overlay=new Element();overlay.setPointerCapture=id=>{if(captureFails)throw Error('NotFoundError');captured.add(id);};overlay.hasPointerCapture=id=>captured.has(id);overlay.releasePointerCapture=id=>{captured.delete(id);releases++;overlay.emit('lostpointercapture',{pointerId:id});};return overlay;};
 Object.assign(win,{setInterval:fn=>{interval=fn;return 1;},clearInterval(){},setTimeout:fn=>timers.push(fn)});
 const fixture=factoryFixture(factory,mode),key='factory-gesture-test',disk=new Map([[key+':a',JSON.stringify(makeEnvelope(fixture.state,{savedAtWallMs:fixture.state.now}))],[key+':active','a']]),storage={getItem:k=>disk.get(k)??null,setItem(k,v){if(failWrites)throw Error('disk full');writes++;disk.set(k,v);},removeItem:k=>disk.delete(k)},options={storage,key,locks:mode==='readonly'?{request:(_n,_o,fn)=>Promise.resolve(fn(null))}:null,now:()=>fixture.state.now,monotonicNow:()=>0};
 const store=createFarmStore(options),commands=[],root=new Element(),actions=[];root.inert=false;root.parentElement=new Element();root.ownerDocument=doc;
 const ctx={root,doc,win,config,get state(){return store.getState();},item:id=>`<img src="${id}.png" draggable="false">`,name:id=>config.ITEMS[id]?.name||id,act(command){commands.push(command);return store.dispatch(command);},subscribe:fn=>store.subscribe(fn),clearFeedback(){},confirm(opts){confirmation=opts;mounted.suspend();}};
 mounted=mountFactoryPanel(ctx,{entityId:fixture.entityId,onAction:a=>actions.push(a)});
 function fire(type,{target=overlay,x=45,y=390,id=1,primary=true,outside=false,pointerType='touch',detail=1}={}){const event={type,target,clientX:x,clientY:y,pointerId:id,pointerType,button:0,buttons:type==='pointerup'?0:1,isPrimary:primary,detail,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};doc.emit(type,event,true);if(!outside){overlay.emit(type,event,true);overlay.emit(type,event,false);}doc.emit(type,event,false);return event;}
 return{doc,win,parts,commands,captured,actions,fire,fixture,get overlay(){return overlay;},get recipes(){return recipes;},get goods(){return goods;},get slots(){return slotCount;},get state(){return store.getState();},get machine(){return store.getState().entities.find(e=>e.id===fixture.entityId);},get status(){return parts.get('.ff-status').textContent;},get releases(){return releases;},get writes(){return writes;},get confirmation(){return confirmation;},get readonly(){return store.readOnly;},down:()=>fire('pointerdown',{target:recipes[0]}),enter:()=>{fire('pointermove',{x:290,y:210});},tick:()=>interval(),flush:()=>{while(timers.length)timers.shift()();},setWriteFailure:v=>{failWrites=v;},cancelConfirm(){confirmation=null;mounted.resume();},async confirm(){const result=await confirmation.onConfirm();if(result?.ok!==false){confirmation=null;mounted.resume();}return result;},reload(){const other=createFarmStore({...options,locks:null});const value=other.getState();other.close();return value;},destroy(){mounted.destroy();store.close();}};
}
function center(el){const r=el.getBoundingClientRect();return{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};}
test('slot projection is exact for all 13 factories and distinguishes real running/waiting/empty slots',()=>{
 for(const b of Object.values(config.BUILDINGS))for(const mode of ['idle','running','queue9','shelf9']){const {state,entityId}=factoryFixture(b.id,mode),e=state.entities.find(e=>e.id===entityId),slots=factorySlots(e);assert.equal(slots.length,e.slots);assert.equal(slots.filter(s=>s.job).length,e.queue.length);if(mode==='shelf9')assert(slots.every(s=>s.state==='waiting'));if(mode==='running')assert.equal(slots[0].state,'running');}
});
test('touch recipe tap inspects only; horizontal movement never starts production',()=>{
 const h=harness();try{h.down();h.fire('pointerup');h.flush();assert.equal(h.commands.length,0);assert.match(h.parts.get('.ff-details').innerHTML,/原料|小麦/);h.down();h.fire('pointermove',{x:190,y:390});h.fire('pointerup',{x:190,y:390});assert.equal(h.commands.length,0);assert.equal(h.captured.size,0);}finally{h.destroy();}
});
test('recipe enters production before release exactly once despite backtracking, repaint and repeated up',()=>{
 const h=harness();try{const before=h.state.inventory.wheat;h.down();h.enter();assert.equal(h.machine.queue.length,1);assert.equal(h.commands.length,1);assert.equal(h.state.inventory.wheat,before-config.RECIPES[h.fixture.recipeId].inputs.wheat);assert(h.captured.has(1));h.tick();h.fire('pointermove',{x:45,y:390});h.enter();h.fire('pointerup',{x:290,y:210});h.fire('pointerup');h.flush();assert.equal(h.commands.length,1);assert.equal(h.releases,1);assert.equal(h.reload().entities.find(e=>e.id===h.fixture.entityId).queue.length,1);}finally{h.destroy();}
});
test('each factory instance enqueues only its own recipe with original costs',()=>{
 for(const b of Object.values(config.BUILDINGS)){const h=harness({factory:b.id});try{const before=h.state.inventory;h.down();h.enter();assert.equal(h.commands.length,1,b.id);assert.equal(h.commands[0].entityId,h.fixture.entityId);for(const [id,n] of Object.entries(config.RECIPES[h.fixture.recipeId].inputs))assert.equal(h.state.inventory[id],before[id]-n,b.id+':'+id);}finally{h.destroy();}}
});
test('cancel before target is free; cancellation after target never rolls back completed work',()=>{
 for(const after of [false,true]){const h=harness();try{h.down();if(after)h.enter();h.fire('pointercancel');h.enter();h.fire('pointerup');assert.equal(h.commands.length,after?1:0);assert.equal(h.machine.queue.length,after?1:0);assert.equal(h.captured.size,0);}finally{h.destroy();}}
});
test('second pointer, loss of capture, blur, hide, resize and outside movement stop further commits',()=>{
 for(const interrupt of ['second','lostpointercapture','blur','visibilitychange','resize','outside']){const h=harness();try{h.down();h.enter();if(interrupt==='second'){h.fire('pointerdown',{id:2,primary:false,outside:true});h.fire('pointerup',{id:2,outside:true});}else if(interrupt==='lostpointercapture')h.overlay.emit(interrupt,{pointerId:1});else if(interrupt==='visibilitychange'){h.doc.hidden=true;h.doc.emit(interrupt,{});}else if(interrupt==='outside')h.fire('pointermove',{x:450,y:200});else h.win.emit(interrupt,{});h.enter();h.fire('pointerup',{outside:true});assert.equal(h.commands.length,1,interrupt);assert.equal(h.captured.size,0,interrupt);}finally{h.destroy();}}
});
test('non-tool outside release and capture exceptions cannot poison the next touch drag',()=>{
 const h=harness({captureFails:true});try{h.fire('pointerdown',{target:h.parts.get('.ff-panel'),id:8});h.fire('pointerup',{id:8,outside:true});h.down();h.fire('pointermove',{x:45,y:210,outside:true});h.fire('pointermove',{x:290,y:210,outside:true});h.fire('pointerup',{outside:true});assert.equal(h.commands.length,1);h.flush();h.down();h.enter();assert.equal(h.commands.length,2);}finally{h.destroy();}
});
test('missing ingredients and full queue never spend; full shelf is waiting, not falsely producing',()=>{
 for(const mode of ['missing','queue9','shelf9']){const h=harness({mode});try{const before=h.state.inventory;h.down();h.enter();h.fire('pointerup');assert.equal(h.commands.length,0,mode);assert.deepEqual(h.state.inventory,before);if(mode==='shelf9'){assert.equal(h.goods.length,9);assert.equal(h.slots,9);assert.match(h.parts.get('.ff-clock').textContent,/货架已满/);assert.doesNotMatch(h.parts.get('.ff-box').innerHTML,/制作中/);}}finally{h.destroy();}}
});
test('last-seed safeguard stays explicit, cancellable, and confirms exactly one original command',async()=>{
 const h=harness({mode:'seed'});try{const before=h.state.inventory.wheat;h.down();h.enter();assert(h.confirmation);assert.equal(h.state.inventory.wheat,before);h.cancelConfirm();h.fire('pointerup');h.flush();h.down();h.enter();assert(h.confirmation);await h.confirm();assert.equal(h.state.inventory.wheat,0);assert.equal(h.machine.queue.length,1);assert.equal(h.commands.filter(c=>c.allowSeedReserve).length,1);}finally{h.destroy();}
});
test('product sweep commits immediate exact jobs, holds hit geometry across repaint and never double collects',()=>{
 const h=harness({factory:'feed_mill_1',mode:'shelf9'});try{const original=h.machine.completed,points=h.goods.map(el=>({el,...center(el)})),before=h.state.inventory.chicken_feed;h.fire('pointerdown',{target:points[0].el,...points[0]});assert.equal(h.machine.completed.length,8);assert.match(h.parts.get('.ff-shelf').innerHTML,/已收取/);h.tick();for(const p of points)h.fire('pointermove',p);assert.equal(h.machine.completed.length,0);assert.equal(h.state.inventory.chicken_feed,before+original.reduce((n,j)=>n+j.outputs.chicken_feed,0));h.fire('pointermove',points[0]);h.fire('pointerup',points.at(-1));assert.equal(h.commands.length,9);assert.equal(new Set(h.commands.flatMap(c=>c.jobIds)).size,9);assert.doesNotMatch(h.parts.get('.ff-shelf').innerHTML,/已收取/);assert.equal(h.reload().entities.find(e=>e.id===h.fixture.entityId).completed.length,0);}finally{h.destroy();}
});
test('full barn, read-only mode and failed durable write preserve products and inputs',()=>{
 for(const mode of ['barnfull','readonly','idle']){const h=harness({mode});try{const before=h.state;if(mode==='barnfull'){const el=h.goods[0];h.fire('pointerdown',{target:el,...center(el)});h.fire('pointerup');assert.equal(h.machine.completed.length,before.entities.find(e=>e.id===h.fixture.entityId).completed.length);}else{if(mode==='idle')h.setWriteFailure(true);h.down();h.enter();h.fire('pointerup');assert.equal(h.machine.queue.length,0);}assert.deepEqual(h.state.inventory,before.inventory);assert.match(h.status,/货仓|仓库|只读|保存|未开始/);}finally{h.destroy();}}
});
test('moving across only visible product rectangles never collects clipped/offscreen neighbors',()=>{
 const h=harness({mode:'shelf9'});try{h.parts.get('.ff-shelf').rect.bottom=180;const first=h.goods[0];h.fire('pointerdown',{target:first,...center(first)});h.fire('pointermove',{x:180,y:285});h.fire('pointerup',{x:180,y:285});assert(h.commands.length<=3);assert(h.machine.completed.length>=6);}finally{h.destroy();}
});
test('touch intent and ordered segment hit helpers reject invalid geometry and preserve crossing order',()=>{
 assert.equal(factoryDragIntent({x:0,y:0},{x:30,y:2},'touch'),'drag');assert.equal(factoryDragIntent({x:0,y:0},{x:2,y:-30},'touch'),'drag');assert.equal(factoryDragIntent({x:0,y:0},{x:3,y:2},'touch'),'pending');
 const hits=factoryCrossedTargets({x:0,y:5},{x:50,y:5},[{id:2,left:30,right:40,top:0,bottom:10},{id:1,left:10,right:20,top:0,bottom:10},{id:'bad',left:0,right:0,top:0,bottom:10}]);assert.deepEqual(hits.map(v=>v.id),[1,2]);
});

test('queue cancellation remains a separate explicit confirmation, never a gesture side effect',async()=>{
 const h=harness({mode:'running'});try{const job=h.machine.queue.find(j=>j.startAt===null),target={dataset:{ffCancel:job.id},closest:selector=>selector==='[data-ff-cancel]'?target:null};h.fire('click',{target,detail:0});assert(h.confirmation);assert.equal(h.commands.length,0);h.cancelConfirm();assert.equal(h.machine.queue.length,2);h.fire('click',{target,detail:0});await h.confirm();assert.equal(h.commands.length,1);assert.equal(h.commands[0].type,'cancelJob');assert.equal(h.machine.queue.length,1);}finally{h.destroy();}
});
test('missing-source link routes out without buying ingredients or enqueueing',()=>{
 const h=harness({mode:'missing'});try{h.down();h.fire('pointerup');const id=Object.keys(config.RECIPES[h.fixture.recipeId].inputs)[0],target={dataset:{ffSource:id},closest:selector=>selector==='[data-ff-source]'?target:null};assert.match(h.parts.get('.ff-details').innerHTML,/data-ff-source/);h.fire('click',{target,detail:0});assert.deepEqual(h.actions,['source:'+id]);assert.equal(h.commands.length,0);}finally{h.destroy();}
});
test('focus cycle excludes collapsed management buttons but retains its visible summary',()=>{
 let open=false;const nodes=[];const details={querySelector:()=>nodes[1]};
 for(let i=0;i<4;i++)nodes.push({hidden:false,closest(selector){if(selector==='details:not([open])'&&!open&&i>0)return details;return null;},getClientRects:()=>[{}]});
 const root={querySelectorAll:()=>nodes};assert.deepEqual(factoryFocusable(root),nodes.slice(0,2));open=true;assert.deepEqual(factoryFocusable(root),nodes);nodes[3].hidden=true;assert.deepEqual(factoryFocusable(root),nodes.slice(0,3));
});

test('read-only or failed-write product collection does not remove a displayed finished job',()=>{
 for(const mode of ['readonly','shelf9']){const h=harness({mode});try{if(mode==='shelf9')h.setWriteFailure(true);const before=h.machine.completed.length,inventory=h.state.inventory,el=h.goods[0];assert(el);h.fire('pointerdown',{target:el,...center(el)});h.fire('pointerup',center(el));assert.equal(h.machine.completed.length,before);assert.deepEqual(h.state.inventory,inventory);assert.equal(h.goods.length,before);}finally{h.destroy();}}
});

test('direct shallow diagonal touch enters the visible production target exactly once',()=>{
 const h=harness();try{h.down();h.fire('pointermove',{x:290,y:310});assert.equal(h.commands.length,1);h.fire('pointermove',{x:300,y:210});h.fire('pointerup',{x:300,y:210});assert.equal(h.commands.length,1);}finally{h.destroy();}
});
test('sticky header-covered products and production area are never valid gesture targets',()=>{
 const h=harness({mode:'shelf9'});try{h.parts.get('header').rect.bottom=180;const visible=h.goods[3];h.fire('pointerdown',{target:visible,...center(visible)});h.fire('pointermove',{x:45,y:140});h.fire('pointerup',{x:45,y:140});assert.equal(h.commands.length,1);assert.equal(h.commands[0].jobIds[0],visible.dataset.ffCollect);}finally{h.destroy();}
 const h2=harness();try{h2.parts.get('header').rect.bottom=330;h2.down();h2.enter();h2.fire('pointerup',{x:290,y:210});assert.equal(h2.commands.length,0);}finally{h2.destroy();}
});
