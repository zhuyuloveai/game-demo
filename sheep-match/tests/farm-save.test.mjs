import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,executeFarm} from '../farm-core.mjs';
import {createFarmStore,makeEnvelope,validateEnvelope,validateFarmState,canonicalStringify,checksum,FARM_SAVE_KEY,MAX_IMPORT_BYTES,migrateEnvelope} from '../farm-save.mjs';
class MemoryStorage {
 constructor(){this.data=new Map();this.fail=false;this.failPointer=false;this.corrupt=false;}
 getItem(k){return this.data.get(k)??null;}
 setItem(k,v){if(this.fail||this.failPointer&&k.endsWith(':active'))throw Error('quota');this.data.set(k,this.corrupt&&/[ab]$/.test(k)?'{bad':String(v));}
 removeItem(k){this.data.delete(k);}
}
const fixtures=()=>{const storage=new MemoryStorage();let wall=1_000_000,mono=0;const options={storage,now:()=>wall,monotonicNow:()=>mono,locks:null};return {storage,options,store:createFarmStore(options),advance(ms){wall+=ms;mono+=ms;},setWall(v){wall=v;},setMono(v){mono=v;}};};
const settings=(commandId,value=false)=>({type:'setSettings',settings:{sound:value},commandId});

test('farm save namespace is independent; envelope validates initial state',()=>{
 const f=fixtures();f.storage.setItem('sheep-match-save','original');assert.equal(validateFarmState(createFarm(0)),true);
 assert.equal(f.store.dispatch(settings('one')).ok,true);assert.equal(f.storage.getItem('sheep-match-save'),'original');
 assert.ok(f.storage.getItem(`${FARM_SAVE_KEY}:a`));assert.equal(validateEnvelope(JSON.parse(f.storage.getItem(`${FARM_SAVE_KEY}:a`))),true);
});
test('success is published only after write/readback; failed saves leave all state unchanged',()=>{
 const f=fixtures(),before=f.store.getState();let observed=null;f.store.subscribe(state=>observed=state);f.storage.fail=true;
 const result=f.store.dispatch({type:'plant',entityIds:['field_1','field_2'],itemId:'wheat',commandId:'plant'});
 assert.equal(result.ok,false);assert.equal(result.error,'SAVE_FAILED');assert.deepEqual(f.store.getState(),before);assert.deepEqual(observed,before);
 f.storage.fail=false;assert.equal(f.store.dispatch({type:'plant',entityIds:['field_1','field_2'],itemId:'wheat',commandId:'plant'}).ok,true);assert.equal(f.store.getState().inventory.wheat,4);
});
test('corrupted write readback rolls back nonactive slot and does not apply command',()=>{
 const f=fixtures();f.store.dispatch(settings('one'));const before=f.store.getState();f.storage.corrupt=true;
 assert.equal(f.store.dispatch(settings('two',true)).ok,false);assert.deepEqual(f.store.getState(),before);assert.equal(f.storage.getItem(`${FARM_SAVE_KEY}:b`),null);
 f.storage.corrupt=false;const reload=createFarmStore(f.options);assert.equal(reload.getState().settings.sound,false);
});
test('active pointer failures do not turn committed snapshots into failed actions',()=>{
 const f=fixtures();f.storage.failPointer=true;const result=f.store.dispatch(settings('one'));assert.equal(result.ok,true);
 assert.equal(createFarmStore(f.options).getState().settings.sound,false);assert.ok(f.store.status.warnings.some(x=>x.startsWith('活动指针')));
});
test('A/B recovery chooses highest valid revision despite stale pointer or corrupt slot',()=>{
 const f=fixtures();f.store.dispatch(settings('one'));f.store.dispatch(settings('two',true));f.storage.setItem(`${FARM_SAVE_KEY}:active`,'a');
 assert.equal(createFarmStore(f.options).getState().settings.sound,true);
 f.storage.setItem(`${FARM_SAVE_KEY}:b`,'broken');const restored=createFarmStore(f.options);
 assert.equal(restored.getState().settings.sound,false);assert.ok(restored.status.warnings.some(x=>x.includes('损坏')));
});
test('both corrupt slots never silently overwrite data with a fresh farm',()=>{
 const f=fixtures();f.storage.setItem(`${FARM_SAVE_KEY}:a`,'broken');f.storage.setItem(`${FARM_SAVE_KEY}:b`,'broken');const store=createFarmStore(f.options);
 assert.equal(store.readOnly,true);assert.equal(store.status.recoveryRequired,true);assert.equal(store.dispatch(settings('write')).ok,false);assert.equal(f.storage.getItem(`${FARM_SAVE_KEY}:a`),'broken');
});
test('command retry is exactly once across restart even if expected revision is old',()=>{
 const f=fixtures(),command={type:'sell',itemId:'wheat',quantity:2,commandId:'sell-once',expectedRevision:0};assert.equal(f.store.dispatch(command).ok,true);
 const once=f.store.getState(),reloaded=createFarmStore(f.options),repeat=reloaded.dispatch(command);assert.equal(repeat.ok,true);assert.equal(repeat.duplicate,true);assert.equal(reloaded.getState().coins,once.coins);assert.equal(reloaded.getState().inventory.wheat,4);
});
test('foreground production uses monotonic time, not changed device wall clock',()=>{
 const f=fixtures();f.store.dispatch({type:'plant',itemId:'wheat',entityIds:['field_1']});const planted=f.store.getState().now;
 f.setWall(10);f.setMono(120_000);assert.equal(f.store.tick().ok,true);assert.equal(f.store.getState().now,planted+120_000);
 assert.equal(f.store.dispatch({type:'harvest',entityIds:['field_1']}).ok,true);assert.equal(f.store.getState().inventory.wheat,7);
});
test('backward restart clamps to zero; multi-day absence is not capped at 24h',()=>{
 const f=fixtures();f.store.dispatch(settings('one'));const saved=f.store.getState().now;f.setWall(0);
 const backwards=createFarmStore(f.options);assert.equal(backwards.getState().now,saved);assert.ok(backwards.status.warnings.some(x=>x.startsWith('设备时间')));
 f.setWall(1_000_000+5*86_400_000);const later=createFarmStore(f.options);assert.equal(later.getState().now,saved+5*86_400_000);
});
test('fallback detects conflicting snapshots and stops instead of merging currency',()=>{
 const f=fixtures(),other=createFarmStore(f.options);f.store.dispatch({type:'sell',itemId:'wheat',quantity:2});
 assert.equal(other.dispatch({type:'sell',itemId:'wheat',quantity:2}).error,'STALE_REVISION');assert.equal(other.readOnly,true);assert.equal(other.getState().coins,100);
});
test('import validates before confirmation, backs up current and original, then replaces once',()=>{
 const f=fixtures();f.store.dispatch({type:'sell',itemId:'wheat',quantity:2});const before=f.store.getState();
 const external=makeEnvelope(createFarm(3000),{savedAtWallMs:3000});external.payload.coins=777;external.checksum=checksum(Object.fromEntries(Object.entries(external).filter(([key])=>key!=='checksum')));
 const text=JSON.stringify(external),preview=f.store.importPreview(text);assert.equal(preview.ok,true);assert.equal(preview.summary.coins,777);assert.deepEqual(f.store.getState(),before);
 assert.equal(f.store.confirmImport(preview.token).ok,true);assert.equal(f.store.getState().coins,777);assert.ok(f.storage.getItem(`${FARM_SAVE_KEY}:before-import`));assert.equal(f.storage.getItem(`${FARM_SAVE_KEY}:import-original`),text);assert.equal(f.store.confirmImport(preview.token).ok,false);
});
test('future schema, unknown critical fields, negative items and bad checksum do not replace state',()=>{
 for(const mutate of [e=>{e.schemaVersion=99;},e=>{e.payload.futureCurrency=12;},e=>{e.payload.inventory.wheat=-1;},e=>{e.payload.inventory.unknown=1;},e=>{e.payload.entities[3].x=0;},e=>{e.payload.npc.boxes[0].listing={itemId:'wheat',quantity:1,tier:1,coins:-10,readyAt:1,day:1,status:'sold'};},e=>{e.payload.branch.active={mode:'farm'};}]){
  const f=fixtures(),before=f.store.getState(),e=makeEnvelope(createFarm(0));mutate(e);delete e.checksum;e.checksum=checksum(e);
  assert.equal(f.store.importPreview(JSON.stringify(e)).ok,false);assert.deepEqual(f.store.getState(),before);
 }
 const f=fixtures();const e=makeEnvelope(createFarm(0));e.payload.coins++;assert.equal(f.store.importPreview(JSON.stringify(e)).error,'CHECKSUM_MISMATCH');
 assert.equal(f.store.importPreview(' '.repeat(MAX_IMPORT_BYTES+1)).error,'FILE_TOO_LARGE');
});
test('failed import backup never replaces economic state',()=>{
 const f=fixtures(),before=f.store.getState(),preview=f.store.importPreview(f.store.exportSave());f.storage.fail=true;
 assert.equal(f.store.confirmImport(preview.token).ok,false);assert.deepEqual(f.store.getState(),before);
});
test('recovery shows exactly recent two snapshots and restores through a new revision',()=>{
 const f=fixtures();f.store.dispatch(settings('a'));f.store.dispatch(settings('b',true));f.store.dispatch(settings('c'));
 const list=f.store.recoveries();assert.equal(list.length,2);assert.deepEqual(list.map(x=>x.revision),[3,2]);
 assert.equal(f.store.recover(2).ok,true);assert.equal(f.store.getState().revision,4);assert.equal(f.store.getState().settings.sound,true);
});
test('drafts contain only positions and never roll back economic state',()=>{
 const f=fixtures(),draft=f.store.beginLayout();draft.positions[3].x=31;draft.coins=999999;assert.equal(f.store.saveDraft(draft).ok,true);
 const restored=f.store.loadDraft();assert.equal(restored.positions[3].x,31);assert.equal(restored.coins,undefined);assert.equal(f.store.getState().coins,100);
 f.store.clearDraft();assert.equal(f.store.loadDraft(),null);
});
test('old schema requires explicit sequential migration; originals are not guessed',()=>{
 const e=makeEnvelope(createFarm(0));e.schemaVersion=0;delete e.checksum;e.checksum=checksum(e);
 assert.throws(()=>migrateEnvelope(e),{code:'MIGRATION_REQUIRED'});
 const migrated=migrateEnvelope(e,{0:old=>makeEnvelope(old.payload,{saveId:old.saveId,savedAtWallMs:old.savedAtWallMs})});assert.equal(migrated.schemaVersion,1);
});
test('Web Locks allow only one writer and release permits explicit takeover',async()=>{
 let held=false;const locks={request:async(name,options,callback)=>{if(held)return callback(null);held=true;try{return await callback({name});}finally{held=false;}}};
 const f=fixtures();f.store.close();const one=createFarmStore({...f.options,locks}),two=createFarmStore({...f.options,locks});
 assert.equal(await one.ready,true);assert.equal(await two.ready,false);assert.equal(two.readOnly,true);assert.equal(two.dispatch(settings('no')).error,'READ_ONLY');
 assert.equal(one.dispatch(settings('yes')).ok,true);one.close();await Promise.resolve();assert.equal(await two.takeover(),true);assert.equal(two.getState().settings.sound,false);two.close();
});
test('state snapshots returned to UI cannot mutate authoritative memory',()=>{
 const f=fixtures(),view=f.store.getState();view.coins=999999;view.entities=[];assert.equal(f.store.getState().coins,100);assert.equal(f.store.dispatch(settings('one')).ok,true);
});

