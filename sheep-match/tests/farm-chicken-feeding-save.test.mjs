import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm} from '../farm-core.mjs';
import {ANIMALS,LEVELS} from '../farm-config.mjs';
import {createFarmStore,makeEnvelope,validateEnvelope,validateFarmState} from '../farm-save.mjs';

const PEN='shelter_chicken_1';
const STARTERS=['animal_100','animal_101','animal_102'];
function fixture(){
  const disk=new Map();
  const storage={getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,String(value)),removeItem:key=>disk.delete(key)};
  let wall=1_000_000,mono=0;
  const options={storage,now:()=>wall,monotonicNow:()=>mono,locks:null};
  return {options,store:createFarmStore(options),advance(ms){wall+=ms;mono+=ms;}};
}
const chickens=store=>store.getState().entities.find(e=>e.id===PEN).animals;
function ok(store,command){const result=store.dispatch(command);assert.equal(result.ok,true,result.message);return result;}
function importState(store,state){const preview=store.importPreview(JSON.stringify(makeEnvelope(state)));assert.equal(preview.ok,true,preview.message);assert.equal(store.confirmImport(preview.token).ok,true);}

test('normal fourth, fifth and sixth chicken purchases can feed and persist without polluting starter tutorial',()=>{
  const {store,options}=fixture();
  for(let number=4;number<=6;number++){
    const coins=store.getState().coins;
    ok(store,{type:'buy',category:'animal',entityId:PEN,quantity:1});
    assert.equal(store.getState().coins,coins-20);
    const animal=chickens(store).at(-1),feed=store.getState().inventory.chicken_feed;
    const command={type:'feed',entityId:PEN,animalIds:[animal.id],commandId:`feed-new-${number}`};
    ok(store,command);
    assert.equal(chickens(store).at(-1).status,'producing');
    assert.equal(store.getState().inventory.chicken_feed,feed-1);
    assert.deepEqual(store.getState().tutorial.initialFed??{},{});
    assert.equal(store.getState().tutorial.completed.T04,undefined);
    const after=store.getState();
    assert.equal(ok(store,command).duplicate,true);
    assert.deepEqual(store.getState(),after);
    const repeated=store.dispatch({...command,commandId:`second-feed-${number}`});
    assert.equal(repeated.ok,true);
    assert.equal(repeated.skipped[0].code,'NOT_READY');
    assert.equal(store.getState().inventory.chicken_feed,feed-1);
    assert.equal(validateEnvelope(JSON.parse(store.exportSave())),true);
  }
  assert.equal(chickens(store).length,6);
  assert.equal(store.dispatch({type:'buy',category:'animal',entityId:PEN,quantity:1}).error,'COUNT_LIMIT');
  const saved=store.getState();store.close();
  const restored=createFarmStore(options);
  assert.deepEqual(restored.getState(),saved);
  restored.close();
});

test('full pen batch feeding records only starter IDs and still completes initial tutorial',()=>{
  const {store,options}=fixture();
  const legacy=createFarm(1_000_000);legacy.inventory.chicken_feed=6;
  // A valid older save may have no optional initialFed field at all.
  delete legacy.tutorial.initialFed;
  importState(store,legacy);
  ok(store,{type:'buy',category:'animal',entityId:PEN,quantity:3});
  ok(store,{type:'feed',entityId:PEN});
  assert.equal(chickens(store).filter(a=>a.status==='producing').length,6);
  assert.equal(store.getState().inventory.chicken_feed,0);
  assert.deepEqual(Object.keys(store.getState().tutorial.initialFed).sort(),STARTERS);
  assert.equal(store.getState().tutorial.completed.T04,true);
  assert.equal(validateEnvelope(JSON.parse(store.exportSave())),true);
  const after=store.getState();
  ok(store,{type:'feed',entityId:PEN});
  assert.equal(store.getState().inventory.chicken_feed,0);
  assert.deepEqual(store.getState().tutorial,after.tutorial);
  store.close();
  const restored=createFarmStore(options);
  assert.equal(chickens(restored).filter(a=>a.status==='producing').length,6);
  assert.deepEqual(restored.getState().tutorial,after.tutorial);
  restored.close();
});

