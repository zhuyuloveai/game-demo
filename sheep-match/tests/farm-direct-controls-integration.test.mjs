import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,executeFarm,advanceFarm,storageUsed} from '../farm-core.mjs';
import {ANIMALS,LEVELS} from '../farm-config.mjs';
import {createFarmStore} from '../farm-save.mjs';

const owner='shelter_chicken_1';
const shelter=(state,id=owner)=>state.entities.find(entity=>entity.id===id);
const animals=state=>shelter(state).animals;
const apply=(state,command,at=state.now)=>executeFarm(state,command,at);
const memory=()=>{
  const data=new Map();
  return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
};

// These exercise the real transaction/save boundary used by direct animal
// controls. Browser pointer routing, focus and visual hitboxes need browser QA.
test('direct feed IDs affect only touched animals, preserve first-hit order and never double-charge repeats',()=>{
  const state=createFarm(1000),[a,b,c]=animals(state),before=structuredClone(state);
  const result=apply(state,{type:'feed',entityId:owner,animalIds:[c.id,a.id,c.id,a.id]});
  assert.deepEqual(state,before,'constructing a transaction cannot mutate the input snapshot');
  assert.deepEqual(result.delta.events.map(event=>event.id),[c.id,a.id]);
  assert.equal(result.state.inventory.chicken_feed,1);
  assert.equal(result.state.coins,state.coins);
  assert.equal(result.state.revision,state.revision+1,'the whole swipe is one transaction');
  assert.deepEqual(animals(result.state).find(animal=>animal.id===b.id),b,'untouched animal remains hungry');
  for(const id of [c.id,a.id]){
    const animal=animals(result.state).find(animal=>animal.id===id);
    assert.equal(animal.status,'producing');
    assert.equal(animal.readyAt,state.now+ANIMALS.chicken.durationMs);
  }
});

test('feed shortage skips later touched animals without buying or changing untargeted animals',()=>{
  const state=createFarm(1000),[a,b,c]=animals(state);
  state.inventory.chicken_feed=1;
  const before=structuredClone(state),result=apply(state,{type:'feed',entityId:owner,animalIds:[b.id,a.id,b.id]});
  assert.deepEqual(result.delta.events.map(event=>event.id),[b.id]);
  assert.deepEqual(result.skipped.map(item=>({id:item.id,code:item.code})),[{id:a.id,code:'INSUFFICIENT_ITEM'}]);
  assert.equal(result.state.inventory.chicken_feed,0);
  assert.equal(result.state.coins,state.coins);
  assert.deepEqual(animals(result.state).find(animal=>animal.id===c.id),c);
  assert.deepEqual(state,before);
});

test('empty and unknown animal selections never fall back to feeding or collecting the entire shelter',()=>{
  for(const type of ['feed','collectAnimal']){
    let state=createFarm(1000);
    if(type==='collectAnimal'){
      state=apply(state,{type:'feed',entityId:owner}).state;
      state=advanceFarm(state,state.now+ANIMALS.chicken.durationMs).state;
    }
    const before=structuredClone(state);
    for(const animalIds of [[],['animal_missing','animal_missing']]){
      const result=apply(state,{type,entityId:owner,animalIds});
      assert.deepEqual(result.delta.events,[]);
      assert.deepEqual(result.state.inventory,state.inventory);
      assert.deepEqual(shelter(result.state),shelter(state));
      assert.equal(result.state.coins,state.coins);
      assert.equal(result.skipped.length,animalIds.length?1:0);
    }
    assert.deepEqual(state,before);
  }
});

test('a direct animal swipe is owner-scoped, and an animal in another shelter cannot be acted on',()=>{
  let state=createFarm(1000);
  state.level=12;state.xp=LEVELS[11].totalXp;state.coins=10000;
  state=apply(state,{type:'buy',category:'shelter',itemId:'chicken',x:18,y:28}).state;
  const other=state.entities.at(-1).id;
  state=apply(state,{type:'buy',category:'animal',entityId:other,quantity:1}).state;
  const foreign=shelter(state,other).animals[0],selected=animals(state)[1],before=structuredClone(state);
  const result=apply(state,{type:'feed',entityId:owner,animalIds:[foreign.id,selected.id]});
  assert.deepEqual(result.delta.events.map(event=>event.id),[selected.id]);
  assert.deepEqual(result.skipped.map(item=>({id:item.id,code:item.code})),[{id:foreign.id,code:'INVALID_COMMAND'}]);
  assert.deepEqual(shelter(result.state,other),shelter(state,other));
  assert.equal(result.state.inventory.chicken_feed,state.inventory.chicken_feed-1);
  assert.deepEqual(state,before);
});

