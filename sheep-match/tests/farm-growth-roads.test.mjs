import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,executeFarm,advanceFarm,assertFarm} from '../farm-core.mjs';
import {LEVELS,BUILDINGS} from '../farm-config.mjs';
import {previewGrowthLayout,planGrowthRoads,growthRoadEntities,MAX_GROWTH_ROAD_ADDITIONS,suggestGrowthPlacement} from '../farm-growth-layouts.mjs';
import {entityCells,isPassable,needsDoor,operationDoor,positionOf,FARM_MAP,isCellOpen,validateLayout} from '../farm-layout.mjs';
import {makeEnvelope,validateEnvelope} from '../farm-save.mjs';
const cmd=(s,c)=>executeFarm(s,c,s.now).state;
const rich=()=>{const s=createFarm(0);s.level=30;s.xp=LEVELS[29].totalXp;s.coins=10000000;return s;};
const old=()=>{const s=rich();s.entities=s.entities.filter(e=>e.kind!=='road');return advanceFarm(s,s.now).state;};
const key=p=>`${p.x},${p.y}`;
const roads=s=>s.entities.filter(e=>e.kind==='road');
const adopt=s=>{const p=previewGrowthLayout(s);return cmd(s,{type:'adoptGrowthLayout',expectedSignature:p.signature});};
function connectedRoads(s){const all=new Set(roads(s).filter(e=>!e.stored).map(key)),seen=new Set(),q=[FARM_MAP.houseDoor];for(let i=0;i<q.length;i++){const p=q[i],k=key(p);if(seen.has(k)||!all.has(k))continue;seen.add(k);for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])q.push({x:p.x+dx,y:p.y+dy});}return seen;}
test('new farm free paths connect house, exit and facilities without solid footprints or extra purchases',()=>{
 const s=createFarm(0),r=roads(s),blocked=new Set(s.entities.filter(e=>!e.stored&&!isPassable(e)).flatMap(entityCells).map(key));
 assert.ok(r.length>0&&r.length<=MAX_GROWTH_ROAD_ADDITIONS);for(const e of r){assert.equal(blocked.has(key(e)),false);assert.equal(isCellOpen(s,e.x,e.y),true);}assert.equal(s.coins,100);assert.equal(s.nextId,103);assertFarm(s);
 const connected=connectedRoads(s);assert.ok(connected.has(key(FARM_MAP.exit)));for(const e of s.entities.filter(needsDoor))assert.ok(connected.has(key(operationDoor(e))),e.id);
 assert.equal(planGrowthRoads(s).proposedRoads.length,0);
});
test('old save only receives paths on explicit guarded adoption; cancel/retry do not mutate or duplicate',()=>{
 let s=old();const original=structuredClone(s),p=previewGrowthLayout(s);assert.ok(p.proposedRoads.length>0);assert.deepEqual(s,original);assert.deepEqual(advanceFarm(s,0).state.entities,s.entities);
 const envelope=JSON.parse(JSON.stringify(makeEnvelope(s)));assert.equal(validateEnvelope(envelope),true);assert.equal(roads(envelope.payload).length,0);
 assert.throws(()=>cmd(s,{type:'adoptGrowthLayout',expectedSignature:p.signature+'tamper'}),e=>e.code==='SPACE_BLOCKED');assert.deepEqual(s,original);
 s=cmd(s,{type:'adoptGrowthLayout',expectedSignature:p.signature});assert.equal(roads(s).length,p.proposedRoads.length);assert.equal(s.nextId,original.nextId);assert.equal(s.coins,original.coins);assert.deepEqual(s.inventory,original.inventory);
 const ids=roads(s).map(e=>e.id);s=adopt(s);assert.deepEqual(roads(s).map(e=>e.id),ids);assert.equal(previewGrowthLayout(s).proposedRoads.length,0);
});
test('preview preserves custom/stored road positions and generated IDs avoid occupied IDs',()=>{
 let s=old();s.entities.push({id:'growth_road_22_24',kind:'road',configId:'road',x:16,y:16,w:1,h:1,rotation:0,footprintLayer:'ground',walkable:true,stored:true});
 s=cmd(s,{type:'buy',category:'road',x:17,y:17});const existing=roads(s).map(positionOf),p=previewGrowthLayout(s);for(const e of existing)assert.deepEqual(p.positions.find(v=>v.id===e.id),e);
 const generated=growthRoadEntities(s,p.proposedRoads);assert.equal(generated.find(e=>e.x===22&&e.y===24).id,'growth_road_22_24_2');s=cmd(s,{type:'adoptGrowthLayout',expectedSignature:p.signature});for(const e of existing)assert.deepEqual(positionOf(s.entities.find(v=>v.id===e.id)),e);assertFarm(s);
});
test('stale geometry preview rejects the whole adoption, while elapsed production time does not affect signature',()=>{
 let s=old(),p=previewGrowthLayout(s);assert.equal(previewGrowthLayout(advanceFarm(s,1000).state).signature,p.signature);
 s=cmd(s,{type:'buy',category:'field',x:16,y:16});const before=structuredClone(s);assert.throws(()=>cmd(s,{type:'adoptGrowthLayout',expectedSignature:p.signature}),e=>e.code==='SPACE_BLOCKED');assert.deepEqual(s,before);
});
test('road-cap rejection is all-or-nothing and proposed paths never open locked land',()=>{
 const s=old();for(let i=0;i<4096;i++)s.entities.push({id:`stored_road_${i}`,kind:'road',configId:'road',x:16,y:16,w:1,h:1,rotation:0,footprintLayer:'ground',walkable:true,stored:true});const before=structuredClone(s);assertFarm(s);
 const p=previewGrowthLayout(s);assert.equal(p.ok,false);assert.deepEqual(p.proposedRoads,[]);assert.throws(()=>cmd(s,{type:'adoptGrowthLayout',expectedSignature:p.signature}),e=>e.code==='SPACE_BLOCKED');assert.deepEqual(s,before);
 for(const cell of planGrowthRoads(old()).proposedRoads)assert.ok(isCellOpen(s,cell.x,cell.y));
});
test('only automatic/recommended acquisition grows paths; explicit custom purchase leaves road network unchanged',()=>{
 let s=old(),before=structuredClone(s);s=cmd(s,{type:'buy',category:'machine',itemId:'bakery',x:18,y:28});assert.equal(roads(s).length,0);assert.deepEqual(s.entities.slice(0,before.entities.length),before.entities);
 const auto=cmd(old(),{type:'buy',category:'machine',itemId:'bakery'});assert.ok(roads(auto).length>0);assert.equal(auto.entities.at(-1).configId,'bakery');assert.equal(auto.nextId,old().nextId+1);assert.equal(auto.coins,old().coins-BUILDINGS.bakery.coins);
 s=old();const candidate={id:'__preview',kind:'machine',configId:'bakery',w:2,h:2,rotation:0},p=suggestGrowthPlacement(s,candidate);s=cmd(s,{type:'buy',category:'machine',itemId:'bakery',...p,growthPlacement:true});assert.ok(roads(s).length>0);assert.equal(validateLayout(s).ok,true);
 assert.throws(()=>cmd(old(),{type:'buy',category:'machine',itemId:'bakery',x:18,y:28,growthPlacement:true}),e=>e.code==='SPACE_BLOCKED');
});
test('adoption and suggested purchases do not cover a visible custom road with a new solid footprint',()=>{
 let s=old();s=cmd(s,{type:'buy',category:'road',x:34,y:18});const road=s.entities.at(-1),original=positionOf(road);
 const auto=cmd(s,{type:'buy',category:'machine',itemId:'bakery'});assert.equal(entityCells(auto.entities.at(-1)).some(p=>key(p)===key(road)),false);
 s=cmd(s,{type:'buy',category:'machine',itemId:'bakery',x:18,y:28});const p=previewGrowthLayout(s);assert.equal(p.ok,true);s=cmd(s,{type:'adoptGrowthLayout',expectedSignature:p.signature});assert.deepEqual(positionOf(s.entities.find(e=>e.id===road.id)),original);assert.equal(s.entities.filter(e=>!isPassable(e)).flatMap(entityCells).some(p=>key(p)===key(road)),false);
});
test('initial paths reserve later field beds so all48 suggested field anchors stay stable',()=>{
 let s=rich();for(let n=6;n<48;n++){
  s=cmd(s,{type:'buy',category:'field'});const e=s.entities.at(-1);assert.deepEqual({x:e.x,y:e.y},{x:28+(Math.floor(n/6)%2)*4+n%3,y:28+Math.floor(n/12)*3+Math.floor((n%6)/3)});
 }
});
