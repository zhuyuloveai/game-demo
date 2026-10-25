import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,executeFarm,storageUsed} from '../farm-core.mjs';
import {ANIMALS,ITEMS,LEVELS} from '../farm-config.mjs';
import {createFarmAnimalStroke,extendFarmAnimalStroke,createFarmStroke,extendFarmStroke,cancelFarmStroke,finishFarmStroke,previewFarmStroke} from '../farm-gestures.mjs';

const command=(state,action,now=state.now)=>executeFarm(state,action,now).state;
const shelterOf=(state,id)=>state.entities.find(entity=>entity.id===id);
function stockedShelter(configId='chicken'){
  let state=createFarm(0);
  state.level=30;
  state.xp=LEVELS[29].totalXp;
  state.coins=1000000;
  let entityId='shelter_chicken_1';
  if(configId!=='chicken'){
    state=command(state,{type:'buy',category:'shelter',itemId:configId,x:18,y:28});
    entityId=state.entities.at(-1).id;
  }
  const quantity=ANIMALS[configId].capacity-shelterOf(state,entityId).animals.length;
  state=command(state,{type:'buy',category:'animal',entityId,quantity});
  state.inventory[ANIMALS[configId].feedItem]=ANIMALS[configId].capacity;
  return {state,entityId};
}
function targetsFor(state,entityId){
  return shelterOf(state,entityId).animals.map((animal,index)=>({id:animal.id,entityId,left:20+index*16,top:32,right:32+index*16,bottom:44}));
}
function strokeAcross(state,entityId,mode='feedAnimal'){
  const targets=targetsFor(state,entityId),start={x:18,y:38},end={x:18+targets.length*16,y:38};
  const stroke=createFarmAnimalStroke(mode,entityId,start);
  extendFarmAnimalStroke(stroke,end,[...targets].reverse());
  extendFarmAnimalStroke(stroke,start,targets);
  return stroke;
}
function readyShelter(configId='chicken'){
  let {state,entityId}=stockedShelter(configId);
  state=command(state,{type:'feed',entityId});
  state=command(state,{type:'tick'},ANIMALS[configId].durationMs);
  return {state,entityId};
}

test('animal constructors accept only their two modes and keep the existing stroke contract',()=>{
  const point={x:2,y:3};
  for(const mode of ['feedAnimal','collectAnimal']){
    const stroke=createFarmAnimalStroke(mode,'shelter',point);
    assert.deepEqual(stroke,{mode,entityId:'shelter',itemId:null,ids:[],seen:new Set(),last:point,active:true,cancelReason:null});
    assert.equal(finishFarmStroke(stroke),null);
  }
  for(const mode of ['feed','plant','harvest','pan',null])assert.equal(createFarmAnimalStroke(mode,'shelter',point),null);
  for(const entityId of ['',null,1])assert.equal(createFarmAnimalStroke('feedAnimal',entityId,point),null);
  for(const point of [null,{x:NaN,y:0},{x:0,y:Infinity}])assert.equal(createFarmAnimalStroke('feedAnimal','shelter',point),null);
});

for(const configId of Object.keys(ANIMALS))test(`${configId}: one fast swipe and reverse touches all ${ANIMALS[configId].capacity} animals once, then feeds one cycle`,()=>{
  const {state,entityId}=stockedShelter(configId),before=structuredClone(state),stroke=strokeAcross(state,entityId);
  const ids=shelterOf(state,entityId).animals.map(animal=>animal.id);
  assert.deepEqual(stroke.ids,ids);
  assert.equal(stroke.seen.size,ANIMALS[configId].capacity);
  const preview=previewFarmStroke(state,stroke);
  assert.deepEqual(preview.map(row=>row.quantity),ids.map(()=>1));
  assert.ok(preview.every(row=>row.valid&&row.entityId===entityId&&row.animalId===row.id));
  const action=finishFarmStroke(stroke);
  assert.deepEqual(action,{type:'feed',entityId,animalIds:ids});
  assert.equal(finishFarmStroke(stroke),null);
  assert.deepEqual(state,before,'drawing and previewing cannot charge resources');
  const result=executeFarm(state,action,state.now);
  assert.equal(result.state.revision,state.revision+1,'the entire stroke is one transaction');
  assert.equal(result.delta.events.length,ids.length);
  assert.equal(result.state.inventory[ANIMALS[configId].feedItem],0);
  assert.equal(result.state.coins,state.coins,'feeding cannot buy missing feed');
  assert.ok(shelterOf(result.state,entityId).animals.every(animal=>animal.status==='producing'&&animal.readyAt===state.now+ANIMALS[configId].durationMs));
  assert.deepEqual(state,before,'core execution also leaves its input immutable');
});

