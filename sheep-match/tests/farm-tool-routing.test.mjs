import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm} from '../farm-core.mjs';
import * as config from '../farm-config.mjs';
import * as layout from '../farm-layout.mjs';
import {directWorldTool} from '../farm-scene-world.mjs';
const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
const methods=source.slice(source.indexOf('    function handleDown('),source.indexOf('    function edgeFrame('));
function routing({entityId='field_1',animalId=null,editing=false}={}){
 const state=createFarm(1000),shelter=state.entities.find(e=>e.kind==='shelter'),calls={opened:[],transforms:0,tools:[],captures:[]};
 if(animalId===true)animalId=shelter.animals[0].id;
 const ent=animalId?null:{dataset:{entity:entityId}},animal=animalId?{dataset:{animal:animalId,shelter:shelter.id}}:null;
 const target={closest:selector=>({'[data-entity]':ent,'[data-animal]':animal,'button':ent||animal,'.fw-world':{},'.fw-map':{}})[selector]||null};
 const env={ctx:{state,layout},config,directWorldTool,entity:id=>state.entities.find(e=>e.id===id),draft:editing?layout.beginLayout(state):null,placement:null,pointers:new Map(),gesture:null,selected:null,selectedAnimal:null,chosenSeed:'wheat',lastFieldTap:{id:'field_1',at:900},camera:{x:0,y:0,zoom:1},focusAnchor:null,
  point:e=>({x:e.clientX,y:e.clientY}),worldPoint:p=>p,clone:structuredClone,
  game:{setPointerCapture:id=>calls.captures.push(id),getBoundingClientRect:()=>({left:0,top:0,right:1000,bottom:1000})},
  win:{setTimeout:()=>assert.fail('Ordinary object input cannot schedule edit mode')},
  note:{},cursor:{},actualUI:()=>false,within:(p,r)=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom,
  transform:()=>calls.transforms++,renderMap(){},renderTransaction(){},render(){},
  openObject:(...args)=>calls.opened.push(args),startDirectDrag:()=>assert.fail('Bare world input must not infer an economic stroke')};
 const api=new Function(...Object.keys(env),`${methods};return {down:handleDown,move:handleMove,up:handleUp,snapshot:()=>({gesture,camera,lastFieldTap,selected})};`)(...Object.values(env));
 const event=(x,y)=>({button:0,pointerId:1,clientX:x,clientY:y,target,preventDefault(){}});
 return {api,event,calls,state};
}
test('bare field and animal drags always pan and invalidate a pending crop double tap',()=>{
 for(const options of [{},{animalId:true}]){
  const r=routing(options);r.api.down(r.event(100,100));assert.equal(r.api.snapshot().gesture.type,'pan-pending');
  r.api.move(r.event(170,130));assert.equal(r.api.snapshot().gesture.type,'pan');assert.equal(r.api.snapshot().lastFieldTap,null);
  assert.deepEqual(r.api.snapshot().camera,{x:70,y:30,zoom:1});r.api.up(r.event(170,130));assert.equal(r.calls.opened.length,0);assert.equal(r.calls.transforms,1);
 }
});
test('stationary animal release only routes selection and does not silently choose a tool',()=>{
 const r=routing({animalId:true});r.api.down(r.event(100,100));const animal=r.state.entities.find(e=>e.kind==='shelter').animals[0];r.api.up(r.event(100,100));assert.deepEqual(r.calls.opened,[['shelter_chicken_1',animal.id]]);assert.equal(r.api.snapshot().gesture,null);
});
test('explicit layout mode can immediately grab a shelter through its animal hitbox',()=>{
 const r=routing({animalId:true,editing:true});r.api.down(r.event(100,100));assert.equal(r.api.snapshot().gesture.type,'edit');assert.equal(r.api.snapshot().selected,'shelter_chicken_1');
});
test('recipe drag can cross its own machine-panel padding to reach the machine, while other UI still cancels',()=>{
 const body=source.slice(source.indexOf('    function gestureUI('),source.indexOf('    function startDirectDrag('));
 const panel={contains:el=>el===padding},padding={closest:selector=>selector==='.fw-machine-panel'?panel:null};
 const hit=new Function('doc','selectedEntity','actualUI',`${body};return gestureUI;`)({elementFromPoint:()=>padding},()=>({id:'bakery'}),(p,except)=>!except?.contains(padding));
 assert.equal(hit({tool:{action:'enqueue',entityId:'bakery'}},{}),false);
 assert.equal(hit({tool:{action:'enqueue',entityId:'other'}},{}),true);
 assert.equal(hit({tool:{action:'harvest',entityId:'field_1'}},{}),true);
});
