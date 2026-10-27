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
