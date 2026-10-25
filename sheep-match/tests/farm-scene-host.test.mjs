import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as config from '../farm-config.mjs';
import * as core from '../farm-core.mjs';
import * as layout from '../farm-layout.mjs';
import {farmSourceRoute,escapeScene} from '../farm-scene-host.mjs';
const source=readFileSync(new URL('../farm-scene-host.mjs',import.meta.url),'utf8');
// Host-only inert DOM: real host lifecycle and commands, scene renderers stubbed.
// Browser geometry, native inert and focus behavior are covered by browser QA, not this fixture.
function harness(){
 const contexts=[],sounds=[],commands=[],callbacks=new Set();let state=core.createFarm(0),readOnly=false;
 const doc={activeElement:null,defaultView:{}};
 class Element{
  constructor(){this.children=[];this.className='';this.dataset={};this.inert=false;this.isConnected=true;this.classList={add(){}};this.ownerDocument=doc;}
  set innerHTML(v){this.html=v;this.children=[];if(v.includes('farm-scene-base'))for(const c of ['farm-scene-base','farm-scene-feedback','farm-scene-save-warning']){const e=new Element();e.className=c;this.append(e);}if(v.includes('data-no')){this.no=new Element();this.yes=new Element();}}
  get innerHTML(){return this.html;}
  append(...els){for(const e of els){e.parent=this;this.children.push(e);}}
  replaceChildren(...els){this.children=[];this.append(...els);}
  querySelector(s){if(s==='[data-no]')return this.no;if(s==='[data-yes]')return this.yes;return this.querySelectorAll(s)[0];}
  querySelectorAll(s){if(s==='button')return[this.no,this.yes].filter(Boolean);const classes=s.split(',').map(x=>x.slice(1));return this.children.flatMap(e=>[...(classes.includes(e.className)?[e]:[]),...e.querySelectorAll(s)]);}
  focus(){doc.activeElement=this;}
  remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 }
 doc.createElement=()=>new Element();const root=new Element();
 const store={getState:()=>structuredClone(state),getStatus:()=>({readOnly}),get readOnly(){return readOnly},subscribe(fn){callbacks.add(fn);return()=>callbacks.delete(fn);},dispatch(c){commands.push(c);if(readOnly)return{ok:false,message:'只读'};try{const r=core.executeFarm(state,c,state.now);state=r.state;for(const f of callbacks)f();return r;}catch(e){return{ok:false,message:e.message};}}};
 const effect={pause(){},setReducedMotion(){},play(){},destroy(){}};
 const mount=ctx=>{contexts.push(ctx);return()=>{};};
 const code=source.replace(/^import .*;\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',JSON.stringify(new URL('../farm-scene-host.mjs',import.meta.url).href))+'\nmountFarm';
 const fn=vm.runInNewContext(code,{config,core,layout,save:{},stages:{},FARM_ASSETS:[],farmAsset(){},farmAssetUrl:id=>id,mountFarmDelight:()=>effect,mountWorldScene:mount,mountTradeScene:mount,mountManagementScene:mount,URL,queueMicrotask});
 const api=fn({root,store,onSound:c=>sounds.push(c)});
 return{api,root,contexts,commands,sounds,callbacks,doc,setReadOnly(v){readOnly=v},get state(){return state;}};
}
test('source routing targets exact product owners without changing fresh progression',()=>{
 const s=core.createFarm(0),before=structuredClone(s);
 assert.equal(farmSourceRoute('wheat',s).id,'P02');assert.equal(farmSourceRoute('egg',s).focusEntity,s.entities.find(e=>e.kind==='shelter').id);
 assert.equal(farmSourceRoute('chicken_feed',s).focusRecipe,'chicken_feed');assert.equal(farmSourceRoute('apple',s).id,'P03');assert.equal(farmSourceRoute('not-an-item',s),null);assert.deepEqual(s,before);
});
test('source routing chooses ripe matching field before empty field',()=>{const s=core.createFarm(0);s.entities.find(e=>e.id==='field_2').crop={itemId:'wheat',readyAt:0};assert.equal(farmSourceRoute('wheat',s).focusEntity,'field_2');});
test('host mount and opening/returning all read-only routes never dispatch commands',()=>{
 const h=harness(),ctx=h.contexts[0],before=structuredClone(h.state);for(let n=2;n<=19;n++){assert.equal(ctx.openScene('P'+String(n).padStart(2,'0')),true);h.contexts.at(-1).returnToOrigin();}assert.equal(h.commands.length,0);assert.deepEqual(h.state,before);h.api.destroy();assert.equal(h.callbacks.size,0);
});
test('route transition cancels local pending gestures and return removes child deactivation callbacks',()=>{
 const h=harness(),ctx=h.contexts[0];let parent=0,child=0;ctx.onDeactivate(()=>parent++);ctx.openScene('P08');assert.equal(parent,1);h.contexts.at(-1).onDeactivate(()=>child++);h.contexts.at(-1).returnToOrigin();h.api.setActive(false);assert.equal(parent,2);assert.equal(child,0);h.api.destroy();
});
test('confirmation makes background inert, cancels pending gesture, cancel spends nothing',()=>{
 const h=harness(),ctx=h.contexts[0];let cancelled=0;ctx.onDeactivate(()=>cancelled++);const close=ctx.confirm({title:'测试',body:'成本',onConfirm:()=>ctx.act({type:'plant',entityIds:['field_1'],itemId:'wheat'})});assert.equal(cancelled,1);assert.equal(h.root.querySelector('.farm-scene-base').inert,true);close();assert.equal(h.root.querySelector('.farm-scene-base').inert,false);assert.equal(h.commands.length,0);h.api.destroy();
});
test('deactivation closes pending confirmation; active refresh does not execute it',()=>{const h=harness();h.contexts[0].confirm({onConfirm:()=>{throw Error('must not run');}});h.api.setActive(false);assert.equal(h.root.querySelector('.farm-scene-confirm-backdrop'),undefined);assert.equal(h.root.querySelector('.farm-scene-base').inert,false);h.api.setActive(true);h.api.refresh();assert.equal(h.commands.length,0);h.api.destroy();});
test('economy flows through durable dispatch; readonly failure never produces success sound or state change',()=>{const h=harness(),ctx=h.contexts[0];assert.equal(ctx.act({type:'plant',entityIds:['field_1'],itemId:'wheat'}).ok,true);assert.equal(h.state.inventory.wheat,5);const before=structuredClone(h.state);h.setReadOnly(true);assert.equal(ctx.act({type:'plant',entityIds:['field_2'],itemId:'wheat'}).ok,false);assert.deepEqual(h.state,before);assert.deepEqual(h.sounds,['plant','soft-error']);h.api.destroy();});
test('escaping labels and production adapter have no demo state initialization',()=>{assert.equal(escapeScene('<&"\''),'&lt;&amp;&quot;&#39;');for(const pattern of ['createFarm(','setScenario','ctx.reset','ctx.advance','level=30'])assert(!source.includes(pattern),pattern);});
test('repeated confirmation activation commits once while busy',async()=>{const h=harness(),ctx=h.contexts[0];ctx.confirm({onConfirm:()=>ctx.act({type:'plant',entityIds:['field_1'],itemId:'wheat'})});const overlay=h.root.querySelector('.farm-scene-confirm-backdrop'),yes=overlay.querySelector('[data-yes]');await Promise.all([yes.onclick(),yes.onclick()]);assert.equal(h.commands.length,1);assert.equal(h.state.inventory.wheat,5);h.api.destroy();});
test('readonly camera persistence is skipped and equal saved camera does not write',async()=>{const h=harness(),ctx=h.contexts[0];ctx.saveCamera(h.state.camera);await new Promise(queueMicrotask);assert.equal(h.commands.length,0);h.setReadOnly(true);ctx.saveCamera({centerX:20,centerY:20,zoom:1});await new Promise(queueMicrotask);assert.equal(h.commands.length,0);h.api.destroy();});
test('a fully skipped collection produces no success sound',()=>{const h=harness(),before=structuredClone(h.state);const r=h.contexts[0].act({type:'harvest',entityIds:['field_1']});assert.equal(r.ok,true);assert.deepEqual(h.state.inventory,before.inventory);assert.deepEqual(h.sounds,[]);h.api.destroy();});