test('full production snapshots, frozen queued recipes, orders and rotating machines round-trip',()=>{
 let state=createFarm(0);state.coins=100000;state.xp=200000;state.level=30;state.storage={silo:{capacity:4100,upgrades:100},barn:{capacity:4100,upgrades:100}};state.inventory={wheat:50,corn:50,chicken_feed:3};
 const command=(type,rest={},now=state.now)=>{state=executeFarm(state,{type,...rest},now).state;assert.equal(validateFarmState(state),true);};
 command('buy',{category:'machine',configId:'bakery',x:32,y:32});const bakery=state.entities.find(e=>e.configId==='bakery');
 command('completeBuilding',{entityId:bakery.id},10000);command('enqueue',{entityId:bakery.id,recipeId:'bread'});command('enqueue',{entityId:bakery.id,recipeId:'bread'});
 command('buy',{category:'machine',configId:'feed_mill_1',x:36,y:32,rotation:90});
 command('buy',{category:'fruit',configId:'apple',x:28,y:36});command('buy',{category:'decoration',configId:'arch',x:30,y:36});
 command('listNpcStall',{boxId:'box_1',itemId:'wheat',quantity:2,tier:1});
 const raw=JSON.stringify(makeEnvelope(state,{savedAtWallMs:state.now}));const storage=new MemoryStorage();storage.setItem(`${FARM_SAVE_KEY}:a`,raw);
 const store=createFarmStore({storage,now:()=>10000+86400000*2,monotonicNow:()=>0,locks:null});assert.equal(store.status.recoveryRequired,false);assert.equal(store.getState().entities.find(e=>e.id===bakery.id).completed.length,2);assert.equal(store.dispatch({type:'collectMachine',entityId:bakery.id}).ok,true);
 assert.equal(store.importPreview(store.exportSave()).ok,true);
});
test('valid farm-v1 active board round-trips but unrelated mainline boards are rejected',()=>{
 let state=createFarm(0);state.branch.unlocked=true;state=executeFarm(state,{type:'startStage',stageId:'F01'},0).state;
 assert.equal(validateFarmState(state),true);const f=fixtures();assert.equal(f.store.importPreview(JSON.stringify(makeEnvelope(state))).ok,true);
 state.branch.active.mode='classic';assert.throws(()=>validateFarmState(state),{code:'INVALID_SAVE'});
});

