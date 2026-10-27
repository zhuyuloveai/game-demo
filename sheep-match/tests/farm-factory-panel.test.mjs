import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as config from '../farm-config.mjs';
import {executeFarm,advanceFarm,storageUsed} from '../farm-core.mjs';
import {growthFixture} from './farm-growth-fixtures.mjs';
import {factoryRecipes,factoryStartCheck,factoryCollectCommand,factoryPresentationKey,factoryDropInside} from '../farm-factory-panel.mjs';
const fixture=growthFixture(3);
test('all 13 factories expose only their own real recipes; inspect is mutation-free',()=>{
 const s=structuredClone(fixture),before=JSON.stringify(s),machines=s.entities.filter(e=>e.kind==='machine');assert.equal(machines.length,13);
 for(const e of machines){const recipes=factoryRecipes(s,e.id,config);assert.ok(recipes.length);assert.ok(recipes.every(r=>r.machineType===e.machineType));}
 assert.equal(JSON.stringify(s),before);assert.deepEqual(factoryRecipes(s,'absent',config),[]);
});
test('drop commits through durable core; existing queue capacity and inputs preserved for all 13',()=>{
 for(const original of fixture.entities.filter(e=>e.kind==='machine')){
  let s=structuredClone(fixture);const e=s.entities.find(e=>e.id===original.id);e.queue=[];e.completed=[];
  const recipe=factoryRecipes(s,e.id,config)[0],before={...s.inventory};
  const check=factoryStartCheck(s,e.id,recipe.id,config);assert.equal(check.ok,true);
  const result=executeFarm(s,check.command,s.now);assert.equal(result.ok,true);s=result.state;
  for(const [id,n] of Object.entries(recipe.inputs))assert.equal(s.inventory[id],before[id]-n);
  assert.equal(factoryStartCheck(s,e.id,recipe.id,config).ok,true,'second existing slot remains available');
  for(let i=1;i<e.slots;i++)s=executeFarm(s,check.command,s.now).state;assert.equal(factoryStartCheck(s,e.id,recipe.id,config).ok,false);
 }
});
test('missing ingredients, locks, wrong machine and unfinished construction do not emit commands',()=>{
 const s=structuredClone(fixture),e=s.entities.find(e=>e.kind==='machine'),r=factoryRecipes(s,e.id,config)[0];e.queue=[];
 const input=Object.keys(r.inputs)[0];s.inventory[input]=0;assert.equal(factoryStartCheck(s,e.id,r.id,config).command,undefined);
 s.inventory[input]=100;s.level=0;assert.equal(factoryStartCheck(s,e.id,r.id,config).ok,false);
 s.level=30;e.built=false;assert.equal(factoryStartCheck(s,e.id,r.id,config).ok,false);e.built=true;
 const other=Object.values(config.RECIPES).find(v=>v.machineType!==e.machineType);assert.equal(factoryStartCheck(s,e.id,other.id,config).ok,false);
});
test('ready products collect exact jobs once, preserve outputs, and reject cross-factory IDs',()=>{
 let s=structuredClone(fixture);const e=s.entities.find(e=>e.kind==='machine'&&e.completed.length),job=e.completed[0],before={...s.inventory};
 const command=factoryCollectCommand(s,e.id,job.id);assert.deepEqual(command.jobIds,[job.id]);
 const result=executeFarm(s,command,s.now);assert.equal(result.ok,true);s=result.state;
 for(const [id,n] of Object.entries(job.outputs))assert.equal(s.inventory[id],before[id]+n);
 assert.equal(factoryCollectCommand(s,e.id,job.id),null);assert.equal(factoryCollectCommand(fixture,'absent',job.id),null);
});
test('full storage preserves finished product and inventory for a retry',()=>{
 const s=structuredClone(fixture),e=s.entities.find(e=>e.kind==='machine'&&e.machineType==='bakery'),job=e.completed[0];s.inventory.bread=(s.inventory.bread||0)+s.storage.barn.capacity-storageUsed(s,'barn');
 const result=executeFarm(s,factoryCollectCommand(s,e.id,job.id),s.now);assert.ok(result.skipped.length);assert.deepEqual(result.state.inventory,s.inventory);assert.ok(result.state.entities.find(v=>v.id===e.id).completed.some(j=>j.id===job.id));
});
test('one-second ticks and accounted runtime do not rebuild panel; completion does',()=>{
 let s=structuredClone(fixture);const e=s.entities.find(e=>e.kind==='machine'),r=factoryRecipes(s,e.id,config)[0];e.queue=[];e.completed=[];s=executeFarm(s,factoryStartCheck(s,e.id,r.id,config).command,s.now).state;
 const key=factoryPresentationKey(s,e.id,r.id);const tick=advanceFarm(s,s.now+1000).state;assert.equal(factoryPresentationKey(tick,e.id,r.id),key);
 const completed=advanceFarm(s,s.now+r.durationMs+1).state;assert.notEqual(factoryPresentationKey(completed,e.id,r.id),key);
});
test('drop hit test excludes outside/canceled paths and invalid coordinates',()=>{
 const rect={left:20,right:80,top:30,bottom:90};assert.equal(factoryDropInside({x:25,y:35},rect),true);assert.equal(factoryDropInside({x:19,y:35},rect),false);assert.equal(factoryDropInside({x:NaN,y:35},rect),false);
});
test('panel uses inspect-only recipe selection and explicit pointerup drop; accessible lifecycle guards',()=>{
 const source=readFileSync(new URL('../farm-factory-panel.mjs',import.meta.url),'utf8'),css=readFileSync(new URL('../farm-factory-panel.css',import.meta.url),'utf8');
 assert.match(source,/if\(r\)select\(r.dataset.ffRecipe\)/);assert.match(source,/if\(shouldCommit\)commit\(g.recipeId\)/);assert.match(source,/pointercancel/);assert.match(source,/lostpointercapture/);assert.match(source,/visibilitychange/);assert.match(source,/pointers.size>1/);assert.match(source,/sourceElement:source,targetElement:cargo/);assert.match(source,/ctx.root.inert=oldInert/);assert.match(source,/win.clearInterval\(timer\)/);assert.match(source,/event.key==='Escape'/);assert.match(css,/min-height:44px/);assert.match(css,/prefers-reduced-motion/);
});

test('captured recipe click cannot dismiss the factory through the backdrop',()=>{
 const source=readFileSync(new URL('../farm-factory-panel.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/if\(event.target===overlay\)\{close\(\)/);
 assert.match(source,/if\(r\)select\(r.dataset.ffRecipe\)/);
 assert.match(source,/event.target.closest\('\.ff-close'\)/);
});