test('basket swipe obeys barn capacity in first-hit order and keeps full-storage animals ready',()=>{
  let state=apply(createFarm(1000),{type:'feed',entityId:owner}).state;
  state=advanceFarm(state,state.now+ANIMALS.chicken.durationMs).state;
  state.inventory.chicken_feed=49;
  const [a,b,c]=animals(state),before=structuredClone(state);
  const result=apply(state,{type:'collectAnimal',entityId:owner,animalIds:[c.id,a.id,c.id]});
  assert.deepEqual(result.delta.events.map(event=>event.id),[c.id]);
  assert.deepEqual(result.skipped.map(item=>({id:item.id,code:item.code})),[{id:a.id,code:'STORAGE_FULL'}]);
  assert.equal(result.state.inventory.egg,1);
  assert.equal(storageUsed(result.state,'barn'),50);
  assert.equal(result.state.materials.harvestCount,state.materials.harvestCount+1);
  assert.equal(result.state.xp-state.xp,ANIMALS.chicken.xp);
  assert.equal(animals(result.state).find(animal=>animal.id===c.id).status,'hungry');
  for(const animal of [a,b])assert.deepEqual(animals(result.state).find(item=>item.id===animal.id),animal);
  assert.deepEqual(state,before);
});

test('a maturity tick during a basket preview is revalidated at release without collecting untargeted animals',()=>{
  let state=apply(createFarm(1000),{type:'feed',entityId:owner}).state;
  const selected=animals(state)[1],readyAt=selected.readyAt;
  state=advanceFarm(state,readyAt-1).state;
  const before=structuredClone(state);
  const early=apply(state,{type:'collectAnimal',entityId:owner,animalIds:[selected.id]},readyAt-1);
  assert.deepEqual(early.delta.events,[]);
  assert.equal(early.skipped[0].code,'NOT_READY');
  const result=apply(state,{type:'collectAnimal',entityId:owner,animalIds:[selected.id]},readyAt);
  assert.deepEqual(result.delta.events.map(event=>event.id),[selected.id]);
  assert.equal(result.state.inventory.egg,1);
  assert.deepEqual(animals(result.state).map(animal=>animal.status),['ready','hungry','ready']);
  assert.deepEqual(state,before);
});

test('the saved per-animal command survives reload and a duplicate release cannot charge or collect twice',()=>{
  const storage=memory();let time=1000;
  let store=createFarmStore({storage,locks:null,now:()=>time,monotonicNow:()=>time});
  const selected=animals(store.getState())[1].id;
  const command={type:'feed',entityId:owner,animalIds:[selected,selected],commandId:'direct-feed-once'};
  const fed=store.dispatch(command);assert.equal(fed.ok,true);
  const snapshot=store.getState(),duplicate=store.dispatch(command);
  assert.equal(duplicate.duplicate,true);
  assert.deepEqual(store.getState(),snapshot);
  store.close();
  store=createFarmStore({storage,locks:null,now:()=>time,monotonicNow:()=>time});
  assert.deepEqual(animals(store.getState()).map(animal=>animal.status),['hungry','producing','hungry']);
  assert.equal(store.getState().inventory.chicken_feed,2);
  time+=ANIMALS.chicken.durationMs;
  const collect={type:'collectAnimal',entityId:owner,animalIds:[selected,selected],commandId:'direct-basket-once'};
  assert.equal(store.dispatch(collect).ok,true);
  const collected=store.getState();
  assert.equal(collected.inventory.egg,1);
  assert.equal(store.dispatch(collect).duplicate,true);
  assert.deepEqual(store.getState(),collected);
  store.close();
});