test('1000 generated commands retain bounded results and old IDs cannot execute again',()=>{
 const f=fixtures();let oldest;
 for(let i=0;i<1000;i++){
  const result=f.store.dispatch({type:'setSettings',settings:{sound:!!(i%2)}});assert.equal(result.ok,true);oldest??=result.commandId;
 }
 const state=f.store.getState();assert.equal(Object.keys(state.commandLog).length,256);assert.equal(Object.keys(state.commandWatermarks).length,1);assert.equal(Object.keys(state.commandSeen).length,0);
 assert.ok(new TextEncoder().encode(f.store.exportSave()).byteLength<150000,'save stays far below quota/import limit');
 const retry=f.store.dispatch({type:'sell',itemId:'wheat',quantity:2,commandId:oldest});assert.equal(retry.ok,false);assert.equal(retry.error,'ALREADY_CLAIMED');assert.equal(f.store.getState().coins,100);
 const reload=createFarmStore(f.options);assert.equal(reload.dispatch({type:'sell',itemId:'wheat',quantity:2,commandId:oldest}).error,'ALREADY_CLAIMED');
});
test('reward decorations and shelter skins remain valid after save and import',()=>{
 let state=createFarm(0);state.decorations={decor_bridge:1,skin_coop:1};state=executeFarm(state,{type:'placeDecoration',configId:'decor_bridge',x:32,y:36},0).state;
 state=executeFarm(state,{type:'setSkin',entityId:'shelter_chicken_1',skinId:'skin_coop'},0).state;assert.equal(validateFarmState(state),true);
 const f=fixtures();assert.equal(f.store.importPreview(JSON.stringify(makeEnvelope(state))).ok,true);
});

