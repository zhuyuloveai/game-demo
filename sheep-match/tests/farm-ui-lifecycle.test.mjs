import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm} from '../farm-core.mjs';
import {createFarmStroke,extendFarmStroke,cancelFarmStroke,finishFarmStroke} from '../farm-gestures.mjs';

const source=readFileSync(new URL('../farm-ui.mjs',import.meta.url),'utf8');

// Execute the real lifecycle functions with inert DOM destinations, not a
// browser mock. These contracts do not claim visual or browser focus coverage.
function functionSource(name){
  const match=source.match(new RegExp(`^  (?:async )?function ${name}\\([^]*?^  }`,'m'));
  assert(match,`${name} has a bounded source section`);
  return match[0];
}
function methods(names,context){
  return new Function(...Object.keys(context),`"use strict";${names.map(functionSource).join('\n')}return {${names.join(',')}};`)(...Object.values(context));
}
function node(){
  const classes=new Set();
  return {
    hidden:false,textContent:'',attributes:{},
    setAttribute(name,value){this.attributes[name]=value;},
    classList:{
      add(...names){for(const name of names)classes.add(name);},
      remove(...names){for(const name of names)classes.delete(name);},
      toggle(name,on){if(on)classes.add(name);else classes.delete(name);},
      contains:name=>classes.has(name)
    }
  };
}
function fixture(){
  const nodes=new Map(),timers=new Map(),calls={focus:[],visibility:[],refresh:0,renderMap:0,save:[]};
  let nextTimer=0;
  const s=createFarm(1000);
  const ui={
    inactive:false,mode:'layout',draft:{positions:[{id:'field_1',x:25,y:26}]},
    undo:[{positions:'previous'}],redo:[{positions:'next'}],selected:'field_1',
    placing:{category:'decoration',id:'flowerpot',cost:40},
    camera:{x:-123,y:-456},zoom:1.25,cropId:'wheat',feedSpecies:'chicken',
    pointers:new Map(),gesture:null,stroke:null,edgeStart:0,
    panel:null,panelTab:'',entityId:null,confirm:null,previousPanel:null,
    quickEntityId:null,lastMessage:'',toastTimer:null,draftTimer:'draft-timer',cameraTimer:'camera-timer'
  };
  const app={querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);}};
  const overlay=app.querySelector('.farm-overlay');overlay.hidden=true;
  const context={
    ui,s,app,overlay,cancelFarmStroke,
    view:{focus:options=>calls.focus.push(options)},
    store:Object.fromEntries(['dispatch','saveDraft','clearDraft'].map(name=>[name,(...args)=>calls.save.push({name,args})])),
    entityLayer:{querySelectorAll:()=>[]},
    renderMapHint:()=>{},renderMap:()=>{calls.renderMap++;},
    syncDelightVisibility:()=>calls.visibility.push(ui.inactive),
    delight:{refresh:()=>{calls.refresh++;}},
    clearTimeout:id=>timers.delete(id),
    setTimeout:callback=>{const id=++nextTimer;timers.set(id,callback);return id;}
  };
  const api=methods(['closePanel','resetTransientUi','setActive','hideQuickTools','setCameraTools','cancelGesture','cancelForBackground','renderStroke','status','toast'],context);
  function dirtyTransient(panel='more'){
    ui.panel=panel;ui.panelTab='vouchers';ui.entityId='machine_bakery_1';
    ui.confirm={title:'旧确认',onYes:()=>assert.fail('cleanup must never confirm an action')};
    ui.previousPanel={panel:'machine',panelTab:'queue',entityId:'machine_bakery_1'};
    overlay.hidden=false;ui.quickEntityId='field_1';
    app.querySelector('.farm-object-tools').hidden=false;
    api.setCameraTools(true);api.status('旧提示',true);
    app.querySelector('.farm-status').classList.add('is-visible');
  }
  function assertClean(){
    assert.equal(ui.panel,null);assert.equal(ui.confirm,null);assert.equal(overlay.hidden,true);
    assert.equal(ui.panelTab,'');assert.equal(ui.entityId,null);assert.equal(ui.previousPanel,null);
    assert.equal(ui.quickEntityId,null);assert.equal(app.querySelector('.farm-object-tools').hidden,true);
    assert.equal(app.querySelector('.farm-camera-popover').hidden,true);
    assert.equal(app.querySelector('[data-action="camera-menu"]').attributes['aria-expanded'],'false');
    assert.equal(ui.toastTimer,null);assert.equal(timers.size,0);assert.equal(ui.lastMessage,'');
    assert.equal(app.querySelector('.farm-toast').textContent,'');
    const status=app.querySelector('.farm-status');
    assert.equal(status.textContent,'');
    for(const name of ['is-visible','is-error'])assert.equal(status.classList.contains(name),false);
    assert.equal(calls.focus.length,0,'leaving or reentering never focuses the hidden farm viewport');
  }
  return {ui,s,app,overlay,context,api,calls,timers,dirtyTransient,assertClean};
}
const retainedKeys=['mode','draft','undo','redo','selected','placing','camera','zoom','cropId','feedSpecies','draftTimer','cameraTimer'];
function retained(f){return Object.fromEntries(retainedKeys.map(key=>[key,f.ui[key]]));}
function assertRetained(f,refs,snapshot,state){
  for(const key of retainedKeys)assert.equal(f.ui[key],refs[key],`${key} retains its identity/value`);
  assert.deepEqual(retained(f),snapshot,'draft, camera and editing choices stay unchanged');
  assert.deepEqual(f.s,state,'lifecycle cleanup never changes the economy or save data');
  assert.deepEqual(f.calls.save,[],'lifecycle cleanup issues no economic command or save write');
}

