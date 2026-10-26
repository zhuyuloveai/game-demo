import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm} from '../farm-core.mjs';
import * as layout from '../farm-layout.mjs';

const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
function method(name,next){const start=source.indexOf(`    function ${name}(`),end=source.indexOf(`    function ${next}(`,start);assert(start>=0&&end>start);return source.slice(start,end);}
// Exercise the actual pointer routing with inert DOM destinations and real layout rules.
function controls(targetId){
 const state=createFarm(1000),draft=layout.beginLayout(state),calls={renders:0,fullRenders:0,captures:[],messages:[]};
 const node={dataset:{entity:targetId}},world={},map={};
 const target={closest(selector){return selector==='[data-entity]'||selector==='button'?node:selector==='.fw-world'?world:selector==='.fw-map'?map:null;}};
 const env={growthPreview:null,draft,selected:'barn',selectedAnimal:null,gesture:null,placement:null,pointers:new Map(),longPressTimer:0,
  ctx:{layout,say:text=>calls.messages.push(text)},entity:id=>state.entities.find(e=>e.id===id),
  point:e=>({x:e.clientX,y:e.clientY}),worldPoint:p=>p,clone:structuredClone,actualUI:()=>false,
  within:(p,r)=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom,
  win:{clearTimeout(){},setTimeout(){assert.fail('An edit drag must not wait for a long press');}},
  game:{setPointerCapture:id=>calls.captures.push(id),getBoundingClientRect:()=>({left:0,top:0,right:1000,bottom:1000})},
  note:{},cursor:{},render:()=>calls.fullRenders++,
  pushDraft:next=>{if(!layout.validateLayout(state,next).ok)return false;draft.positions=structuredClone(next);return true;},
  renderMap:()=>calls.renders++,renderTransaction:()=>calls.renders++,cancelGesture(){assert.fail('Unexpected cancellation');}
 };
 const api=new Function(...Object.keys(env),`${method('handleDown','handleMove')}${method('handleMove','handleUp')}${method('handleUp','edgeFrame')}return {down:handleDown,move:handleMove,up:handleUp,selection:()=>selected,gesture:()=>gesture};`)(...Object.values(env));
 const event=(x,y)=>({button:0,pointerId:1,clientX:x,clientY:y,target,preventDefault(){}});
 return {api,event,state,draft,calls};
}

test('layout first drag selects and moves a different movable object immediately',()=>{
 const f=controls('silo'),before=structuredClone(f.state);
 f.api.down(f.event(30.5,20.5));
 assert.equal(f.api.selection(),'silo');assert.equal(f.api.gesture().type,'edit');
 assert.deepEqual(f.calls.captures,[1]);
 assert.deepEqual(f.api.gesture().offset,{x:2.5,y:.5});
 f.api.move(f.event(42.5,30.5));
 assert.deepEqual(f.draft.positions.find(p=>p.id==='silo'),{id:'silo',x:40,y:30,rotation:0,stored:false});
 assert.equal(layout.validateLayout(f.state,f.draft).ok,true);
 assert.deepEqual(f.state,before,'drag changes a draft, not the committed layout or economy');
 assert.equal(f.calls.renders,4);
});

test('fixed house drag is explicitly blocked and cannot pan or alter the draft',()=>{
 const f=controls('house'),before=structuredClone(f.draft);
 f.api.down(f.event(22,22));assert.equal(f.api.selection(),'house');
 assert.equal(f.api.gesture().type,'fixed');
 f.api.move(f.event(32,32));assert.equal(f.api.gesture().type,'fixed');
 assert.deepEqual(f.draft,before);
});

test('dropping onto another building restores both the draft and its visible position',()=>{
 const f=controls('silo'),before=structuredClone(f.draft);
 f.api.down(f.event(30.5,20.5));f.api.move(f.event(28.5,20.5));
 assert.equal(layout.validateLayout(f.state,f.draft).ok,false);
 f.api.up(f.event(28.5,20.5));
 assert.deepEqual(f.draft,before);assert.equal(f.calls.fullRenders,1,'rejected drop must repaint its restored position');
 assert.equal(f.api.gesture(),null);
});

test('fixed house selection explains the restriction instead of offering to move it',()=>{
 const start=source.indexOf('    function renderContext()'),end=source.indexOf('    function machineBoard(',start);
 const context={innerHTML:''},house=createFarm(1000).entities.find(e=>e.id==='house');
 const env={context,chosenSeed:null,selected:'house',gesture:null,draft:null,placement:null,more:false,localPage:null,
  selectedEntity:()=>house,ctx:{layout},config:{},title:()=> '农场小屋',esc:s=>s,
  button:(action,label)=>`<button data-action="${action}">${label}</button>`};
 new Function(...Object.keys(env),`${source.slice(start,end)}renderContext();`)(...Object.values(env));
 assert.match(context.innerHTML,/固定建筑，不能移动或旋转/);
 assert.match(context.innerHTML,/布置其他物件/);assert.doesNotMatch(context.innerHTML,/移动农场小屋|布置这个物件/);
});