test('four independent feature switches strictly validate and survive recovery',()=>{
 const features={farmLinkageEnabled:false,npcMarketEnabled:false,materialRewardsEnabled:false,constructionVouchersEnabled:false},state=createFarm(0,{features});
 const storage=new MemoryStorage();storage.setItem(`${FARM_SAVE_KEY}:a`,JSON.stringify(makeEnvelope(state,{savedAtWallMs:0})));
 const store=createFarmStore({storage,now:()=>0,monotonicNow:()=>0,locks:null});assert.deepEqual(store.getState().features,features);assert.equal(store.dispatch(settings('feature-roundtrip')).ok,true);
 assert.deepEqual(createFarmStore({storage,now:()=>0,monotonicNow:()=>0,locks:null}).getState().features,features);
 assert.equal(store.importPreview(store.exportSave()).ok,true);
 for(const change of [s=>{s.features.npcMarketEnabled=1;},s=>{delete s.features.npcMarketEnabled;},s=>{s.features.futureFeature=true;}]){
  const bad=structuredClone(state);change(bad);const preview=store.importPreview(JSON.stringify(makeEnvelope(bad)));assert.equal(preview.ok,false);assert.deepEqual(store.getState().features,features);
 }
});

test('recovery preview freezes chosen snapshot while subsequent ticks rotate both slots',()=>{
 const f=fixtures();f.store.dispatch(settings('one'));f.store.dispatch(settings('two',true));const frozen=f.store.recoveryPreview(1);assert.equal(frozen.ok,true);
 for(let i=0;i<4;i++){f.advance(1000);assert.equal(f.store.tick().ok,true);}
 assert.equal(f.store.recoveries().some(x=>x.revision===1),false);
 const fresh=f.store.importPreview(frozen.text);assert.equal(fresh.ok,true);assert.equal(f.store.confirmImport(fresh.token).ok,true);assert.equal(f.store.getState().settings.sound,false);
});
test('map view floats persist and imports reject out-of-world/invalid zoom values',()=>{
 const f=fixtures();assert.equal(f.store.dispatch({type:'setCamera',camera:{centerX:30.25,centerY:28.75,zoom:1.25}}).ok,true);
 assert.deepEqual(createFarmStore(f.options).getState().camera,{centerX:30.25,centerY:28.75,zoom:1.25});
 for(const camera of [{centerX:64,centerY:28.5,zoom:1},{centerX:0,centerY:-1,zoom:1},{centerX:29,centerY:29,zoom:2},{centerX:29,centerY:29,zoom:1,secretCameraSetting:true}]){
  const state=createFarm(0);state.camera=camera;assert.equal(f.store.importPreview(JSON.stringify(makeEnvelope(state))).ok,false);
 }
});

