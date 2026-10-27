import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {TERRAIN_DIRECTIONS,isConnectedFence,resolveTerrainArt} from '../farm-runtime-terrain.mjs';
import {FRUITS} from '../farm-config.mjs';
import {resolveWorldArt} from '../farm-runtime-art.mjs';
import {createAnimalAnimationController} from '../farm-animal-animation.mjs';
import {resolveShelterAnimal} from '../farm-runtime-shelters.mjs';

// Execute the production signature expressions, not a separate test-side copy.
// Browser identity/layout and visual-frame continuity are covered by browser QA.
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const signatureCode=source.slice(source.indexOf('const s=ctx.state,stages='),source.indexOf('if(signature===mapSignature)'));
assert(signatureCode.startsWith('const s=ctx.state,stages='));
function signature(state){
 return vm.runInNewContext(`(()=>{${signatureCode};return signature;})()`,{
  ctx:{state,core:{storageUsed:()=>0}},resolveWorldArt,
  selected:null,selectedAnimal:null,harvestView:false,draft:null,placement:null,growthPreview:null,clearPreview:null,gesture:null
 });
}
const stateAt=(entities,now=0)=>({entities,now,openedLand:[],storage:{},fertilizerUntil:0});
test('clock-only signature stays stable until actual shortened crop visual thresholds',()=>{
 const entities=[{id:'field',kind:'field',crop:{itemId:'wheat',plantedAt:0,readyAt:1000}}];
 const initial=signature(stateAt(entities,0));
 assert.equal(signature(stateAt(entities,499)),initial);
 const grown=signature(stateAt(entities,500));assert.notEqual(grown,initial);
 assert.equal(signature(stateAt(entities,999)),grown);
 assert.notEqual(signature(stateAt(entities,1000)),grown);
});
test('first fruit young-to-growing transition invalidates map even with unchanged saved entity',()=>{
 const duration=FRUITS.apple.durationMs,entities=[{id:'apple',kind:'fruit',configId:'apple',status:'growing',harvestStage:0,readyAt:duration}];
 assert.equal(signature(stateAt(entities,1)),signature(stateAt(entities,duration/2-1)));
 assert.notEqual(signature(stateAt(entities,duration/2)),signature(stateAt(entities,duration/2-1)));
});
test('construction ready and fertilizer expiration each invalidate map once',()=>{
 const entities=[{id:'bakery',kind:'machine',configId:'bakery',built:false,buildReadyAt:1000}];
 assert.notEqual(signature(stateAt(entities,999)),signature(stateAt(entities,1000)));
 const a={...stateAt([],999),fertilizerUntil:1000},b={...a,now:1000};
 assert.notEqual(signature(a),signature(b));assert.equal(signature(b),signature({...b,now:1001}));
});
test('forest protection geometry invalidates on movement or changing painted growth stage',()=>{
 const start=source.indexOf('const geometry=JSON.stringify('),end=source.indexOf('\n',start);
 assert(start>=0);const expr=source.slice(start,end);
 const geometry=(entities,now=0)=>vm.runInNewContext(`(()=>{${expr};return geometry;})()`,{entities,s:{now},resolveWorldArt});
 const row={id:'apple',kind:'fruit',configId:'apple',x:16,y:18,rotation:0,status:'growing',harvestStage:0,readyAt:FRUITS.apple.durationMs};
 assert.notEqual(geometry([row]),geometry([{...row,x:17}]));
 assert.notEqual(geometry([row]),geometry([row],FRUITS.apple.durationMs/2));
 assert.equal(geometry([row],1),geometry([row],2));
});
test('animal sync repairs href changed by structural patch without waiting for next animation frame',()=>{
 const animal={id:'bird',configId:'chicken',status:'producing'},bounds={left:0,top:0,right:360,bottom:280,width:360,height:280};
 const image={href:'',getAttribute(){return this.href},setAttribute(_,value){this.href=value}};
 const el={dataset:{animal:'bird',shelter:'pen'},querySelector:()=>image,getBoundingClientRect:()=>bounds};
 let frame;
 const controller=createAnimalAnimationController({
  root:{querySelectorAll:()=>[el],getBoundingClientRect:()=>bounds,closest:()=>null},
  getAnimal:()=>({animal,shelter:{}}),getStaticArt:resolveShelterAnimal,Image:null,
  matchMedia:()=>({matches:false}),requestFrame:fn=>(frame=fn,1),cancelFrame:()=>{},
 });
 controller.sync();controller.playEat(['bird']);frame(0);frame(84);
 const art=controller.getArt('bird');assert.equal(art.frame,1);
 image.href=resolveShelterAnimal(animal).src;
 controller.sync();assert.equal(image.href,art.src);assert.equal(controller.getArt('bird').frame,1);
 controller.destroy();
});
test('unrelated map update cannot clone retreat sprites or cancel their pending cleanup',()=>{
 const start=source.indexOf('const retiring='),end=source.indexOf('\n      if(focused)',start);
 assert(start>=0&&end>start);const code=source.slice(start,end);
 const elements=[],timers=new Map();let ordinal=0;
 function tree(retreat=false){return {dataset:{forestPatch:'opened'},retreat,classList:{add(){this.owner.retreat=true},owner:null},cloneNode(){const n=tree();return n},remove(){const i=elements.indexOf(this);if(i>=0)elements.splice(i,1)}};}
 const original=tree();original.classList.owner=original;elements.push(original);
 const world={querySelectorAll(selector){return elements.filter(e=>selector==='.fw-forest-retreat'?e.retreat:!selector.includes(':not(')||!e.retreat)},appendChild(e){e.classList.owner=e;elements.push(e)}};
 const win={clearTimeout:id=>timers.delete(id),setTimeout(fn){timers.set(++ordinal,fn);return ordinal}};
 const context=vm.createContext({world,win,ctx:{state:{openedLand:['opened']}},patchFarmMarkup(){},html:'',forestRetreatTimer:0});
 // cloneNode must carry a working classList for the production add() call.
 original.cloneNode=()=>{const n=tree();n.classList.owner=n;return n};
 vm.runInContext(`(()=>{${code}})()`,context);original.remove();
 assert.equal(elements.length,1);assert.equal(timers.size,1);
 vm.runInContext(`(()=>{${code}})()`,context);
 assert.equal(elements.length,1);assert.equal(timers.size,1);
 for(const fn of timers.values())fn();assert.equal(elements.length,0);
});
test('forest overscan hysteresis retains small pans but rebuilds on viewport escape or geometry invalidation',()=>{
 const start=source.indexOf('const left=Math.floor((-camera.x/camera.zoom)/128)'),end=source.indexOf('const modelKey=',start);
 assert(start>=0&&end>start);const code=source.slice(start,end);
 const c=vm.createContext({camera:{x:0,y:0,zoom:1},viewportWidth:800,viewportHeight:600,selected:null,harvestView:false,draft:null,ctx:{state:{openedLand:['start']}},forestKey:null,forestViewport:null});
 const recull=()=>vm.runInContext(`(()=>{${code};return true;})()`,c)===true;
 assert.equal(recull(),true);const initial=c.forestViewport;
 for(const x of [-1,1,-127,127,0]){c.camera.x=x;assert.equal(recull(),false);assert.equal(c.forestViewport,initial)}
 c.camera.x=-400;assert.equal(recull(),true);c.forestKey=null;assert.equal(recull(),true);
 c.ctx.state.openedLand.push('new');assert.equal(recull(),true);
 c.viewportWidth=1800;assert.equal(recull(),true);c.camera.zoom=.5;assert.equal(recull(),true);
});
test('each newly computed forest overscan contains the actual viewport across pans, sizes and zooms',()=>{
 const start=source.indexOf('const left=Math.floor((-camera.x/camera.zoom)/128)'),end=source.indexOf('const modelKey=',start),code=source.slice(start,end);
 for(const zoom of [.35,.75,1,1.75,2])for(const x of [-1200,-129,-1,0,129,1200]){
 const camera={x,y:x/3,zoom},view={clientWidth:903,clientHeight:617},c=vm.createContext({camera,viewportWidth:view.clientWidth,viewportHeight:view.clientHeight,selected:null,harvestView:false,draft:null,ctx:{state:{openedLand:[]}},forestKey:null,forestViewport:null});
 vm.runInContext(`(()=>{${code}})()`,c);const b=c.forestViewport;
 assert(b.left<=-x/zoom&&b.right>=(view.clientWidth-x)/zoom);assert(b.top<=-camera.y/zoom&&b.bottom>=(view.clientHeight-camera.y)/zoom);
 }
});
test('visual rectangle cache invalidates mutable placement geometry and time-based art stage',()=>{
 const start=source.indexOf('const rectangleCache=new WeakMap();'),end=source.indexOf('function computeVisualRect(e)',start),code=source.slice(start,end);
 let computes=0;const c=vm.createContext({ctx:{state:{now:0}},resolveWorldArt:(e,now)=>({key:now<1000?'young':'grown'}),computeVisualRect:()=>({serial:++computes})});
 const visual=vm.runInContext(`(()=>{${code};return visualRect})()`,c),e={x:1,y:2,w:1,h:1,kind:'field',configId:'wheat',rotation:0};
 const first=visual(e);assert.equal(visual(e),first);e.x++;assert.notEqual(visual(e),first);const moved=visual(e);c.ctx.state.now=1000;assert.notEqual(visual(e),moved);const grown=visual(e);e.rotation=90;assert.notEqual(visual(e),grown);assert.equal(computes,4);
});
function indexedTerrainHarness(entities){
 const start=source.indexOf('let effectiveCache=null;'),end=source.indexOf('const rectangleCache=new WeakMap();',start);assert(start>=0&&end>start);
 const c=vm.createContext({ctx:{state:{entities,now:0}},draft:null,growthPreview:null,TERRAIN_DIRECTIONS,isConnectedFence,resolveTerrainArt});
 const api=vm.runInContext(`(()=>{${source.slice(start,end)};return {effectiveEntities,terrainArt}})()`,c);return {c,...api};
}
test('effective entity cache invalidates on immutable state, replacement draft positions, and growth preview identity',()=>{
 const row={id:'r',kind:'road',configId:'road',x:1,y:1},h=indexedTerrainHarness([row]),first=h.effectiveEntities();assert.equal(h.effectiveEntities(),first);
 h.c.ctx.state={...h.c.ctx.state};assert.notEqual(h.effectiveEntities(),first);
 h.c.draft={positions:[{id:'r',x:4,y:5}]};const draftRows=h.effectiveEntities();assert.equal(draftRows[0].x,4);assert.equal(row.x,1);assert.equal(h.effectiveEntities(),draftRows);
 h.c.draft.positions=[{id:'r',x:7,y:8}];assert.equal(h.effectiveEntities()[0].x,7);assert.notEqual(h.effectiveEntities(),draftRows);
 h.c.growthPreview={plan:{proposedRoads:[{x:8,y:8}]}};const grown=h.effectiveEntities();assert.equal(grown.length,2);assert.equal(grown[1].previewOnly,true);assert.equal(h.effectiveEntities(),grown);
 h.c.growthPreview={plan:{proposedRoads:[{x:9,y:8}]}};assert.equal(h.effectiveEntities()[1].x,9);
 h.c.growthPreview=null;h.c.draft=null;assert.equal(h.effectiveEntities().length,1);assert.equal(h.effectiveEntities()[0],row);
});
test('four-cell terrain index matches full resolver for all 16 masks, roads, wood/flower fences and stored distractors',()=>{
 const types=[['road','road'],['decoration','wood_fence'],['decoration','flower_fence']];
 for(const [kind,configId]of types)for(let mask=0;mask<16;mask++){
 const center={id:'c',kind,configId,x:10,y:10},rows=[center];
 for(const [i,d]of TERRAIN_DIRECTIONS.entries()){
 rows.push({id:`stored${i}`,kind,configId,x:10+d.dx,y:10+d.dy,stored:true});
 if(mask&d.bit)rows.push({id:`n${i}`,kind,configId,x:10+d.dx,y:10+d.dy});
 for(const [otherKind,otherId]of types.filter(t=>t[1]!==configId))rows.push({id:`other${otherId}${i}`,kind:otherKind,configId:otherId,x:10+d.dx,y:10+d.dy});
 }
 rows.push({id:'far',kind,configId,x:100,y:100});const h=indexedTerrainHarness(rows),expected=resolveTerrainArt(center,rows,h.c.ctx.state),actual=h.terrainArt(center);
 assert.equal(actual.mask,mask);assert.equal(actual.path,expected.path);assert.equal(h.terrainArt(center),actual);
 }
});
test('terrain index rebuilds after draft movement, undo, committed state replacement and preview roads',()=>{
 const c={id:'c',kind:'road',configId:'road',x:1,y:1},n={id:'n',kind:'road',configId:'road',x:2,y:1},h=indexedTerrainHarness([c,n]);assert.equal(h.terrainArt(c).mask,2);
 h.c.draft={positions:[{id:'c',x:1,y:1},{id:'n',x:5,y:5}]};assert.equal(h.terrainArt(h.effectiveEntities()[0]).mask,0);
 h.c.draft.positions=[{id:'c',x:1,y:1},{id:'n',x:2,y:1}];assert.equal(h.terrainArt(h.effectiveEntities()[0]).mask,2);
 h.c.draft=null;h.c.ctx.state={entities:[c,{...n,stored:true}],now:1};assert.equal(h.terrainArt(c).mask,0);
 h.c.growthPreview={plan:{proposedRoads:[{x:1,y:2}]}};assert.equal(h.terrainArt(c).mask,4);
});
test('forest model cache ignores selection/entity state but invalidates viewport and opened land',()=>{
 const start=source.indexOf('const modelKey='),end=source.indexOf('const model=forestModel',start);assert(start>=0&&end>start);let builds=0;
 const c=vm.createContext({left:0,top:0,width:800,height:600,ctx:{state:{openedLand:[],entities:[],now:0}},forestModelKey:null,forestModel:null,forestBoundary:()=>({build:++builds})});
 const read=()=>vm.runInContext(`(()=>{${source.slice(start,end)};return forestModel})()`,c);
 const first=read();c.ctx.state={openedLand:[],entities:[{x:10}],now:1000};assert.equal(read(),first);assert.equal(builds,1);
 c.left=128;assert.notEqual(read(),first);assert.equal(builds,2);c.ctx.state.openedLand=['new'];read();assert.equal(builds,3);
});
test('direct harvest clears selection before synchronous dispatch and restores it only after failure',()=>{
 const start=source.indexOf('if(harvest){lastFieldTap=null;'),end=source.indexOf("if(e?.kind!=='field'",start);assert(start>=0&&end>start);
 for(const ok of [true,false]){
 const seen=[],c=vm.createContext({harvest:{type:'harvest',entityIds:['field']},lastFieldTap:{},chosenSeed:'wheat',selected:'field',e:{id:'field'},doAct(){seen.push(c.selected);return {ok}},render(){seen.push(c.selected)}});
 vm.runInContext(`(()=>{${source.slice(start,end)}})()`,c);
 assert.equal(seen[0],null);assert.equal(seen[1],ok?null:'field');assert.equal(c.chosenSeed,null);assert.equal(c.lastFieldTap,null);
 }
});
test('forest uses cached valid viewport and reframe updates it before transforming',()=>{
 const start=source.indexOf('const host=world.querySelector(\'.fw-forest\'),'),end=source.indexOf('// Quantised culling bounds',start);assert(start>=0&&end>start);
 const guard=source.slice(start,end),c=vm.createContext({world:{querySelector:()=>({})},viewSize:{w:0,h:0}}),run=()=>vm.runInContext(`(()=>{${guard};return true})()`,c);
 assert.equal(run(),undefined);c.viewSize={w:900,h:600};assert.equal(run(),true);c.viewSize={w:900,h:0};assert.equal(run(),undefined);
 const a=source.indexOf('function reframeViewport(){'),b=source.indexOf('function scheduleReframe()',a);let transformed;
 const r=vm.createContext({resizeRaf:1,destroyed:false,cameraReady:true,viewSize:{w:900,h:600},camera:{x:0,y:0,zoom:1},focusAnchor:null,viewportSize:()=>({w:500,h:800}),resizeWorldCamera:camera=>camera,transform(){transformed={...r.viewSize}}});
 vm.runInContext(`${source.slice(a,b)};reframeViewport()`,r);assert.deepEqual(transformed,{w:500,h:800});
});
test('world coordinates same-task animal read, delight refresh, animal write in order',()=>{
 const start=source.indexOf('function refreshMotion(){'),end=source.indexOf('function on(el,event,fn,options)',start);assert(start>=0&&end>start);const calls=[];
 const c=vm.createContext({game:{dataset:{}},gesture:null,draft:null,placement:null,localPage:null,motionRaf:0,destroyed:false,win:{requestAnimationFrame:fn=>{fn();return 1}},animalAnimation:{prepareSync:()=>calls.push('animal-read'),commitSync:()=>calls.push('animal-write')},ctx:{refreshPresentation:()=>calls.push('delight')}});
 vm.runInContext(`${source.slice(start,end)};refreshMotion()`,c);assert.deepEqual(calls,['animal-read','delight','animal-write']);
});
