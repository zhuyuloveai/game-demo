import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKSHOP_TERRAIN,workshopForestFringe,workshopForestFog} from '../farm-workshop-terrain.mjs';
import {WORKSHOP_EFFECTS,workshopEffectFrame,committedTerrainEffects} from '../farm-workshop-effects.mjs';
import {LAND_PATCHES} from '../farm-layout.mjs';
import {createFarm,executeFarm} from '../farm-core.mjs';
import {LEVELS} from '../farm-config.mjs';

test('workshop boundary is deterministic with four exterior corners and no internal patch corners',()=>{
 const state={openedLand:[],entities:[]},before=structuredClone(state),a=workshopForestFringe(state);
 assert.deepEqual(a,workshopForestFringe(state));assert.deepEqual(state,before);
 assert.equal(a.filter(x=>x.kind.startsWith('grass-corner-outer')).length,4);
 assert.equal(a.filter(x=>x.kind.startsWith('grass-corner-inner')).length,0);
 assert.equal(a.filter(x=>x.kind.startsWith('grass-cap')).length,0);
 assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 for(const p of a){assert.ok(Number.isFinite(p.left));assert.ok(Number.isFinite(p.top));assert.ok(p.width>0);assert.match(p.src,/assets\/farm\/terrain-workshop\//);}
 assert.equal(Object.keys(WORKSHOP_TERRAIN).length,19);
});
test('culling cannot invent caps or mutate connector shape; opening land adds inner corners',()=>{
 const state={openedLand:[LAND_PATCHES[0].id],entities:[]},all=workshopForestFringe(state),view={left:1300,right:1700,top:200,bottom:900};
 assert.ok(all.some(x=>x.kind.startsWith('grass-corner-inner')));
 const lookup=new Map(all.map(x=>[x.id,x]));for(const x of workshopForestFringe(state,{viewport:view}))assert.deepEqual(x,lookup.get(x.id));
 const full={openedLand:LAND_PATCHES.map(x=>x.id)};assert.deepEqual(workshopForestFringe(full),[]);assert.deepEqual(workshopForestFog(full),[]);
});
test('clouds are one per unopened patch with a bounded viewport budget',()=>{
 const state={openedLand:[LAND_PATCHES[0].id]},fog=workshopForestFog(state);
 assert.ok(fog.length<=24);assert.equal(new Set(fog.map(x=>x.patchId)).size,fog.length);assert.ok(!fog.some(x=>state.openedLand.includes(x.patchId)));
 assert.deepEqual(workshopForestFog(state,{viewport:{left:1e5,right:1e5+100,top:1e5,bottom:1e5+100}}),[]);
});
test('atlas frames honor gutters, cadence and stop after frame 7 rather than looping',()=>{
 for(const [id,fx]of Object.entries(WORKSHOP_EFFECTS)){
  assert.deepEqual(workshopEffectFrame(id,0),{frame:0,x:2,y:2});
  assert.deepEqual(workshopEffectFrame(id,1000*4/fx.fps+.001),{frame:4,x:2,y:102});
  assert.equal(workshopEffectFrame(id,fx.duration-.001).frame,7);assert.equal(workshopEffectFrame(id,fx.duration),null);assert.equal(workshopEffectFrame(id,-1),null);
 }
 assert.equal(WORKSHOP_EFFECTS['land-open'].fps,16);assert.equal(WORKSHOP_EFFECTS['clear-dust'].fps,12);
});
test('only successful real land expansion yields an effect at its logical center',()=>{
 const before=createFarm(0);before.level=30;before.xp=LEVELS[29].totalXp;Object.assign(before.inventory,{land_deed:10,mallet:10,marker_stake:10});
 const p=LAND_PATCHES[0],command={type:'expandLand',patchId:p.id},result=executeFarm(before,command,before.now);
 assert.deepEqual(committedTerrainEffects(before,command,result),[{id:'land-open',x:p.x+4,y:p.y+4,entityId:p.id}]);
 assert.deepEqual(committedTerrainEffects(before,command,{ok:false}),[]);assert.deepEqual(committedTerrainEffects(result.state,command,{ok:true,state:result.state}),[]);
});
test('clearing maps removed obstacles to dust plus correct debris, never previews or failures',()=>{
 const before=createFarm(0);Object.assign(before.inventory,{saw:10,shovel:10});
 for(const [id,toolId,fx]of [['natural_tree_1','saw','wood-chips'],['rock_1','shovel','stone-chips']]){
  const command={type:'clearObstacle',entityIds:[id],toolId,confirmed:true},r=executeFarm(before,command,before.now),effects=committedTerrainEffects(before,command,r);
  assert.equal(r.ok,true);assert.deepEqual(effects.map(x=>x.id),['clear-dust',fx]);assert.equal(effects[0].entityId,id);
  assert.throws(()=>executeFarm(before,{...command,confirmed:false},before.now),{code:'CONFIRM_REQUIRED'});
  assert.deepEqual(committedTerrainEffects(before,{...command,confirmed:false},{ok:false}),[]);
  assert.deepEqual(committedTerrainEffects(before,command,{ok:true,state:before}),[]);
 }
});
test('rendered straight and corner ports coincide exactly, including expanded concave outlines',()=>{
 const ports=kind=>kind.includes('corner')?({n:[[48,120],[208,120]],e:[[48,40],[48,120]],s:[[48,40],[208,40]],w:[[208,40],[208,120]]})[kind.at(-1)]:kind.includes('-ne-')||kind.endsWith('-ne')?[[48,120],[208,40]]:[[48,40],[208,120]];
 for(const openedLand of [[],[LAND_PATCHES[0].id],[LAND_PATCHES[0].id,LAND_PATCHES[1].id]]){
  const pieces=workshopForestFringe({openedLand}),points=pieces.flatMap(p=>ports(p.kind).map(([x,y])=>({id:p.id,x:p.left+x*p.width/256,y:p.top+y*p.height/160})));
  for(const p of points)assert.ok(points.some(q=>p.id!==q.id&&Math.abs(p.x-q.x)<1e-7&&Math.abs(p.y-q.y)<1e-7),`unjoined port ${p.id}: ${p.x},${p.y}`);
 }
});
test('road-facing soil connectors follow current presentation and disappear when the road moves',()=>{
 const a=workshopForestFringe({openedLand:[],entities:[]}),target=a.find(p=>p.kind.startsWith('grass-edge'));
 const road={id:'edge-road',kind:'road',x:target.x-.5,y:target.y-.5};
 const b=workshopForestFringe({openedLand:[],entities:[road]});assert.ok(b.some(p=>p.kind.startsWith('soil-grass')));
 const c=workshopForestFringe({openedLand:[],entities:[{...road,x:32,y:32}]});assert.equal(c.some(p=>p.kind.startsWith('soil-grass')),false);
});
