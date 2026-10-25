import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,executeFarm,advanceFarm} from '../farm-core.mjs';
import {createFarmStore,FARM_SAVE_KEY} from '../farm-save.mjs';
import {createGame} from '../engine.mjs';
import {FARM_STAGES} from '../farm-stage-data.mjs';
import {FARM_CONFIG,levelForXp} from '../farm-config.mjs';
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
const apply=(s,c)=>executeFarm(s,c,s.now).state;
function harvestedFarm(){let s=createFarm(1000);s=apply(s,{type:'plant',itemId:'wheat',ids:['field_1']});s=advanceFarm(s,s.now+120000).state;return apply(s,{type:'harvest',ids:['field_1']});}
function winStage(s,stageId,seed='integration'){
  s=apply(s,{type:'startStage',stageId,seed:`${seed}-${stageId}`});
  const solution=createGame(s.branch.active.level,s.branch.active.seed,'farm').solution;
  for(const tileId of solution)s=apply(s,{type:'stageAction',action:'pick',tileId});
  assert.equal(s.branch.active.status,'won');return s;
}
test('A40/A41: full 24-stage actual victories award exact finite v0.4 budget and escrow locked goods',()=>{
  let s=harvestedFarm();const before=s.coins;
  for(const stage of FARM_STAGES)s=winStage(s,stage.stageId);
  assert.equal(Object.keys(s.branch.stages).length,24);
  assert.equal(s.coins-before,340);assert.equal(s.vouchers,8);
  assert.deepEqual(s.animalCredits,{chicken:20,cow:50});
  assert.equal(Object.keys(s.rewards).filter(k=>k.startsWith('stage_')).length,24);
  assert.equal(s.rewards.stage_F02.items.corn,5);assert.equal(s.rewards.stage_F18.items.fertilizer,1);
  assert.equal(s.inventory.corn||0,0);
  const snapshot=structuredClone(s);
  for(let i=0;i<100;i++)s=apply(s,{type:'recordVictory',stageId:'F24'});
  assert.equal(s.coins,snapshot.coins);assert.equal(s.vouchers,snapshot.vouchers);assert.deepEqual(s.rewards,snapshot.rewards);
  assert.throws(()=>apply(s,{type:'recordVictory',stageId:'F01'}));
  s.xp=FARM_CONFIG.levelXpToNext.slice(0,29).reduce((a,b)=>a+b,0);s.level=levelForXp(s.xp);
  s=apply(s,{type:'claimReward',receiptId:'stage_F02'});assert.equal(s.inventory.corn,5);
  assert.throws(()=>apply(s,{type:'claimReward',receiptId:'stage_F02'}),{code:'ALREADY_CLAIMED'});
});
test('A42: replaying F01 one hundred times never adds permanent resources',()=>{
  let s=winStage(harvestedFarm(),'F01');const before={coins:s.coins,vouchers:s.vouchers,inventory:structuredClone(s.inventory)};
  for(let i=0;i<100;i++)s=winStage(s,'F01',`repeat-${i}`);
  assert.equal(s.coins,before.coins);assert.equal(s.vouchers,before.vouchers);assert.deepEqual(s.inventory,before.inventory);
  assert.equal(Object.keys(s.rewards).filter(k=>k==='stage_F01').length,1);
});
test('A01/A17/A45: farm save transaction reload preserves crops and never touches original campaign keys',()=>{
  const storage=memory();storage.setItem('sheep-pasture-v1','original-main');storage.setItem('sheep-pasture-v1-campaign','original-campaign');
  let time=1000;let store=createFarmStore({storage,locks:null,now:()=>time,monotonicNow:()=>time});
  const plant=store.dispatch({type:'plant',itemId:'wheat',ids:['field_1','field_2','field_3'],commandId:'plant-once'});assert(plant.ok);
  const revision=store.getState().revision;assert(store.dispatch({type:'plant',itemId:'wheat',ids:['field_1','field_2','field_3'],commandId:'plant-once',expectedRevision:0}).ok);
  assert.equal(store.getState().revision,revision);store.close();time+=120001;
  store=createFarmStore({storage,locks:null,now:()=>time,monotonicNow:()=>time});
  assert.equal(store.getState().inventory.wheat,3);
  assert(store.dispatch({type:'harvest',ids:['field_1','field_2','field_3']}).ok);assert.equal(store.getState().inventory.wheat,9);
  const old=store.getState(),realSet=storage.setItem;storage.setItem=()=>{throw Error('quota');};
  const failed=store.dispatch({type:'sell',itemId:'wheat',quantity:2});assert.equal(failed.ok,false);assert.deepEqual(store.getState(),old);storage.setItem=realSet;
  assert.equal(storage.getItem('sheep-pasture-v1'),'original-main');assert.equal(storage.getItem('sheep-pasture-v1-campaign'),'original-campaign');
  const preview=store.importPreview(store.exportSave());assert(preview.ok);store.close();
});
test('A40/A46: persisted winning board and receipt recover together after corrupt newest slot',()=>{
  const storage=memory();let time=1000;let store=createFarmStore({storage,locks:null,now:()=>time,monotonicNow:()=>time});
  assert(store.dispatch({type:'plant',itemId:'wheat',ids:['field_1']}).ok);time+=120000;
  assert(store.dispatch({type:'harvest',ids:['field_1']}).ok);assert(store.dispatch({type:'startStage',stageId:'F01',seed:'persist-win'}).ok);
  const g=store.getState().branch.active,route=createGame(0,g.seed,'farm').solution;
  for(const tileId of route)assert(store.dispatch({type:'stageAction',action:'pick',tileId}).ok);
  const won=store.getState();assert(won.branch.stages.F01.won);assert(won.rewards.stage_F01.claimed);
  time+=1000;assert(store.tick().ok);store.close();
  const slots=['a','b'].map(slot=>({slot,envelope:JSON.parse(storage.getItem(`${FARM_SAVE_KEY}:${slot}`))})).sort((a,b)=>b.envelope.revision-a.envelope.revision);
  storage.setItem(`${FARM_SAVE_KEY}:${slots[0].slot}`,'{corrupt');
  store=createFarmStore({storage,locks:null,now:()=>time,monotonicNow:()=>time});
  assert(store.getState().branch.stages.F01.won);assert(store.getState().rewards.stage_F01.claimed);assert(store.getStatus().warnings.length);store.close();
});
