import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm} from '../farm-core.mjs';
import {validateFarmState,createFarmStore,FARM_SAVE_KEY} from '../farm-save.mjs';
import {ANIMALS,BUILDINGS,FRUITS,DECORATIONS,REWARD_DECORATIONS} from '../farm-config.mjs';
import {validateLayout} from '../farm-layout.mjs';
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};

test('schema reuse still validates every object and rejects unknown or missing fields',()=>{
 const state=createFarm(1000);assert.equal(validateFarmState(state),true);
 for(const mutate of [s=>s.entities[0].unexpected=true,s=>s.camera.unexpected=true,s=>delete s.tutorial.completed,s=>s.entities[0].kind='unknown']){
  const invalid=structuredClone(state);mutate(invalid);assert.throws(()=>validateFarmState(invalid));
  assert.equal(validateFarmState(state),true);
 }
 assert.equal(validateFarmState(freeze(structuredClone(state))),true);
});
test('nested prototype-pollution keys are rejected even after schemas have been cached',()=>{
 const state=createFarm(1000);validateFarmState(state);
 for(const key of ['__proto__','constructor','prototype']){
  const invalid=structuredClone(state);invalid.camera=JSON.parse(JSON.stringify(invalid.camera).replace(/}$/,`,"${key}":{}}`));
  assert.throws(()=>validateFarmState(invalid),e=>e.code==='INVALID_SAVE');
 }
});
test('configuration key enumerations happen once per validation, not once per entity',()=>{
 const tables=new Set([ANIMALS,BUILDINGS,FRUITS,DECORATIONS,REWARD_DECORATIONS]),original=Object.keys,state=createFarm(1000);let count=0;
 Object.keys=value=>{if(tables.has(value))count++;return original(value);};
 try{validateFarmState(state);}finally{Object.keys=original;}
 assert.equal(count,5);
});
test('mutable config additions and removals are observed between validation calls',()=>{
 const state=createFarm(1000),shelter=state.entities.find(e=>e.kind==='shelter'),config=ANIMALS[shelter.configId];
 validateFarmState(state);const alias='qa_dynamic_chicken';
 try{
  ANIMALS[alias]={...config,id:alias};shelter.configId=alias;for(const animal of shelter.animals)animal.configId=alias;
  assert.equal(validateFarmState(state),true);
  delete ANIMALS[alias];assert.throws(()=>validateFarmState(state),e=>e.code==='INVALID_SAVE');
  ANIMALS[alias]={...config,id:alias};assert.equal(validateFarmState(state),true);
 }finally{delete ANIMALS[alias];}
});
test('reused floodfill directions keep valid layout and blocked exit checks',()=>{
 const state=createFarm(1000);assert.equal(validateLayout(state).ok,true);
 const field=state.entities.find(e=>e.kind==='field');field.x=32;field.y=47;
 assert.equal(validateLayout(state).ok,false);
 assert.equal(validateLayout(createFarm(1000)).ok,true);
});
test('durable tick still writes a verified snapshot and rejects corrupt readback',()=>{
 const data=new Map();let now=1000,mono=0,writes=0;
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes++;data.set(k,v);},removeItem:k=>data.delete(k)};
 const store=createFarmStore({storage,locks:null,now:()=>now,monotonicNow:()=>mono});
 store.dispatch({type:'setSettings',settings:{sound:false}});const before=store.getState(),count=writes;
 now+=1000;mono+=1000;assert.equal(store.tick().ok,true);assert.equal(writes-count,2);
 // The next commit targets a; corrupt the target through the same readback path.
 const set=storage.setItem;storage.setItem=(k,v)=>set(k,k===FARM_SAVE_KEY+':a'?'broken':v);
 const stable=store.getState();now+=1000;mono+=1000;
 assert.equal(store.tick().ok,false);assert.deepEqual(store.getState(),stable);assert(stable.now>before.now);store.close();
});