test('failed save rolls back the entire per-animal feed or basket stroke, permitting a clean retry',()=>{
  const storage=memory();let time=1000;
  const store=createFarmStore({storage,locks:null,now:()=>time,monotonicNow:()=>time});
  const [a,b,c]=animals(store.getState());
  const commands=[
    {type:'feed',entityId:owner,animalIds:[c.id,a.id],commandId:'direct-feed-retry'},
    {type:'collectAnimal',entityId:owner,animalIds:[c.id,a.id],commandId:'direct-basket-retry'}
  ];
  for(const command of commands){
    if(command.type==='collectAnimal'){time+=ANIMALS.chicken.durationMs;assert.equal(store.tick().ok,true);}
    const before=store.getState(),saved=new Map(storage.data),write=storage.setItem;
    storage.setItem=()=>{throw new Error('quota');};
    const failed=store.dispatch(command);
    assert.equal(failed.ok,false);assert.equal(failed.code,'SAVE_FAILED');
    assert.deepEqual(store.getState(),before);
    assert.deepEqual(storage.data,saved);
    storage.setItem=write;
    const retried=store.dispatch(command);
    assert.equal(retried.ok,true);assert.notEqual(retried.duplicate,true);
    assert.deepEqual(retried.delta.events.map(event=>event.id),[c.id,a.id]);
    assert.deepEqual(animals(store.getState()).find(animal=>animal.id===b.id),b);
  }
  assert.equal(store.getState().inventory.egg,2);
  assert.equal(store.getState().inventory.chicken_feed,1);
  store.close();
});

const gestureApi=()=>import('../farm-gestures.mjs');
const animalRects=state=>animals(state).map((animal,index)=>({
  id:animal.id,entityId:owner,left:10+40*index,top:10,right:30+40*index,bottom:30
}));

test('a fast animal-tool sweep and repeated backtracking become exactly one saved owner-scoped transaction',async()=>{
  const {createFarmAnimalStroke,extendFarmAnimalStroke,finishFarmStroke,previewFarmStroke}=await gestureApi();
  const storage=memory(),store=createFarmStore({storage,locks:null,now:()=>1000,monotonicNow:()=>1000});
  const before=store.getState(),diskBefore=new Map(storage.data),ids=animals(before).map(animal=>animal.id);
  const targets=[...animalRects(before),{id:'foreign-animal',entityId:'other-shelter',left:130,top:10,right:150,bottom:30}];
  const stroke=createFarmAnimalStroke('feedAnimal',owner,{x:0,y:20});
  extendFarmAnimalStroke(stroke,{x:160,y:20},targets);
  extendFarmAnimalStroke(stroke,{x:0,y:20},targets);
  const preview=previewFarmStroke(before,stroke);
  assert.equal(preview.filter(item=>item.valid).length,3);
  assert.deepEqual(store.getState(),before,'pointer preview never deducts feed');
  assert.deepEqual(storage.data,diskBefore,'pointer preview never writes the save');
  const command=finishFarmStroke(stroke);
  assert.deepEqual(command,{type:'feed',entityId:owner,animalIds:ids});
  assert.equal(finishFarmStroke(stroke),null,'one release consumes the stroke');
  const result=store.dispatch(command);
  assert.equal(result.ok,true);assert.deepEqual(result.delta.events.map(event=>event.id),ids);
  assert.equal(store.getState().inventory.chicken_feed,0);
  assert.equal(store.getState().revision,before.revision+1);
  store.close();
});

test('animal-hit order, not DOM target order, decides which animal receives the last feed',async()=>{
  const {createFarmAnimalStroke,extendFarmAnimalStroke,finishFarmStroke,previewFarmStroke}=await gestureApi();
  const state=createFarm(1000),[a,b,c]=animals(state);state.inventory.chicken_feed=1;
  const before=structuredClone(state),targets=animalRects(state);
  const stroke=createFarmAnimalStroke('feedAnimal',owner,{x:80,y:20});
  extendFarmAnimalStroke(stroke,{x:0,y:20},targets);
  extendFarmAnimalStroke(stroke,{x:120,y:20},targets);
  const preview=previewFarmStroke(state,stroke);
  assert.equal(preview.filter(item=>item.valid).length,1);
  const command=finishFarmStroke(stroke);
  assert.deepEqual(command.animalIds,[b.id,a.id,c.id]);
  const result=apply(state,command);
  assert.deepEqual(result.delta.events.map(event=>event.id),[b.id]);
  assert.deepEqual(animals(result.state).map(animal=>animal.status),['hungry','producing','hungry']);
  assert.equal(result.state.coins,state.coins);assert.deepEqual(state,before);
});

