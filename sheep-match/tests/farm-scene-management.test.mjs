import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mountManagementScene,MANAGEMENT_SCENES} from '../farm-scene-management.mjs';
import {createFarmStore,makeEnvelope} from '../farm-save.mjs';
import * as core from '../farm-core.mjs';
import * as config from '../farm-config.mjs';
import * as layout from '../farm-layout.mjs';
function harness(id,options={}) {
  const data=new Map();let failing=false,clock=1000;
  const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(failing)throw Error('quota');data.set(k,v);},removeItem:k=>data.delete(k)};
  const store=createFarmStore({storage,now:()=>clock,monotonicNow:()=>clock,locks:null,key:'management-test-'+id});
  const handlers={},elements={},exits=[],requests=[],missing=new Set();let confirmation=null;
  const root={innerHTML:'',contains:()=>true,querySelector:s=>elements[s]??null,querySelectorAll:()=>[],addEventListener:(k,v)=>handlers[k]=v,removeEventListener:k=>delete handlers[k]};
  let writes=0,html='';Object.defineProperty(root,'innerHTML',{get:()=>html,set:value=>{html=value;writes++;}});
  const ctx={id,root,doc:{activeElement:null},win:{requestAnimationFrame:f=>f()},config,core,layout,store,get state(){return store.getState();},act:c=>store.dispatch(c),subscribe:f=>store.subscribe(f),onExit:f=>exits.push(f),confirm:c=>confirmation=c,openScene:(...a)=>requests.push(a),startStage:(...a)=>requests.push(a),exitFarm:()=>requests.push(['exit']),getMusicVolume:()=>.35,onMusicVolumeChange:v=>requests.push(['volume',v]),asset:p=>{if(!fs.existsSync(new URL('../assets/farm/'+p,import.meta.url)))missing.add(p);return p;},img(p){return `<img src="${this.asset(p)}">`;},item:id=>`<img data-item="${id}">`,name:id=>config.ITEMS[id]?.name||id,restoreDefaultSkin:id=>store.dispatch({type:'setSkin',entityId:id,skinId:null}),...options};
  const cleanup=mountManagementScene(ctx);
  return {root,ctx,store,requests,missing,elements,get writes(){return writes;},fire(type,event){handlers[type](event);},get confirmation(){return confirmation;},click(action){handlers.click({target:{closest:()=>({dataset:{mg:action},disabled:false})}});},change(target){return handlers.change({target});},input(target){handlers.input({target});},fail(){failing=true;},advance(ms){clock+=ms;store.dispatch({type:'tick'});},cleanup(){cleanup();store.close();}};
}
for(const id of MANAGEMENT_SCENES)test(`${id}: fresh persisted state renders without changes or fixture controls`,()=>{
 const a=harness(id),before=a.ctx.state;
 assert.match(a.root.innerHTML,/mg-viewport/);assert.doesNotMatch(a.root.innerHTML,/演示时钟|示例|内存状态|scenario:|demo-/);
 a.click('scenario:owned');a.click('scenario:ready');a.click('clock');assert.deepEqual(a.ctx.state,before);assert.deepEqual([...a.missing],[]);a.cleanup();
});
test('production module contains no fixture setters, in-memory import, demo board or clock',()=>{
 const src=fs.readFileSync(new URL('../farm-scene-management.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/ctx\.(setScenario|reset|advance|importState|exportState)|farm-scene-demo|level30|stageAction|ctx\.engine/);
 assert.match(src,/store\.confirmImport\(fresh.token\)/);
});
test('task navigation does not mutate progress or award rewards',()=>{const a=harness('P13'),before=a.ctx.state;a.click('goto:P11:T15');assert.deepEqual(a.requests,[['P11',{task:'T15'}]]);assert.deepEqual(a.ctx.state,before);a.cleanup();});
test('unlocked branch routes to actual runtime, locked branch never starts',()=>{
 const a=harness('P14');a.click('start');assert.equal(a.requests.length,0);const field=a.ctx.state.entities.find(e=>e.kind==='field');assert(a.store.dispatch({type:'plant',entityIds:[field.id],itemId:'wheat'}).ok);a.advance(120000);assert(a.store.dispatch({type:'harvest',entityIds:[field.id]}).ok);a.click('start');assert.deepEqual(a.requests,[['F01',undefined,false]]);a.cleanup();
});
test('settings writes persist and failed write never claims success',()=>{
 const a=harness('P17');a.change({matches:s=>s==='[data-setting]',dataset:{setting:'reducedMotion'},checked:true});assert.equal(a.ctx.state.settings.reducedMotion,true);assert.equal(JSON.parse(a.store.exportSave()).payload.settings.reducedMotion,true);
 a.fail();a.change({matches:s=>s==='[data-setting]',dataset:{setting:'reducedMotion'},checked:false});assert.equal(a.ctx.state.settings.reducedMotion,true);assert.match(a.root.innerHTML,/无法保存|未执行/);a.cleanup();
});
test('valid export imports only after explicit preview confirmation and survives clock ticks',()=>{
 const a=harness('P17');a.click('tab:backup');const original=a.store.exportSave();a.elements['[data-import-text]']={value:original};a.click('validate');assert.match(a.root.innerHTML,/校验通过，等待确认/);const old=a.ctx.state.revision;a.advance(1000);a.click('confirm-import');assert(a.ctx.state.revision>old);assert.match(a.root.innerHTML,/存档已校验并恢复/);a.cleanup();
});
test('invalid import retains original state and reports validation error',()=>{const a=harness('P17');a.click('tab:backup');const before=a.ctx.state;a.elements['[data-import-text]']={value:'{"bad":'};a.click('validate');a.click('confirm-import');assert.deepEqual(a.ctx.state,before);assert.doesNotMatch(a.root.innerHTML,/校验通过，等待确认/);a.cleanup();});
test('recovery page harvest is direct and does not plant or feed again',()=>{const a=harness('P18'),field=a.ctx.state.entities.find(e=>e.kind==='field');a.store.dispatch({type:'plant',entityIds:[field.id],itemId:'wheat'});a.advance(120000);const before=a.ctx.state.inventory.wheat;a.click('field:'+field.id);assert.equal(a.ctx.state.inventory.wheat,before+2);assert.equal(a.ctx.state.entities.find(e=>e.id===field.id).crop,null);a.click('field:'+field.id);assert.equal(a.ctx.state.inventory.wheat,before+2);a.cleanup();});
test('season entry returns to original home instead of invented game content',()=>{const a=harness('P19'),before=a.ctx.state;a.click('tab:seasons');a.click('seasons-home');assert.deepEqual(a.requests,[['exit']]);assert.deepEqual(a.ctx.state,before);a.cleanup();});

test('earned shelter appearance applies once, default undo persists and leaves animals unchanged',()=>{
 const a=harness('P19'),state=a.ctx.state;state.decorations.skin_coop=1;
 const preview=a.store.importPreview(JSON.stringify(makeEnvelope(state,{savedAtWallMs:1000})));assert(preview.ok);assert(a.store.confirmImport(preview.token).ok);
 const shelter=a.ctx.state.entities.find(e=>e.kind==='shelter'),animals=structuredClone(shelter.animals),coins=a.ctx.state.coins;
 a.click('tab:skins');a.click('skin:skin_coop:'+shelter.id);assert.equal(a.ctx.state.entities.find(e=>e.id===shelter.id).skinId,'skin_coop');
 a.click('undo-appearance');const result=a.ctx.state.entities.find(e=>e.id===shelter.id);assert.equal(result.skinId,undefined);assert.deepEqual(result.animals,animals);assert.equal(a.ctx.state.coins,coins);assert.equal(JSON.parse(a.store.exportSave()).payload.entities.find(e=>e.id===shelter.id).skinId,undefined);assert.deepEqual([...a.missing],[]);a.cleanup();
});
test('appearance save failure keeps old appearance and does not offer false undo',()=>{
 const a=harness('P19'),state=a.ctx.state;state.decorations.skin_coop=1;const p=a.store.importPreview(JSON.stringify(makeEnvelope(state,{savedAtWallMs:1000})));a.store.confirmImport(p.token);
 const shelter=a.ctx.state.entities.find(e=>e.kind==='shelter');a.click('tab:skins');a.fail();a.click('skin:skin_coop:'+shelter.id);assert.equal(a.ctx.state.entities.find(e=>e.id===shelter.id).skinId,undefined);assert.doesNotMatch(a.root.innerHTML,/data-mg="undo-appearance"/);a.cleanup();
});

test('stored decoration restores same entity with one final layout commit and no duplicate purchase',()=>{
 const a=harness('P19');a.click('buy:sign');assert.match(a.root.innerHTML,/data-mg="apply-place"/);a.click('apply-place');
 const decoration=a.ctx.state.entities.find(e=>e.kind==='decoration'&&e.configId==='sign');assert.ok(decoration);
 a.click('locate:'+decoration.id);a.click('store');assert.equal(a.ctx.state.entities.find(e=>e.id===decoration.id).stored,true);
 assert.match(a.root.innerHTML,new RegExp('data-mg="stored:'+decoration.id+'"'));
 const before=a.ctx.state,coins=before.coins,count=before.entities.length,owned=structuredClone(before.decorations);
 a.click('stored:'+decoration.id);assert.deepEqual(a.ctx.state,before,'preview does not write layout or buy');assert.match(a.root.innerHTML,/已有装饰，不重复扣款/);
 a.click('apply-place');const after=a.ctx.state;assert.equal(after.entities.find(e=>e.id===decoration.id).stored,false);assert.equal(after.entities.length,count);assert.equal(after.coins,coins);assert.deepEqual(after.decorations,owned);assert.equal(after.entities.filter(e=>e.kind==='decoration'&&e.configId==='sign').length,1);assert.equal(after.layoutRevision,before.layoutRevision+1);
 assert.equal(JSON.parse(a.store.exportSave()).payload.entities.find(e=>e.id===decoration.id).stored,false);
 a.click('apply-place');assert.deepEqual(a.ctx.state,after,'repeat final click cannot buy a duplicate');a.cleanup();
});
test('stored decoration cancellation and save failure preserve stored instance and coins',()=>{
 const a=harness('P19');a.click('buy:sign');a.click('apply-place');const decoration=a.ctx.state.entities.find(e=>e.kind==='decoration'&&e.configId==='sign');a.click('locate:'+decoration.id);a.click('store');const before=a.ctx.state;
 a.click('stored:'+decoration.id);a.click('cancel-place');assert.deepEqual(a.ctx.state,before);
 a.click('stored:'+decoration.id);a.fail();a.click('apply-place');assert.deepEqual(a.ctx.state,before);assert.match(a.root.innerHTML,/无法保存|未执行/);a.cleanup();
});

test('settings native picker DOM survives clock notifications while meaningful changes still render',async()=>{
 const a=harness('P17');a.click('tab:backup');const writes=a.writes,now=a.ctx.state.now;
 // Native chooser may own focus outside the document: activeElement is deliberately null.
 a.advance(1000);a.advance(1000);assert.equal(a.writes,writes);assert.equal(a.ctx.state.now,now+2000);
 let resolveFile;const text=a.store.exportSave(),reading=new Promise(resolve=>resolveFile=resolve);
 const result=a.change({matches:s=>s==='[data-import-file]',files:[{size:text.length,text:()=>reading}]});
 a.advance(1000);assert.equal(a.writes,writes,'pending file read keeps same input node');resolveFile(text);await result;
 assert.match(a.root.innerHTML,/校验通过，等待确认/);assert(a.writes>writes);
 const next=a.writes;a.store.dispatch({type:'setSettings',settings:{sound:false}});assert(a.writes>next,'real preference changes still render');a.cleanup();
});
test('clock subscriptions preserve typed settings text and P19 coordinate input caret',()=>{
 for(const id of ['P17','P19']){const a=harness(id);if(id==='P17')a.click('tab:backup');
 const active={matches:selector=>selector==='input, textarea, select',value:'27',selectionStart:1,selectionEnd:1};a.ctx.doc.activeElement=active;
 const writes=a.writes;a.advance(1000);assert.equal(a.writes,writes);assert.equal(active.value,'27');assert.equal(active.selectionStart,1);
 a.ctx.doc.activeElement=null;a.cleanup();}
});

test('decoration drag preview is not replaced by a clock tick and cancellation writes no layout',()=>{
 const a=harness('P19');a.click('buy:sign');const before=a.ctx.state;
 a.fire('pointerdown',{button:0,pointerId:7,clientX:20,clientY:20,target:{closest:()=>({})},preventDefault(){}});
 const writes=a.writes;a.advance(1000);assert.equal(a.writes,writes);assert.equal(a.ctx.state.layoutRevision,before.layoutRevision);assert.equal(a.ctx.state.coins,before.coins);
 a.fire('pointercancel',{pointerId:7});assert(a.writes>writes);assert.equal(a.ctx.state.layoutRevision,before.layoutRevision);assert.equal(a.ctx.state.entities.length,before.entities.length);a.cleanup();
});