test('existing partial tutorial records survive new chicken feeding and strict import validation remains',()=>{
  const {store}=fixture();
  ok(store,{type:'feed',entityId:PEN,animalIds:[STARTERS[0]]});
  ok(store,{type:'buy',category:'animal',entityId:PEN,quantity:1});
  ok(store,{type:'feed',entityId:PEN,animalIds:[chickens(store).at(-1).id]});
  assert.deepEqual(store.getState().tutorial.initialFed,{animal_100:true});
  assert.equal(store.getState().tutorial.completed.T04,undefined);
  for(const invalid of [{animal_103:true},{unknown:true},{animal_100:false}]){
    const bad=createFarm(0);bad.tutorial.initialFed=invalid;
    assert.throws(()=>validateFarmState(bad),error=>error.code==='INVALID_SAVE');
  }
  store.close();
});


test('new chickens finish production, collect exactly once, and round-trip through export and reload',()=>{
  const {store,options,advance}=fixture();
  ok(store,{type:'buy',category:'animal',entityId:PEN,quantity:3});
  const ids=chickens(store).slice(3).map(a=>a.id);
  ok(store,{type:'feed',entityId:PEN,animalIds:ids});
  advance(ANIMALS.chicken.durationMs);
  assert.equal(store.tick().ok,true);
  assert.equal(chickens(store).filter(a=>a.status==='ready').length,3);
  const command={type:'collectAnimal',entityId:PEN,animalIds:ids,commandId:'collect-new-chickens'};
  ok(store,command);
  assert.equal(store.getState().inventory.egg,3);
  assert.equal(chickens(store).filter(a=>a.status==='hungry').length,6);
  assert.equal(ok(store,command).duplicate,true);
  ok(store,{...command,commandId:'collect-again'});
  assert.equal(store.getState().inventory.egg,3);
  const exported=store.exportSave(),saved=store.getState();
  assert.equal(validateEnvelope(JSON.parse(exported)),true);
  store.close();
  const reloaded=createFarmStore(options);
  assert.deepEqual(reloaded.getState(),saved);
  reloaded.close();
  const imported=fixture().store;
  const preview=imported.importPreview(exported);
  assert.equal(preview.ok,true);
  assert.equal(imported.confirmImport(preview.token).ok,true);
  assert.equal(imported.getState().inventory.egg,3);
  assert.deepEqual(imported.getState().tutorial.initialFed??{},{});
  imported.close();
});

test('starter tutorial follows moved starter identities but never records moved purchased chickens',()=>{
  const {store}=fixture();
  const state=createFarm(1_000_000);
  state.level=12;state.xp=LEVELS[11].totalXp;state.coins=1000;state.inventory.chicken_feed=4;
  importState(store,state);
  ok(store,{type:'buy',category:'shelter',itemId:'chicken',x:18,y:28});
  const second=store.getState().entities.filter(e=>e.kind==='shelter').find(e=>e.id!==PEN).id;
  ok(store,{type:'buy',category:'animal',entityId:PEN,quantity:1});
  const purchased=chickens(store).at(-1).id;
  for(const id of [...STARTERS,purchased])ok(store,{type:'moveAnimal',entityId:PEN,targetEntityId:second,animalId:id});
  ok(store,{type:'feed',entityId:second,animalIds:[purchased]});
  assert.deepEqual(store.getState().tutorial.initialFed??{},{});
  assert.equal(store.getState().tutorial.completed.T04,undefined);
  ok(store,{type:'feed',entityId:second,animalIds:STARTERS});
  assert.deepEqual(Object.keys(store.getState().tutorial.initialFed).sort(),STARTERS);
  assert.equal(store.getState().tutorial.completed.T04,true);
  assert.equal(store.getState().inventory.chicken_feed,0);
  assert.equal(validateEnvelope(JSON.parse(store.exportSave())),true);
  store.close();
});