test('slab intersection uses the path, not rectangle centers or target array order',()=>{
  const entityId='shelter',targets=[
    {id:'last',entityId,left:8,top:8,right:10,bottom:10},
    {id:'off-path',entityId,left:1,top:5,right:2,bottom:6},
    {id:'corner',entityId,left:4,top:2,right:6,bottom:4},
    {id:'first',entityId,left:1,top:1,right:2,bottom:2},
    {id:'past-end',entityId,left:12,top:12,right:13,bottom:13}
  ];
  const stroke=createFarmAnimalStroke('collectAnimal',entityId,{x:0,y:0});
  extendFarmAnimalStroke(stroke,{x:10,y:10},targets);
  assert.deepEqual(stroke.ids,['first','corner','last'],'a tangent corner is an exact hit');
  const reverse=createFarmAnimalStroke('collectAnimal',entityId,{x:10,y:10});
  extendFarmAnimalStroke(reverse,{x:0,y:0},targets);
  assert.deepEqual(reverse.ids,['last','corner','first']);
});

test('stationary, horizontal and vertical paths include boundaries but not nearby rectangles',()=>{
  const entityId='shelter',target={id:'animal',entityId,left:-6,top:-4,right:-2,bottom:4};
  for(const [start,end,hit] of [
    [{x:-6,y:-4},{x:-6,y:-4},true],
    [{x:-8,y:4},{x:0,y:4},true],
    [{x:-2,y:-8},{x:-2,y:8},true],
    [{x:-6.01,y:-8},{x:-6.01,y:8},false],
    [{x:-8,y:4.01},{x:0,y:4.01},false],
    [{x:-8,y:0},{x:-7,y:0},false]
  ]){
    const stroke=createFarmAnimalStroke('feedAnimal',entityId,start);
    extendFarmAnimalStroke(stroke,end,[target]);
    assert.deepEqual(stroke.ids,hit?['animal']:[]);
  }
});

test('matching pointer/rectangle spaces preserve hits through pan and zoom transforms',()=>{
  const {state,entityId}=stockedShelter(),targets=targetsFor(state,entityId);
  for(const scale of [.75,1,1.75])for(const offset of [-921.3,0,215.5]){
    const transform=point=>({x:point.x*scale+offset,y:point.y*scale-offset});
    const transformed=targets.map(target=>({...target,left:target.left*scale+offset,right:target.right*scale+offset,top:target.top*scale-offset,bottom:target.bottom*scale-offset}));
    const stroke=createFarmAnimalStroke('feedAnimal',entityId,transform({x:18,y:38}));
    extendFarmAnimalStroke(stroke,transform({x:114,y:38}),transformed);
    assert.deepEqual(stroke.ids,targets.map(target=>target.id));
  }
});

test('malformed, empty and non-finite target bounds fail closed; invalid pointers cancel pending work',()=>{
  const entityId='shelter',base={id:'bad',entityId,left:0,top:0,right:2,bottom:2};
  const bad=[null,{}, {...base,left:NaN},{...base,right:Infinity},{...base,top:'0'},{...base,left:3},{...base,top:3},{...base,right:0},{...base,bottom:0},{...base,id:''}];
  const stroke=createFarmAnimalStroke('feedAnimal',entityId,{x:-1,y:1});
  extendFarmAnimalStroke(stroke,{x:3,y:1},bad);
  assert.deepEqual(stroke.ids,[]);
  extendFarmAnimalStroke(stroke,{x:-1,y:1},[{...base,id:'good'},{...base,id:'good'}]);
  assert.deepEqual(stroke.ids,['good']);
  extendFarmAnimalStroke(stroke,{x:NaN,y:1},[base]);
  assert.equal(stroke.cancelReason,'invalid-point');
  assert.equal(finishFarmStroke(stroke),null);
  assert.deepEqual(stroke.ids,[]);
});