test('known unmarked v0.4 development snapshots migrate only control metadata and preserve original slots',()=>{
 for(const removed of [['features','camera','commandWatermarks','commandSeen','cosmetics'],['features','camera'],['camera'],[]]){
  let state=createFarm(1000);state=executeFarm(state,{type:'plant',itemId:'wheat',entityIds:['field_1','field_2'],commandId:'old-plant'},1000).state;state=executeFarm(state,{type:'feed',entityId:'shelter_chicken_1',commandId:'old-feed'},1000).state;state.revision=123;
  for(const key of removed)delete state[key];
  const envelope=makeEnvelope(state,{savedAtWallMs:1000,saveId:'development-fixture',commitId:`old_${removed.length}`});delete envelope.saveFormatVersion;delete envelope.checksum;envelope.checksum=checksum(envelope);const raw=JSON.stringify(envelope);
  const storage=new MemoryStorage();storage.setItem(`${FARM_SAVE_KEY}:a`,raw);const store=createFarmStore({storage,now:()=>1000,monotonicNow:()=>0,locks:null});
  assert.equal(store.readOnly,false);assert.equal(store.status.recoveryRequired,false);assert.equal(store.getState().revision,123);assert.equal(store.getState().inventory.wheat,4);assert.equal(store.getState().inventory.chicken_feed,0);
  assert.deepEqual(store.getState().entities,state.entities);assert.deepEqual(store.getState().ledger,state.ledger);assert.deepEqual(store.getState().rewards,state.rewards);
  assert.equal(storage.getItem(`${FARM_SAVE_KEY}:a`),raw);assert.equal(storage.getItem(`${FARM_SAVE_KEY}:migration-original:old_${removed.length}`),raw);
  assert.equal(store.dispatch({type:'sell',itemId:'wheat',quantity:1,commandId:'old-plant'}).duplicate,true);
  assert.equal(store.dispatch(settings('after-migration')).ok,true);assert.equal(JSON.parse(storage.getItem(`${FARM_SAVE_KEY}:b`)).saveFormatVersion,1);
 }
});
test('new-format missing controls, unknown legacy shape and corrupted legacy checksum are never auto-repaired',()=>{
 const f=fixtures();
 for(const change of [e=>{delete e.payload.camera;},e=>{delete e.saveFormatVersion;delete e.payload.features;},e=>{delete e.saveFormatVersion;delete e.payload.inventory;}]){
  const e=makeEnvelope(createFarm(0));change(e);delete e.checksum;e.checksum=checksum(e);assert.equal(f.store.importPreview(JSON.stringify(e)).ok,false);
 }
 const bad=makeEnvelope(createFarm(0));delete bad.saveFormatVersion;assert.equal(f.store.importPreview(JSON.stringify(bad)).error,'CHECKSUM_MISMATCH');
});
test('both corrupt slots report real recovery reasons and takeover never falsely succeeds',async()=>{
 const f=fixtures();f.storage.setItem(`${FARM_SAVE_KEY}:a`,'broken');const store=createFarmStore(f.options);
 assert.equal(store.load().ok,false);assert.equal(store.status.error,'RECOVERY_REQUIRED');assert.ok(store.status.message.includes('A：'));assert.equal(await store.takeover(),false);
 let held=false;const locks={request:async(name,options,callback)=>{if(held)return callback(null);held=true;try{return await callback({name});}finally{held=false;}}};
 const locked=createFarmStore({...f.options,locks});assert.equal(await locked.ready,false);assert.equal(await locked.takeover(),false);assert.equal(locked.status.recoveryRequired,true);locked.close();
});

