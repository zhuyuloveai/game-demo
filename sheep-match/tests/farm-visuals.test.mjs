import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {farmMachineVisual,farmAnimalVisual} from '../farm-visuals.mjs';
import {farmAnimalClip,farmAsset} from '../farm-assets.mjs';
import {createFarm,executeFarm} from '../farm-core.mjs';
const machine=(extra={})=>({kind:'machine',built:true,completed:[],queue:[],...extra});
test('machines select licensed construction, processing, complete and full overlays in priority order',()=>{
 assert.equal(farmMachineVisual(machine({built:false,buildReadyAt:200}),100).state,'constructing');
 assert.equal(farmMachineVisual(machine({built:false,buildReadyAt:200}),200).state,'complete');
 assert.equal(farmMachineVisual(machine({queue:[{startAt:100}]}),200).state,'processing');
 assert.equal(farmMachineVisual(machine({completed:[{}],queue:[{startAt:100}]}),200).state,'complete');
 assert.equal(farmMachineVisual(machine({completed:Array.from({length:9},()=>({})),queue:[{startAt:null}]}),200).state,'full');
 assert.equal(farmMachineVisual(machine(),200).overlay,null);
 for(const state of ['constructing','processing','complete','full'])assert.notEqual(farmAsset(`buildings.state.${state}`).assetId,'ui.info');
});
test('mastery is a separate static overlay, including all four supported star counts',()=>{
 for(let stars=0;stars<=3;stars++)assert.equal(farmMachineVisual(machine(),1,stars).mastery,`buildings.state.mastery-${stars}`);
 assert.equal(farmMachineVisual(machine({built:false,buildReadyAt:2}),1,3).mastery,null);
 assert.equal(farmMachineVisual(machine(),1,6).mastery,'buildings.state.mastery-3');
});
test('every species uses cached 4fps production clips without catalog scanning per tick',()=>{
 for(const configId of ['chicken','cow','pig','sheep','lamb']){
  const clip=farmAnimalClip(configId,'producing','front');
  assert.equal(clip,farmAnimalClip(configId,'producing','front'));
  assert.equal(clip.fps,4);
  const animal={id:'a',configId,status:'producing'};
  assert.notEqual(farmAnimalVisual(animal,{time:0}).src,farmAnimalVisual(animal,{time:250}).src);
  for(const state of ['idle','eat','producing','ready','collect'])for(const direction of ['front','back','side','right']){
   for(const url of farmAnimalClip(configId,state,direction).urls)assert.ok(existsSync(fileURLToPath(url)),url);
  }
 }
});
test('shelter rotation selects front, right mirrored, back and side without mutating animals',()=>{
 const animal=Object.freeze({id:'a',configId:'pig',status:'ready'});
 const visuals=[0,90,180,270].map(rotation=>farmAnimalVisual(animal,{rotation,time:250}));
 assert.deepEqual(visuals.map(v=>v.direction),['front','right','back','side']);
 assert.deepEqual(visuals.map(v=>v.mirror),[false,true,false,false]);
 assert.deepEqual(visuals.map(v=>v.semanticState),['ready','ready','ready','ready']);
});
test('successful feed has a bounded three-second eat animation, then normal production',()=>{
 const animal={id:'a',configId:'chicken',status:'producing'},transient={state:'eat',start:1000,until:4000};
 assert.equal(farmAnimalVisual(animal,{time:1000,transient}).state,'eat');
 assert.equal(farmAnimalVisual(animal,{time:3999,transient}).state,'eat');
 assert.equal(farmAnimalVisual(animal,{time:4000,transient}).state,'producing');
});
test('collection animation is nonlooping and returns to hungry without changing production',()=>{
 const animal={id:'a',configId:'cow',status:'hungry'},transient={state:'collect',start:1000,until:1500};
 assert.equal(farmAnimalVisual(animal,{time:1000,transient}).frame,0);
 assert.equal(farmAnimalVisual(animal,{time:1499,transient}).frame,1);
 assert.equal(farmAnimalVisual(animal,{time:1500,transient}).state,'idle');
 assert.equal(animal.status,'hungry');
});
test('reduced motion fixes front idle frame while keeping true semantic status and economic state',()=>{
 let state=createFarm(1000);state=executeFarm(state,{type:'feed',entityId:'shelter_chicken_1'},1000).state;
 const before=structuredClone(state),animal=state.entities.find(e=>e.kind==='shelter').animals[0];
 const first=farmAnimalVisual(animal,{time:0,reducedMotion:true});
 for(const time of [250,1000,5000])for(const rotation of [0,90,180,270]){
  const visual=farmAnimalVisual(animal,{time,rotation,reducedMotion:true,transient:{state:'eat',start:0,until:3000}});
  assert.equal(visual.src,first.src);assert.equal(visual.frame,0);assert.equal(visual.mirror,false);assert.equal(visual.semanticState,'producing');
 }
 assert.deepEqual(state,before);
});
test('internal status-bar reflow cannot silently cancel a stroke, real window resize still does',()=>{
 const ui=readFileSync(new URL('../farm-ui.mjs',import.meta.url),'utf8');
 const observer=ui.slice(ui.indexOf('const resize=new ResizeObserver'),ui.indexOf('resize.observe(view)'));
 assert.ok(!observer.includes('cancelGesture('));
 assert.ok(observer.includes('addStroke(screenToWorld('));
 assert.match(ui,/listen\(window,'resize',[\s\S]{0,250}cancelGesture\(/);
 const css=readFileSync(new URL('../farm-ui.css',import.meta.url),'utf8');
 const compactStatus=css.match(/\.farm-app\[data-hud=compact\] \.farm-status\s*\{([^}]*)\}/)?.[1];
 assert.ok(compactStatus,'compact HUD has a dedicated status rule');
 assert.match(compactStatus,/position\s*:\s*absolute\s*;/,'status never consumes map layout height');
 assert.match(compactStatus,/pointer-events\s*:\s*none\s*;/,'floating status cannot swallow a gesture');
});