test('overlapping shelters cannot contribute animals to a stroke owned by another shelter',()=>{
  let {state,entityId}=stockedShelter();
  state=command(state,{type:'buy',category:'shelter',itemId:'chicken',x:18,y:28});
  const otherId=state.entities.at(-1).id;
  state=command(state,{type:'buy',category:'animal',entityId:otherId,quantity:2});
  const own=targetsFor(state,entityId),other=targetsFor(state,otherId),before=structuredClone(state);
  const stroke=createFarmAnimalStroke('feedAnimal',entityId,{x:18,y:38});
  extendFarmAnimalStroke(stroke,{x:114,y:38},[...other,...own]);
  assert.deepEqual(stroke.ids,own.map(target=>target.id));
  const result=executeFarm(state,finishFarmStroke(stroke),state.now);
  assert.deepEqual(shelterOf(result.state,otherId),shelterOf(before,otherId));
  const invalid=createFarmAnimalStroke('feedAnimal',entityId,{x:0,y:0});
  invalid.ids=[other[0].id];
  assert.deepEqual(previewFarmStroke(state,invalid),[{id:other[0].id,entityId,animalId:other[0].id,valid:false,reason:'目标已不存在',quantity:0}]);
});

test('feeding previews only hungry animals and allocates limited configured feed in first-hit order',()=>{
  const {state,entityId}=stockedShelter('cow'),animals=shelterOf(state,entityId).animals;
  state.now=1000;
  animals[1].status='producing';animals[1].readyAt=state.now+1000;
  animals[3].status='ready';animals[3].readyAt=state.now;
  state.inventory.cow_feed=2;
  state.inventory.chicken_feed=20;
  const before=structuredClone(state),stroke=strokeAcross(state,entityId),preview=previewFarmStroke(state,stroke);
  assert.deepEqual(preview.map(row=>row.valid),[true,false,true,false,false]);
  assert.deepEqual(preview.map(row=>row.quantity),[1,0,1,0,1]);
  assert.equal(preview[4].reason,'饲料不足');
  const result=executeFarm(state,finishFarmStroke(stroke),state.now);
  assert.deepEqual(result.delta.events.map(event=>event.id),[animals[0].id,animals[2].id]);
  assert.equal(result.state.inventory.cow_feed,0);
  assert.equal(result.state.inventory.chicken_feed,20);
  assert.deepEqual(state,before);
});

test('collect previews count all existing barn items, ignore silo goods, and reserve one slot per ready animal',()=>{
  const {state,entityId}=readyShelter(),animals=shelterOf(state,entityId).animals;
  animals[1].status='hungry';animals[1].readyAt=0;
  animals[3].status='producing';animals[3].readyAt=state.now+1000;
  state.inventory={wheat:50,chicken_feed:10,milk:10,bolt:10,bread:18};
  assert.equal(storageUsed(state,'barn'),48);
  const before=structuredClone(state),stroke=strokeAcross(state,entityId,'collectAnimal'),preview=previewFarmStroke(state,stroke);
  assert.deepEqual(preview.map(row=>row.valid),[true,false,true,false,false,false]);
  assert.deepEqual(preview.map(row=>row.quantity),[1,0,1,0,1,1]);
  assert.equal(preview[4].reason,'货仓空间不足');
  const action=finishFarmStroke(stroke);
  assert.deepEqual(action,{type:'collectAnimal',entityId,animalIds:animals.map(animal=>animal.id)});
  const result=executeFarm(state,action,state.now);
  assert.equal(result.delta.events.length,2);
  assert.equal(result.state.inventory.egg,2);
  assert.equal(storageUsed(result.state,'barn'),50);
  assert.equal(shelterOf(result.state,entityId).animals[4].status,'ready');
  assert.deepEqual(state,before);
});