test('imports reject missing production clocks and critical ledger structure without changing current farm',()=>{
 let source=createFarm(0);source.coins=100000;source.xp=200000;source.level=30;
 source=executeFarm(source,{type:'buy',category:'fruit',configId:'apple',x:28,y:36},0).state;
 source=executeFarm(source,{type:'buy',category:'machine',configId:'bakery',x:32,y:32},0).state;
 const changes=[
  s=>{delete s.entities.find(e=>e.kind==='fruit').readyAt;},
  s=>{delete s.entities.find(e=>e.kind==='fruit').revived;},
  s=>{delete s.entities.find(e=>e.kind==='machine').buildReadyAt;},
  s=>{delete s.entities.find(e=>e.kind==='machine').built;},
  s=>{delete s.entities.find(e=>e.kind==='machine').queue;},
  s=>{delete s.entities.find(e=>e.kind==='field').crop;},
  s=>{delete s.entities.find(e=>e.kind==='shelter').animals[0].readyAt;},
  s=>{delete s.npc.boxes[0].listing;},
  s=>{delete s.materials.pending;},
  s=>{s.commandLog=[];},
  s=>{delete s.branch.active;},
  s=>{delete s.tutorial;},
 ];
 const f=fixtures(),before=f.store.getState();for(const change of changes){const bad=structuredClone(source);change(bad);const preview=f.store.importPreview(JSON.stringify(makeEnvelope(bad)));assert.equal(preview.ok,false);assert.deepEqual(f.store.getState(),before);}
});

test('development migration never replaces present null control metadata with defaults',()=>{
 const f=fixtures(),before=f.store.getState();
 for(const fields of [['features'],['camera'],['cosmetics'],['features','camera','cosmetics'],['commandWatermarks','commandSeen']]){
  const e=makeEnvelope(createFarm(0));delete e.saveFormatVersion;for(const field of fields)e.payload[field]=null;delete e.checksum;e.checksum=checksum(e);
  assert.equal(f.store.importPreview(JSON.stringify(e)).ok,false,fields.join(','));assert.deepEqual(f.store.getState(),before);
 }
});
test('legacy missing-control migration does not repair present null metadata beside missing ones',()=>{
 const f=fixtures();for(const [absent,present]of [['camera','features'],['camera','cosmetics']]){
  const e=makeEnvelope(createFarm(0));delete e.saveFormatVersion;delete e.payload[absent];e.payload[present]=null;delete e.checksum;e.checksum=checksum(e);assert.equal(f.store.importPreview(JSON.stringify(e)).ok,false);
 }
});

test('present null or false critical ledgers are invalid in current format too',()=>{
 const f=fixtures();for(const change of [s=>{s.commandWatermarks=null;},s=>{s.commandSeen=null;},s=>{s.npc.boxes[0].listing=false;},s=>{s.materials.choiceReceipt=false;},s=>{s.branch.active=false;},s=>{s.branch.attempts=null;},s=>{s.tutorial.initialFed=false;}]){
  const bad=createFarm(0);change(bad);assert.equal(f.store.importPreview(JSON.stringify(makeEnvelope(bad))).ok,false);
 }
});
test('a closed/read-only store cannot remove the writer layout draft',()=>{
 const f=fixtures();assert(f.store.saveDraft(f.store.beginLayout()).ok);
 const original=f.storage.getItem(`${FARM_SAVE_KEY}:draft`);assert(original);f.store.close();
 assert.equal(f.store.clearDraft().error,'READ_ONLY');assert.equal(f.storage.getItem(`${FARM_SAVE_KEY}:draft`),original);
});
