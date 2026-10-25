import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FARM_CONFIG,BUILDINGS,CROPS,FRUITS,ANIMALS,RECIPES,ITEMS,CONTENT_VERSION,storageCapacity} from '../farm-config.mjs';
import {createFarm,executeFarm,canProduce} from '../farm-core.mjs';
import {findFreePlacement} from '../farm-layout.mjs';
import {FARM_ASSETS} from '../farm-assets.mjs';
const root=new URL('../',import.meta.url);
test('all 589 runtime assets match source manifest hashes and licenses are retained',()=>{
 const manifest=JSON.parse(readFileSync(new URL('assets/farm/manifest.json',root)));
 assert.equal(manifest.logicalGridSize,48);assert.equal(manifest.assets.length,589);assert.equal(FARM_ASSETS.length,589);
 for(const asset of manifest.assets){const path=new URL(`assets/farm/${asset.path}`,root);assert(existsSync(path),asset.path);assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),asset.sha256,asset.path);}
 for(const path of ['assets/farm/licenses/ATTRIBUTION.md','assets/farm/licenses/sources.json'])assert(existsSync(new URL(path,root)),path);
});
test('runtime numeric configuration is exact adopted v0.4 data, not old draft',()=>{
 const source=JSON.parse(readFileSync(new URL('docs/farm-design/data/project-parameters-v04.json',root)));
 assert.deepEqual(FARM_CONFIG,source);assert.equal(CONTENT_VERSION,'sheep-core-v04.1');
 assert.equal(Object.keys(CROPS).length,11);assert.equal(Object.keys(FRUITS).length,5);assert.equal(Object.keys(ANIMALS).length,5);assert.equal(Object.keys(BUILDINGS).length,13);
 assert.equal(new Set(Object.values(BUILDINGS).map(b=>b.machineType)).size,12);
 assert.equal(ITEMS.truffle_slice.name,'松露片');assert.equal(ITEMS.herb_bundle.name,'香草团');
});
test('every machine instance can be legally built and all 43 machine recipes produce their exact full batch',()=>{
 let s=createFarm(1000);s.coins=1000000;s.xp=FARM_CONFIG.levelXpToNext.slice(0,29).reduce((a,b)=>a+b,0);s.level=30;
 for(const k of ['barn','silo'])s.storage[k]={upgrades:50,capacity:storageCapacity(50)};
 const act=(c,at=s.now)=>{s=executeFarm(s,c,at).state;};
 for(const b of Object.values(BUILDINGS)){
   const p=findFreePlacement(s,{id:'proposed',kind:'machine',configId:b.id,w:b.footprint[0],h:b.footprint[1],rotation:0});assert(p,b.id);
   act({type:'buy',category:'machine',itemId:b.id,...p});const m=s.entities.at(-1);
   s.now=m.buildReadyAt;act({type:'completeBuilding',entityId:m.id});
 }
 assert.equal(s.entities.filter(e=>e.kind==='machine').length,13);
 for(const r of Object.values(RECIPES)){
   const machine=s.entities.find(e=>e.kind==='machine'&&e.machineType===r.machineType);
   for(const [id,q]of Object.entries(r.inputs))s.inventory[id]=Math.max(s.inventory[id]||0,q+1);
   const before=s.inventory[r.id]||0,xp=s.xp;
   act({type:'enqueue',entityId:machine.id,recipeId:r.id});
   const started=s.entities.find(e=>e.id===machine.id).queue[0];
   act({type:'collectMachine',entityId:machine.id},started.readyAt);
   assert.equal(s.inventory[r.id],before+r.yieldCount,r.id);assert.equal(s.xp,xp+r.xp,r.id);
 }
});
test('crop appearance advances at half duration even when plantedAt is zero',async()=>{
 const {farmCropPhase}=await import('../farm-ui.mjs');
 const crop={plantedAt:0,readyAt:120000};
 assert.equal(farmCropPhase(crop,0),'sprout');assert.equal(farmCropPhase(crop,60000),'grown');assert.equal(farmCropPhase(crop,120000),'ripe');assert.equal(farmCropPhase(null,0),'empty');
});
