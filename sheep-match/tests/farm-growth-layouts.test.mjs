import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,executeFarm,advanceFarm,assertFarm} from '../farm-core.mjs';
import {BUILDINGS,FRUITS,ANIMALS,LEVELS,FARM_CONFIG} from '../farm-config.mjs';
import {validateLayout,positionOf} from '../farm-layout.mjs';
import {makeEnvelope,validateEnvelope} from '../farm-save.mjs';
import {farmGrowthStage,previewGrowthLayout,suggestGrowthPlacement,GROWTH_STAGES} from '../farm-growth-layouts.mjs';
const cmd=(s,c,t=s.now)=>executeFarm(s,c,t).state;
const rich=()=>{const s=createFarm(0);s.level=30;s.xp=LEVELS[29].totalXp;s.coins=10000000;return s;};
const positions=s=>s.entities.map(positionOf);
const buy=(s,category,itemId)=>cmd(s,{type:'buy',category,itemId});
const rest=e=>{const {x,y,rotation,stored,...r}=e;return r;};
test('new farm is a valid compact authored blueprint without extra owned content',()=>{
 const s=createFarm(0);assertFarm(s);assert.equal(validateLayout(s).ok,true);assert.equal(s.entities.filter(e=>e.kind!=='road').length,15);assert.equal(s.coins,100);assert.equal(s.entities.find(e=>e.kind==='shelter').x,22);assert.equal(previewGrowthLayout(s).changed,0);assert.equal(farmGrowthStage(s).id,1);assert.equal(GROWTH_STAGES.length,5);
});
test('growth stages use owned milestones, never level alone or unpurchased templates',()=>{
 let s=rich();assert.equal(farmGrowthStage(s).id,1);s=buy(s,'machine','bakery');assert.equal(farmGrowthStage(s).id,2);
 for(const id of ['feed_mill_1','dairy','sugar_mill','popcorn_pot'])s=buy(s,'machine',id);assert.equal(farmGrowthStage(s).id,3);
 for(const id of ['bbq_grill','pie_oven','loom','sewing_machine'])s=buy(s,'machine',id);assert.equal(farmGrowthStage(s).id,4);
 for(const id of ['cake_oven','juice_press','ice_cream_maker'])s=buy(s,'machine',id);assert.equal(farmGrowthStage(s).id,5);
 const sparse=buy(rich(),'machine','ice_cream_maker');assert.equal(farmGrowthStage(sparse).id,2);
});
test('all 48 fields and all production/fruit/animal kinds fit additively without moving neighbours',()=>{
 let s=rich();
 const add=(category,id)=>{const before=positions(s);s=buy(s,category,id);assert.deepEqual(positions(s).slice(0,before.length),before);assert.equal(validateLayout(s).ok,true);};
 for(let i=6;i<48;i++)add('field','field');
 for(const id of Object.keys(BUILDINGS))add('machine',id);
 for(const a of Object.values(ANIMALS))for(let i=a.id==='chicken'?1:0;i<a.levels.length;i++)add('shelter',a.id);
 for(const id of Object.keys(FRUITS))for(let i=0;i<4;i++)add('fruit',id);
 assertFarm(s);assert.equal(s.entities.filter(e=>e.kind==='field').length,48);assert.equal(s.entities.filter(e=>e.kind==='machine').length,13);assert.equal(s.entities.filter(e=>e.kind==='fruit').length,20);assert.equal(s.entities.filter(e=>e.kind==='shelter').length,12);assert.equal(farmGrowthStage(s).id,5);
 const preview=previewGrowthLayout(s);assert.equal(preview.ok,true);assert.equal(validateLayout(s,preview.positions).ok,true);
});
test('different purchase order, custom placements and existing saved positions stay untouched',()=>{
 for(const ids of [Object.keys(BUILDINGS),Object.keys(BUILDINGS).reverse().filter(id=>id!=='feed_mill_2').concat('feed_mill_2')]){
  let s=rich();const old=positions(s);old.find(p=>p.id==='field_1').x=26;s=cmd(s,{type:'applyLayout',positions:old});
  const custom=positions(s);s=advanceFarm(structuredClone(s),1000).state;assert.deepEqual(positions(s),custom);
  for(const id of ids)s=buy(s,'machine',id);assert.deepEqual(positions(s).slice(0,custom.length),custom);assertFarm(s);
 }
});
test('adoption preview is pure; cancel is unchanged; commit and rollback preserve crops, queues and resources',()=>{
 let s=rich();s=cmd(s,{type:'buy',category:'machine',itemId:'bakery',x:18,y:28});const machine=s.entities.at(-1);s=cmd(s,{type:'completeBuilding',entityId:machine.id},machine.buildReadyAt);s=cmd(s,{type:'enqueue',entityId:machine.id,recipeId:'bread'});s=cmd(s,{type:'plant',entityIds:['field_1'],itemId:'wheat'});
 const envelope=JSON.parse(JSON.stringify(makeEnvelope(s)));assert.equal(validateEnvelope(envelope),true);assert.deepEqual(envelope.payload,s);s=envelope.payload;
 const before=structuredClone(s),original=positions(s),preview=previewGrowthLayout(s);assert.equal(preview.ok,true);assert.ok(preview.changed>0);assert.deepEqual(s,before);
 s=cmd(s,{type:'applyLayout',positions:preview.positions});assert.deepEqual(s.entities.map(rest),before.entities.map(rest));assert.deepEqual(s.inventory,before.inventory);assert.equal(s.coins,before.coins);
 s=cmd(s,{type:'applyLayout',positions:original});assert.deepEqual(positions(s),original);assert.deepEqual(s.entities.map(rest),before.entities.map(rest));
});
test('paid expansion obstacles and material cost survive growth preview, and locked land is never used',()=>{
 let s=rich();const patch=FARM_CONFIG.map.expansionPatches[0];Object.assign(s.inventory,{land_deed:2,mallet:2,marker_stake:2});s=cmd(s,{type:'expandLand',patchId:patch.id});const fixed=s.entities.filter(e=>e.fixed).map(positionOf),before=structuredClone(s);
 const p=previewGrowthLayout(s);assert.equal(p.ok,true);s=cmd(s,{type:'applyLayout',positions:p.positions});assert.deepEqual(s.entities.filter(e=>e.fixed).map(positionOf),fixed);assert.deepEqual(s.openedLand,before.openedLand);assert.deepEqual(s.inventory,before.inventory);assert.equal(s.inventory.land_deed,0);
 const noLand=rich(),candidate={id:'new',kind:'machine',configId:'bakery',w:2,h:2,rotation:0};const suggested=suggestGrowthPlacement(noLand,candidate);assert.ok(suggested.x>=16&&suggested.y>=16&&suggested.x<48&&suggested.y<48);
});
test('explicit invalid position is rejected rather than silently relocated; auto purchase retains cost/locks',()=>{
 const s=createFarm(0);assert.throws(()=>buy(s,'machine','bakery'),e=>e.code==='LEVEL_LOCKED');assert.throws(()=>cmd(s,{type:'buy',category:'field',x:20,y:20}),e=>e.code==='COUNT_LIMIT');
 const r=rich();assert.throws(()=>cmd(r,{type:'buy',category:'machine',itemId:'bakery',x:20,y:20}),e=>e.code==='SPACE_BLOCKED');const next=buy(r,'field','field');assert.equal(next.coins,r.coins-1);assert.equal(next.entities.filter(e=>e.kind!=='road').length,r.entities.filter(e=>e.kind!=='road').length+1);
});

test('no legal placement returns null without changing land, resources or neighbour positions',()=>{
 const s=rich(),before=structuredClone(s);assert.equal(suggestGrowthPlacement(s,{id:'too-large',kind:'machine',configId:'bakery',w:64,h:64,rotation:0}),null);assert.deepEqual(s,before);
});