test('repeated farm departures and returns clear all temporary panels and tools without losing state',()=>{
  const f=fixture(),refs=retained(f),snapshot=structuredClone(refs),state=structuredClone(f.s);
  for(const panel of ['more','machine','confirm']){
    f.dirtyTransient(panel);
    f.api.setActive(false);
    assert.equal(f.ui.inactive,true);f.assertClean();
    f.api.setActive(false);f.assertClean();
    // Even temporary UI left behind while inactive cannot reappear on entry.
    f.dirtyTransient(panel);
    f.api.setActive(true);
    assert.equal(f.ui.inactive,false);f.assertClean();
    assertRetained(f,refs,snapshot,state);
  }
  assert.deepEqual(f.calls.visibility,[true,true,false,true,true,false,true,true,false]);
  assert.equal(f.calls.refresh,3);
});

test('deactivation cancels pending farm strokes and tool drags before discarding their feedback',()=>{
  for(const type of ['stroke','tool-pending','tool-drag']){
    const f=fixture(),refs=retained(f),snapshot=structuredClone(refs),state=structuredClone(f.s);
    f.dirtyTransient('confirm');
    const stroke=createFarmStroke('plant','wheat',{x:0,y:0});
    extendFarmStroke(stroke,{x:2,y:0},({x})=>`field_${x}`);
    f.ui.stroke=type==='stroke'?stroke:null;f.ui.gesture={type};
    f.ui.pointers.set(7,{x:10,y:20});f.ui.edgeStart=123;
    f.app.querySelector('.farm-drag-tool').hidden=false;
    f.api.setActive(false);
    assert.equal(f.ui.stroke,null);assert.equal(f.ui.gesture,null);
    assert.equal(f.ui.pointers.size,0);assert.equal(f.ui.edgeStart,0);
    assert.equal(f.app.querySelector('.farm-drag-tool').hidden,true);
    if(type==='stroke')assert.equal(finishFarmStroke(stroke),null,'cancelled preview cannot later spend resources');
    assert.equal(f.calls.renderMap,1);f.assertClean();
    assertRetained(f,refs,snapshot,state);
  }
});

test('leaving during a layout drag restores only its uncommitted preview and retains the draft',()=>{
  const f=fixture(),original=structuredClone(f.ui.draft.positions),draft=f.ui.draft;
  const refs=retained(f),snapshot=structuredClone(refs),state=structuredClone(f.s);
  f.ui.gesture={type:'edit',original};
  f.ui.draft.positions=[{id:'field_1',x:33,y:34}];
  f.api.setActive(false);f.api.setActive(true);
  assert.equal(f.ui.draft,draft);assert.equal(f.ui.draft.positions,original);
  assertRetained(f,refs,snapshot,state);f.assertClean();
});

test('active-to-active calls refresh delight without closing an open menu or confirmation',()=>{
  for(const panel of ['more','confirm']){
    const f=fixture();f.dirtyTransient(panel);
    const confirm=f.ui.confirm,previous=f.ui.previousPanel,timer=f.ui.toastTimer;
    f.api.setActive(true);f.api.setActive(true);
    assert.equal(f.ui.panel,panel);assert.equal(f.overlay.hidden,false);
    assert.equal(f.ui.confirm,confirm);assert.equal(f.ui.previousPanel,previous);
    assert.equal(f.ui.panelTab,'vouchers');assert.equal(f.ui.entityId,'machine_bakery_1');
    assert.equal(f.ui.quickEntityId,'field_1');assert.equal(f.app.querySelector('.farm-camera-popover').hidden,false);
    assert.equal(f.ui.toastTimer,timer);assert.equal(f.timers.size,1);
    assert.equal(f.calls.renderMap,0);assert.equal(f.calls.focus.length,0);
    assert.equal(f.calls.refresh,2);assert.deepEqual(f.calls.visibility,[false,false]);
  }
});

test('ordinary panel closing still restores map keyboard focus while lifecycle cleanup does not',()=>{
  const f=fixture();f.dirtyTransient();
  f.api.closePanel();
  assert.deepEqual(f.calls.focus,[{preventScroll:true}]);
  assert.equal(f.ui.panel,null);assert.equal(f.ui.confirm,null);assert.equal(f.overlay.hidden,true);
  f.api.closePanel({focus:false});
  assert.equal(f.calls.focus.length,1);
});

test('exit still defers leaving a changed layout until its existing discard confirmation succeeds',async()=>{
  const ui={mode:'layout',draft:{positions:[{id:'field_1',x:9,y:9}]}};
  const calls=[],pending=[];
  const {action}=methods(['action','cancelLayout'],{
    ui,s:{},beginLayout:()=>({positions:[{id:'field_1',x:1,y:1}]}),
    cancelGesture:()=>calls.push('cancel-gesture'),finishLayout:()=>calls.push('finish-layout'),
    onExit:()=>calls.push('exit'),ask:(title,text,onYes)=>pending.push({title,text,onYes})
  });
  await action('exit');
  assert.deepEqual(calls,['cancel-gesture'],'exit cannot bypass the unsaved-layout decision');
  assert.equal(pending.length,1);assert.match(pending[0].title,/未保存/);
  pending[0].onYes();
  assert.deepEqual(calls,['cancel-gesture','finish-layout','exit']);
  ui.mode='pan';await action('exit');
  assert.deepEqual(calls.slice(-2),['cancel-gesture','exit'],'ordinary exits remain direct');
});

test('mountFarm exposes the tested setActive function through its public lifecycle API',()=>{
  const start=source.lastIndexOf('\n  return {'),end=source.lastIndexOf('\n}');
  assert(start>=0&&end>start);
  const setActive=()=>{},api=new Function('setActive','render','openPanel',source.slice(start,end))(setActive,()=>{},()=>{});
  assert.equal(api.setActive,setActive);
});
