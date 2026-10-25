import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as core from '../farm-core.mjs';
import * as config from '../farm-config.mjs';
import * as layout from '../farm-layout.mjs';
import * as H from '../farm-scene-world.mjs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../farm-scene-world.css',import.meta.url),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const open=source.slice(source.indexOf('    function openObject('),source.indexOf('    function startPlacement('));
const tap=source.slice(source.indexOf('    function tapTool('),source.indexOf('    function startToolDrag('));
function scene(state=core.createFarm(0)){
 const commands=[],says=[],storage=[];const ctx={get state(){return state},say:s=>says.push(s)};
 const h=vm.runInNewContext(`(()=>{let selected=null,selectedAnimal=null,more=false,localPage=null,clearPreview=null,seedPage=0,recipePage=0,chosenSeed=null,pendingRecipe=null,draft=null,placement=null,lastCollectedAnimal=null;
 const entity=id=>ctx.state.entities.find(e=>e.id===id),render=()=>{},cancelGesture=()=>{},focus=()=>{},remaining=t=>String(t-ctx.state.now),name=id=>id;
 ${open}\n${tap}
 return {open:openObject,tap:tapTool,edit:v=>draft=v,snapshot:()=>({selected,chosenSeed,localPage,pendingRecipe})};})()`,{ctx,config,Date,directCropHarvestCommand:H.directCropHarvestCommand,openStorage:k=>storage.push(k),doAct:c=>{commands.push(clone(c));const result=core.executeFarm(state,clone(c),state.now);state=result.state;return {ok:true,...result};}});
 return {...h,commands,says,storage,get state(){return state}};
}
const run=(s,c,t=s.now)=>core.executeFarm(s,c,t).state;
test('production module exposes no fixture loader, global registration or simulated clock controls',()=>{
 for(const forbidden of ['prepareWorldScenario','setScenario','ctx.reset','ctx.advance','applyScenario','fw-demo-bar','demo_field','demo_flowerpot','FarmWorldTest','preserveState'])assert(!source.includes(forbidden),forbidden);
 assert.equal(typeof H.mountWorldScene,'function');assert(!css.includes('.fw-demo-bar'));
});
test('fresh level-one farm first empty tap opens explicit seed choice; selection plants continuously at real costs',()=>{
 const t=scene(),initial=clone(t.state);t.open('field_1');assert.equal(t.commands.length,0);assert.deepEqual(t.state,initial);
 t.tap({action:'plant',itemId:'wheat',entityId:'field_1'});t.open('field_2');
 assert.equal(t.state.inventory.wheat,4);assert.equal(t.snapshot().chosenSeed,'wheat');assert.equal(t.state.level,1);assert.equal(t.state.coins,100);
 assert.deepEqual(t.commands.map(c=>c.type),['plant','plant']);
});
test('mature crop tap collects once and never silently replants; edit tap never collects',()=>{
 let s=run(core.createFarm(0),{type:'plant',entityIds:['field_1'],itemId:'wheat'});s=core.advanceFarm(s,120000).state;
 const t=scene(s);t.edit({});t.open('field_1');assert.equal(t.commands.length,0);t.edit(null);t.open('field_1');t.open('field_1');
 assert.deepEqual(t.commands,[{type:'harvest',entityIds:['field_1']}]);assert.equal(t.state.inventory.wheat,7);assert.equal(t.state.entities.find(e=>e.id==='field_1').crop,null);
});
test('hungry exact animal feeds once; collecting a ready animal never immediately refeeds on double activation',()=>{
 const s=core.createFarm(0),shelter=s.entities.find(e=>e.kind==='shelter'),animal=shelter.animals[0];const t=scene(s);
 t.open(shelter.id,animal.id);t.open(shelter.id,animal.id);assert.equal(t.commands.length,1);assert.deepEqual(t.commands[0].animalIds,[animal.id]);assert.equal(t.state.inventory.chicken_feed,2);
 const ready=core.advanceFarm(t.state,config.ANIMALS.chicken.durationMs).state,u=scene(ready);u.open(shelter.id,animal.id);u.open(shelter.id,animal.id);
 assert.deepEqual(u.commands.map(c=>c.type),['collectAnimal']);assert.equal(u.state.inventory.chicken_feed,2);
});
test('missing animal feed never purchases or performs invalid economic transaction',()=>{
 const s=core.createFarm(0);s.inventory.chicken_feed=0;const e=s.entities.find(e=>e.kind==='shelter'),t=scene(s);t.open(e.id,e.animals[0].id);assert.equal(t.commands.length,0);assert.match(t.says.at(-1),/缺少/);assert(source.includes("button('source:'+c.feedItem,'去制作饲料')"));
});
test('storage target directly carries actual category and does not change balances',()=>{const t=scene();for(const k of ['barn','silo'])t.open(t.state.entities.find(e=>e.kind===k).id);assert.deepEqual(t.storage,['barn','silo']);assert.equal(t.commands.length,0);});
test('all physical shop categories quote real core costs without changing state',()=>{
 assert.deepEqual(H.placementConfig(config,'field','field'),{footprint:[1,1],coins:1});assert.equal(H.placementConfig(config,'road','road').coins,0);
 for(const [category,rows] of [['machine',config.BUILDINGS],['fruit',config.FRUITS],['shelter',config.ANIMALS],['decoration',config.DECORATIONS]])for(const c of Object.values(rows)){const p=H.placementConfig(config,category,c.id);assert.equal(p.coins,category==='shelter'?c.buildingCost:c.coins);assert.deepEqual(p.footprint,c.footprint);}
 const s=core.createFarm(0),before=clone(s),r=H.commandPreview({state:s,core},{type:'buy',category:'machine',itemId:'bakery',x:18,y:28});assert.equal(r.ok,false);assert.deepEqual(s,before);
});
test('every machine tray hitbox is contained, compact, and reserves >=44px machine entry in either orientation',()=>{
 for(const c of Object.values(config.BUILDINGS))for(const rotation of [0,90])for(const n of [1,2,9]){const e={x:26,y:27,w:c.footprint[0],h:c.footprint[1],rotation,completed:Array(n).fill({})},f=layout.getFootprint(e),t=H.machineTrayPlacement(e,f);assert(t.x>=e.x*48);assert(t.x+t.width<=(e.x+f.w)*48);assert(t.y-e.y*48>=44);assert(t.y+t.height<=(e.y+f.h)*48);if(n===1)assert.equal(t.width,52);}
 assert.match(css,/\.fw-products,\.fw-tray\{background:transparent/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/data-paused=true/);
});
test('ready fruit object harvests exactly once then retains actual regrowth timer',()=>{
 let s=core.createFarm(0);s.level=config.FRUITS.apple.level;s.xp=config.LEVELS[s.level-1].totalXp;s.coins=10000;
 s=run(s,{type:'buy',category:'fruit',itemId:'apple',x:18,y:28});const tree=s.entities.at(-1);s=core.advanceFarm(s,tree.readyAt).state;
 const t=scene(s);t.open(tree.id);t.open(tree.id);assert.deepEqual(t.commands.map(c=>c.type),['harvest']);const after=t.state.entities.find(e=>e.id===tree.id);assert.equal(after.status,'growing');assert(after.readyAt>t.state.now);
});
test('recipe card queues directly at original recipe cost and missing materials only show acquisition detail',()=>{
 let s=core.createFarm(0);s.level=config.BUILDINGS.bakery.level;s.xp=config.LEVELS[s.level-1].totalXp;s.coins=10000;
 s=run(s,{type:'buy',category:'machine',itemId:'bakery',x:18,y:28});const machine=s.entities.at(-1);s=run(s,{type:'completeBuilding',entityId:machine.id},machine.buildReadyAt);
 const t=scene(s);t.tap({action:'enqueue',recipeId:'bread',entityId:machine.id});assert.equal(t.snapshot().localPage,null);assert.equal(t.commands[0].type,'enqueue');assert.equal(t.state.inventory.wheat,s.inventory.wheat-config.RECIPES.bread.inputs.wheat);
 const poor=clone(s);poor.inventory.wheat=0;const u=scene(poor);u.tap({action:'enqueue',recipeId:'bread',entityId:machine.id});assert.equal(u.commands.length,0);assert.equal(u.snapshot().localPage,'recipe');assert.equal(u.snapshot().pendingRecipe,'bread');
});
test('freshly finished building directly unveils once without buying a duplicate',()=>{
 let s=core.createFarm(0);s.level=config.BUILDINGS.bakery.level;s.xp=config.LEVELS[s.level-1].totalXp;s.coins=10000;
 s=run(s,{type:'buy',category:'machine',itemId:'bakery',x:18,y:28});const e=s.entities.at(-1);s=core.advanceFarm(s,e.buildReadyAt).state;const t=scene(s);t.open(e.id);t.open(e.id);assert.deepEqual(t.commands.map(c=>c.type),['completeBuilding']);assert.equal(t.state.coins,s.coins);
});
test('recovering autosaved layout uses current revision and position-only payload, never old economy',()=>{
 const s=core.createFarm(0),saved={...layout.beginLayout(s),inventory:{wheat:999},coins:99999};saved.positions[0].coins=999;saved.positions[0].crop={itemId:'corn'};
 s.revision=42;s.now=123456;const before=clone(s),r=H.recoverWorldLayoutDraft(s,saved,layout);assert.equal(r.ok,true);assert.equal(r.draft.baseRevision,42);assert.equal(r.draft.layoutRevision,s.layoutRevision);assert(!('inventory'in r.draft));assert(!('crop'in r.draft.positions[0]));assert.deepEqual(s,before);
});
test('layout restore rejects stale topology/layout revision but accepts elapsed production time',()=>{
 const s=core.createFarm(0),saved=layout.beginLayout(s);s.now+=900000;s.revision+=5;assert.equal(H.recoverWorldLayoutDraft(s,saved,layout).ok,true);
 s.layoutRevision++;assert.equal(H.recoverWorldLayoutDraft(s,saved,layout).ok,false);s.layoutRevision--;saved.positions.pop();assert.equal(H.recoverWorldLayoutDraft(s,saved,layout).ok,false);
});
test('layout autosave/restore uses original durable draft namespace and clears separately from economy',async()=>{
 const {createFarmStore}=await import('../farm-save.mjs'),data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const store=createFarmStore({storage,locks:null,now:()=>10000,monotonicNow:()=>0}),before=clone(store.getState()),draft=layout.beginLayout(before);
 assert.equal(store.saveDraft(draft).ok,true);const saved=store.loadDraft();assert.equal(H.recoverWorldLayoutDraft(store.getState(),saved,layout).ok,true);assert.deepEqual(store.getState(),before);
 assert.equal(store.clearDraft().ok,true);assert.equal(store.loadDraft(),null);assert.deepEqual(store.getState(),before);store.close();
});
test('world layout saves each completed change and undo/redo, preserves declined recovery on exit, gates voucher affordances',()=>{
 assert.match(source,/ctx\.store\?\.saveDraft\?\.\(draft\)/);assert.match(source,/ctx\.store\?\.loadDraft/);assert.match(source,/ctx\.store\?\.clearDraft/);
 assert.match(source,/if\(!draft\|\|preserveStoredDraft\)return/);assert.match(source,/draft.positions=undo.pop\(\);persistLayoutDraft\(\)/);assert.match(source,/draft.positions=redo.pop\(\);persistLayoutDraft\(\)/);
 assert.match(source,/constructionVouchersEnabled!==false/);assert.match(source,/扩槽功能关闭/);assert.match(source,/vouchersEnabled\(\)&&e.slots<9\?'':'disabled'/);
});
test('last-seed recipe rejection offers a single explicit per-command override and cancel is resource-neutral',()=>{
 let state=core.createFarm(0);state.level=config.BUILDINGS.bakery.level;state.xp=config.LEVELS[state.level-1].totalXp;state.coins=10000;
 state=run(state,{type:'buy',category:'machine',itemId:'bakery',x:18,y:28});const e=state.entities.at(-1);state=run(state,{type:'completeBuilding',entityId:e.id},e.buildReadyAt);state.inventory.wheat=config.RECIPES.bread.inputs.wheat;
 const before=clone(state),commands=[],dialogs=[];const ctx={get state(){return state},say:()=>{},confirm:d=>dialogs.push(d),act:c=>{commands.push(c);try{const r=core.executeFarm(state,c,state.now);state=r.state;return {ok:true,...r};}catch(error){return {ok:false,error:error.code,message:error.message};}}};
 const doActSource=source.slice(source.indexOf('    function doAct('),source.indexOf('    function ask('));
 const act=vm.runInNewContext(`(()=>{${doActSource};return doAct;})()`,{ctx,config,esc:s=>s,name:id=>id});
 act({type:'enqueue',entityId:e.id,recipeId:'bread'});assert.equal(dialogs.length,1);assert.match(dialogs[0].body,/后续制作仍默认留种/);assert.deepEqual(state,before);assert.equal(commands[0].allowSeedReserve,undefined);
 dialogs[0].onConfirm();assert.equal(state.inventory.wheat,0);assert.equal(commands[1].allowSeedReserve,true);assert.equal(dialogs.length,1);assert(!Object.hasOwn(state,'allowSeedReserve'));
});
test('object-local animal migration dispatches exact source, animal and target while preserving production',()=>{
 let state=core.createFarm(0);state.level=config.ANIMALS.chicken.levels[1];state.xp=config.LEVELS[state.level-1].totalXp;state.coins=10000;
 state=run(state,{type:'buy',category:'shelter',itemId:'chicken',x:18,y:28});const target=state.entities.at(-1),origin=state.entities.find(e=>e.kind==='shelter'&&e.id!==target.id),animalId=origin.animals[0].id;
 state=run(state,{type:'feed',entityId:origin.id,animalIds:[animalId]});const beforeAnimal=clone(state.entities.find(e=>e.id===origin.id).animals[0]),beforeInventory=clone(state.inventory),beforeCoins=state.coins,commands=[];
 const actionSource=source.slice(source.indexOf('    function action('),source.indexOf('    function point('));
 const action=vm.runInNewContext(`(()=>{let selectedAnimal=null;${actionSource};return action;})()`,{selectedEntity:()=>state.entities.find(e=>e.id===origin.id),render:()=>{},doAct:c=>{commands.push(c);state=run(state,c);return {ok:true};}});
 action(`move-animal:${animalId}:${target.id}`);assert.equal(commands.length,1);assert.equal(commands[0].type,'moveAnimal');assert.equal(commands[0].animalId,animalId);assert.equal(state.entities.find(e=>e.id===origin.id).animals.length,2);assert.deepEqual(state.entities.find(e=>e.id===target.id).animals[0],beforeAnimal);assert.deepEqual(state.inventory,beforeInventory);assert.equal(state.coins,beforeCoins);
});

test('idle window blur silently clears pointers and only pending action announces cancellation',()=>{
 const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
 assert.match(source,/on\(win,'blur',\(\)=>\{const pending=resizeHasPendingAction\(gesture\);pointers\.clear\(\);cancelGesture\(pending\?'窗口失焦，未提交动作已取消':undefined\);\}\)/);
});
