import test from 'node:test';
import assert from 'node:assert/strict';
import {FARM_CONFIG} from '../farm-config.mjs';
import {LAND_PATCHES,validateLayout,beginLayout,applyLayout,isCellOpen,canExpandLand,getFootprint,operationDoor,cellsAlongLine,findFreePlacement} from '../farm-layout.mjs';
const make=(id,kind,x,y,w=1,h=1,extra={})=>({id,kind,configId:kind,x,y,w,h,rotation:0,...extra});
const initial=()=>({revision:0,layoutRevision:0,level:1,openedLand:[],entities:[make('house','house',20,20,4,4,{fixed:true}),make('barn','barn',24,20,3,3),make('silo','silo',28,20,3,3),make('shelter_1','shelter',34,24,4,4),...Array.from({length:6},(_,i)=>make(`field_${i}`,'field',28+i%3,28+Math.floor(i/3),1,1,{crop:{itemId:'wheat',readyAt:1000}}))]});

test('land patch numbering/costs exactly match authoritative versioned config',()=>{
 assert.deepEqual(LAND_PATCHES,FARM_CONFIG.map.expansionPatches);
 assert.equal(LAND_PATCHES.reduce((n,p)=>n+p.land_deed,0),624);
});
test('initial orthographic farm is collision-free and all doors reach exit',()=>{
 assert.equal(validateLayout(initial()).ok,true);
 assert.equal(isCellOpen(initial(),16,16),true);assert.equal(isCellOpen(initial(),48,47),false);
});
test('production IDs and current maturation are preserved when applying old draft',()=>{
 const state=initial(),draft=beginLayout(state);draft.positions.find(p=>p.id==='field_0').x=31;
 state.entities.find(e=>e.id==='field_0').crop.ready=true;state.revision=8;
 const result=applyLayout(state,draft);assert.equal(result.ok,true);
 assert.equal(result.state.entities.find(e=>e.id==='field_0').crop.ready,true);
 assert.equal(result.state.revision,8);assert.equal(result.state.layoutRevision,1);assert.equal(state.entities.find(e=>e.id==='field_0').x,28);
});
test('old plans cannot omit new facilities, invent IDs, duplicate or store production',()=>{
 for(const modify of [d=>d.positions.pop(),d=>d.positions.push({id:'unknown',x:30,y:40}),d=>d.positions.push(d.positions[0]),d=>{d.positions.find(e=>e.id==='field_0').stored=true;}]){
  const s=initial(),draft=beginLayout(s);modify(draft);assert.equal(validateLayout(s,draft).ok,false);
 }
});
test('fixed house, illegal rotations, overlapping and unopened placement are rejected',()=>{
 for(const [id,changes] of [['house',{x:21}],['field_0',{rotation:90}],['field_0',{x:29}],['field_0',{x:2}]]){
  const s=initial(),d=beginLayout(s);Object.assign(d.positions.find(e=>e.id===id),changes);assert.equal(validateLayout(s,d).ok,false);
 }
});
test('house door and exit protection have concrete blocked positions',()=>{
 for(const [x,y]of [[22,24],[32,47]]){
  const s=initial();s.entities.push(make('block','decoration',x,y));const result=validateLayout(s);assert.equal(result.ok,false);assert.match(result.errors[0].code,/DOOR_BLOCKED|EXIT_BLOCKED/);
 }
});
test('BFS rejects a door with free tile but fenced off from exit',()=>{
 const s=initial();for(const [i,[x,y]]of [[21,24],[23,24],[22,25]].entries())s.entities.push(make(`fence_${i}`,'decoration',x,y));
 const result=validateLayout(s);assert.equal(result.ok,false);assert.equal(result.errors[0].id,'house');
});
test('grass and ground roads need no path purchase; arches/bridges are traversable',()=>{
 const s=initial();s.entities.push(make('road','road',22,24,1,1,{footprintLayer:'ground'}));assert.equal(validateLayout(s).ok,true);
 s.entities.push(make('arch','decoration',22,24,1,1,{walkable:true}));assert.equal(validateLayout(s).ok,true);
});
test('rotation swaps non-square footprints and rotates operating door',()=>{
 const e=make('mill','machine',35,30,3,2,{rotation:90});assert.deepEqual(getFootprint(e),{w:2,h:3});assert.deepEqual(operationDoor(e),{x:34,y:31});
 const s=initial();s.entities.push(e);assert.equal(validateLayout(s).ok,true);
});
test('expansion requires level and adjacency; field allowance is not changed',()=>{
 const s=initial();assert.equal(canExpandLand(s,'land_01').error,'LEVEL_LOCKED');s.level=22;
 assert.equal(canExpandLand(s,'land_01').ok,true);assert.equal(canExpandLand(s,'land_45').ok,false);s.openedLand=['land_01'];assert.equal(isCellOpen(s,16,8),true);assert.equal(canExpandLand(s,'land_01').error,'ALREADY_OWNED');
});
test('line traversal covers 20 fields even with only two sampled points',()=>{
 const cells=cellsAlongLine({x:0.5,y:2.5},{x:19.5,y:2.5});assert.equal(cells.length,20);assert.deepEqual(cells[19],{x:19,y:2});
 const back=cellsAlongLine({x:19.5,y:2.5},{x:0.5,y:2.5});assert.equal(back.length,20);
});
test('finding free placement respects collision, land, and door reachability',()=>{
 const s=initial(),e=make('new_field','field',0,0),position=findFreePlacement(s,e);assert.ok(position);assert.equal(validateLayout({...s,entities:[...s.entities,{...e,...position}]}).ok,true);
});

test('imported ownership cannot contain unreachable isolated land islands',()=>{
 const s=initial();s.openedLand=['land_45'];assert.equal(validateLayout(s).ok,false);
 s.openedLand=LAND_PATCHES.map(p=>p.id).reverse();assert.equal(validateLayout(s).ok,true);
});