test('missing shelter or animal stays invalid without changing preview resources',()=>{
  const {state,entityId}=stockedShelter(),stroke=strokeAcross(state,entityId);
  stroke.ids.unshift('missing-animal');
  assert.equal(previewFarmStroke(state,stroke)[0].reason,'目标已不存在');
  state.entities=state.entities.filter(entity=>entity.id!==entityId);
  assert.ok(previewFarmStroke(state,stroke).every(row=>!row.valid&&row.quantity===0&&row.reason==='目标已不存在'));
});

for(const mode of ['feedAnimal','collectAnimal'])for(const reason of ['second-pointer','pointercancel','blur','background','orientation','toolbar','mode-change','exit','outside-map','selection-change'])test(`${mode}: ${reason} cancels every pending hit with zero execution`,()=>{
  const {state,entityId}=mode==='feedAnimal'?stockedShelter():readyShelter(),before=structuredClone(state),stroke=strokeAcross(state,entityId,mode);
  assert.ok(stroke.ids.length);
  cancelFarmStroke(stroke,reason);
  extendFarmAnimalStroke(stroke,{x:114,y:38},targetsFor(state,entityId));
  let executions=0;
  const action=finishFarmStroke(stroke);
  if(action){executions++;executeFarm(state,action,state.now);}
  assert.equal(executions,0);
  assert.equal(stroke.cancelReason,reason);
  assert.equal(stroke.active,false);
  assert.deepEqual(stroke.ids,[]);
  assert.equal(stroke.seen.size,0);
  assert.deepEqual(previewFarmStroke(state,stroke),[]);
  assert.deepEqual(state,before);
});

for(const mode of ['feedAnimal','collectAnimal'])test(`${mode}: a finished stroke has one immutable command and core receipt prevents replay`,()=>{
  const {state,entityId}=mode==='feedAnimal'?stockedShelter():readyShelter();
  const stroke=strokeAcross(state,entityId,mode),action={...finishFarmStroke(stroke),commandId:`animal-stroke-${mode}`,expectedRevision:state.revision};
  stroke.ids.push('later-mutation');
  assert.equal(action.animalIds.length,6);
  assert.equal(finishFarmStroke(stroke),null);
  const result=executeFarm(state,action,state.now),replayed=executeFarm(result.state,action,state.now);
  assert.equal(result.state.revision,state.revision+1);
  assert.equal(replayed.duplicate,true);
  assert.deepEqual(replayed.state,result.state);
});

test('collection uses the unchanged core material threshold after the whole animal transaction',()=>{
  const {state,entityId}=readyShelter();
  state.inventory={wheat:6,bread:44};
  state.materials.harvestCount=29;
  const stroke=strokeAcross(state,entityId,'collectAnimal'),before=structuredClone(state);
  assert.ok(previewFarmStroke(state,stroke).every(row=>row.valid));
  const result=executeFarm(state,finishFarmStroke(stroke),state.now);
  assert.equal(result.delta.events.length,6);
  assert.equal(result.state.inventory.egg,6);
  assert.equal(storageUsed(result.state,'barn'),50);
  assert.ok(ITEMS[result.state.materials.pending],'only core creates the overflow material');
  assert.equal(result.state.materials.harvestCount,5);
  assert.equal(state.materials.pending,null);
  assert.deepEqual(state,before);
});

test('old crop and whole-shelter feed modes retain their entityIds command contracts',()=>{
  const state=createFarm(0),stroke=createFarmStroke('feed',null,{x:.5,y:.5});
  extendFarmStroke(stroke,{x:1.5,y:.5},()=> 'shelter_chicken_1');
  assert.deepEqual(previewFarmStroke(state,stroke),[{id:'shelter_chicken_1',valid:true,reason:'可喂3只',quantity:3}]);
  assert.deepEqual(finishFarmStroke(stroke),{type:'feed',entityIds:['shelter_chicken_1']});
  for(const mode of ['plant','harvest']){
    const crop=createFarmStroke(mode,'wheat',{x:.5,y:.5});
    extendFarmStroke(crop,{x:1.5,y:.5},cell=>`field_${cell.x+1}`);
    assert.deepEqual(finishFarmStroke(crop),{type:mode,entityIds:['field_1','field_2'],...(mode==='plant'?{itemId:'wheat'}:{})});
  }
});