test('a basket tool touching one visible animal collects only that animal, not its shelter siblings',async()=>{
  const {createFarmAnimalStroke,extendFarmAnimalStroke,finishFarmStroke,previewFarmStroke}=await gestureApi();
  let state=apply(createFarm(1000),{type:'feed',entityId:owner}).state;
  state=advanceFarm(state,state.now+ANIMALS.chicken.durationMs).state;
  const before=structuredClone(state),selected=animals(state)[1];
  const stroke=createFarmAnimalStroke('collectAnimal',owner,{x:40,y:20});
  extendFarmAnimalStroke(stroke,{x:80,y:20},animalRects(state));
  const preview=previewFarmStroke(state,stroke);
  assert.equal(preview.length,1);assert.equal(preview[0].valid,true);
  const command=finishFarmStroke(stroke);
  assert.deepEqual(command,{type:'collectAnimal',entityId:owner,animalIds:[selected.id]});
  const result=apply(state,command);
  assert.equal(result.state.inventory.egg,1);
  assert.deepEqual(animals(result.state).map(animal=>animal.status),['ready','hungry','ready']);
  assert.deepEqual(state,before);
});

test('all interruption paths discard animal sweeps with no transaction, inventory change or save write',async()=>{
  const {createFarmAnimalStroke,extendFarmAnimalStroke,cancelFarmStroke,finishFarmStroke,previewFarmStroke}=await gestureApi();
  for(const mode of ['feedAnimal','collectAnimal'])for(const reason of ['second-pointer','pointercancel','outside','blur','background','orientation','resize','toolbar','mode-change','exit']){
    let state=createFarm(1000);
    if(mode==='collectAnimal'){
      state=apply(state,{type:'feed',entityId:owner}).state;
      state=advanceFarm(state,state.now+ANIMALS.chicken.durationMs).state;
    }
    const before=structuredClone(state),stroke=createFarmAnimalStroke(mode,owner,{x:0,y:20});
    extendFarmAnimalStroke(stroke,{x:120,y:20},animalRects(state));
    assert.equal(previewFarmStroke(state,stroke).length,3);
    cancelFarmStroke(stroke,reason);
    assert.equal(finishFarmStroke(stroke),null,`${mode}/${reason} cannot submit`);
    assert.deepEqual(previewFarmStroke(state,stroke),[]);
    assert.deepEqual(state,before);
  }
});

test('a clock-rendered animal sweep revalidates current state while keeping already captured target identity',async()=>{
  const {createFarmAnimalStroke,extendFarmAnimalStroke,finishFarmStroke,previewFarmStroke}=await gestureApi();
  let state=apply(createFarm(1000),{type:'feed',entityId:owner}).state;
  const selected=animals(state)[1],stroke=createFarmAnimalStroke('collectAnimal',owner,{x:40,y:20});
  extendFarmAnimalStroke(stroke,{x:80,y:20},animalRects(state));
  const pending=structuredClone(state);
  assert.equal(previewFarmStroke(state,stroke)[0].valid,false);
  assert.deepEqual(state,pending);
  state=advanceFarm(state,selected.readyAt).state;
  const ready=structuredClone(state);
  assert.equal(previewFarmStroke(state,stroke)[0].valid,true);
  assert.deepEqual(state,ready,'rendering a newly ready animal cannot execute its tool');
  const command=finishFarmStroke(stroke);
  assert.deepEqual(command.animalIds,[selected.id]);
  const result=apply(state,command);
  assert.equal(result.state.inventory.egg,1);
  assert.deepEqual(animals(result.state).map(animal=>animal.status),['ready','hungry','ready']);
});
