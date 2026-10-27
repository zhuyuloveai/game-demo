import test from 'node:test';
import assert from 'node:assert/strict';
import {mountManagementScene} from '../farm-scene-management.mjs';
import {createFarmStore} from '../farm-save.mjs';
import * as core from '../farm-core.mjs';
import * as config from '../farm-config.mjs';
import * as layout from '../farm-layout.mjs';
function harness(id){
 const data=new Map();let clock=1000,writes=0,html='',listener;
 const store=createFarmStore({storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},now:()=>clock,monotonicNow:()=>clock,locks:null,key:`paint-${id}`});
 const root={contains:()=>false,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(k,f){if(k==='click')listener=f},removeEventListener(){}};
 Object.defineProperty(root,'innerHTML',{get:()=>html,set:v=>{html=v;writes++}});
 const ctx={id,root,doc:{activeElement:null},win:{},config,core,layout,store,get state(){return store.getState()},act:c=>store.dispatch(c),subscribe:f=>store.subscribe(f),onExit(){},asset:p=>p,item:id=>`<img data-item="${id}">`,name:id=>id,img:p=>`<img src="${p}">`};
 const cleanup=mountManagementScene(ctx);
 return {store,root,get writes(){return writes},tick(){clock+=1000;return store.tick()},click(action){root.contains=()=>true;listener({target:{closest:()=>({dataset:{mg:action}})}})},close(){cleanup();store.close()}};
}
test('P13 clock-only durable commits do not replace unchanged management markup',()=>{
 const h=harness('P13');try{const before=h.writes,rev=h.store.getState().revision;for(let i=0;i<5;i++)assert.equal(h.tick().ok,true);assert(h.store.getState().revision>rev);assert.equal(h.writes,before)}finally{h.close()}
});
test('P13 real tutorial changes still repaint and delegated actions remain active',()=>{
 const h=harness('P13');try{const before=h.writes;h.click('skip');assert.equal(h.store.getState().tutorial.skip,true);assert(h.writes>before);assert.match(h.root.innerHTML,/已跳过就地提示/);h.click('tab:goals');assert.match(h.root.innerHTML,/经营目标沿用原教学记录/)}finally{h.close()}
});
test('P17 audio and backup retain markup across real clock commits',()=>{
 const h=harness('P17');try{let before=h.writes;h.tick();assert.equal(h.writes,before);h.click('tab:backup');before=h.writes;h.tick();assert.equal(h.writes,before);assert.match(h.root.innerHTML,/data-import-file/)}finally{h.close()}
});
test('P18 actual production countdown continues updating rather than freezing all clock notifications',()=>{
 const h=harness('P18');try{const field=h.store.getState().entities.find(e=>e.kind==='field');assert.equal(h.store.dispatch({type:'plant',entityIds:[field.id],itemId:'wheat'}).ok,true);const before=h.writes,html=h.root.innerHTML;h.tick();assert(h.writes>before);assert.notEqual(h.root.innerHTML,html)}finally{h.close()}
});
