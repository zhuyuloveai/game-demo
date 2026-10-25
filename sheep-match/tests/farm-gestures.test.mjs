import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmStroke,extendFarmStroke,cancelFarmStroke,finishFarmStroke,previewFarmStroke,traceFarmSegment} from '../farm-gestures.mjs';
const state=()=>({now:200000,inventory:{wheat:6},storage:{silo:{capacity:50}},entities:Array.from({length:20},(_,i)=>({id:`field_${i}`,kind:'field',x:i,y:0,crop:null}))});
const target=cell=>cell.y===0&&cell.x>=0&&cell.x<20?`field_${cell.x}`:null;
test('fast 20-field strokes cover intermediate cells and repeated backtracking never duplicates IDs',()=>{const stroke=createFarmStroke('plant','wheat',{x:.5,y:.5});extendFarmStroke(stroke,{x:19.5,y:.5},target);extendFarmStroke(stroke,{x:.5,y:.5},target);assert.equal(stroke.ids.length,20);assert.deepEqual(stroke.ids,Array.from({length:20},(_,i)=>`field_${i}`));const command=finishFarmStroke(stroke);assert.equal(command.entityIds.length,20);assert.equal(command.type,'plant');assert.equal(finishFarmStroke(stroke),null);});
test('pan mode never creates a production transaction',()=>{assert.equal(createFarmStroke('pan','wheat',{x:0,y:0}),null);assert.equal(finishFarmStroke(null),null);});
for(const reason of ['second-pointer','pointercancel','blur','background','orientation','toolbar','mode-change','exit'])test(`cancel ${reason} discards whole stroke and cannot execute`,()=>{const s=state(),before=structuredClone(s),stroke=createFarmStroke('plant','wheat',{x:.5,y:.5});extendFarmStroke(stroke,{x:19.5,y:.5},target);cancelFarmStroke(stroke,reason);assert.equal(finishFarmStroke(stroke),null);assert.deepEqual(s,before);assert.deepEqual(stroke.ids,[]);});
test('partial planting is previewed in first-hit order, with no reserve charged and no purchase',()=>{const s=state();s.inventory.wheat=2;const stroke=createFarmStroke('plant','wheat',{x:.5,y:.5});extendFarmStroke(stroke,{x:5.5,y:.5},target);const preview=previewFarmStroke(s,stroke);assert.deepEqual(preview.filter(p=>p.valid).map(p=>p.id),['field_0','field_1']);assert.equal(s.inventory.wheat,2);});
test('a normal two-item harvest cannot split into the one free slot; net one-item rescue fits',()=>{const s=state();s.inventory.wheat=49;s.entities[0].crop={itemId:'wheat',readyAt:1,yieldCount:2};s.entities[1].crop={itemId:'wheat',readyAt:1,yieldCount:1,rescue:true};const stroke=createFarmStroke('harvest',null,{x:.5,y:.5});extendFarmStroke(stroke,{x:1.5,y:.5},target);assert.deepEqual(previewFarmStroke(s,stroke).map(p=>p.valid),[false,true]);assert.equal(s.inventory.wheat,49);});
test('diagonal corner traversal includes all crossed cells and is reversible',()=>{const forward=traceFarmSegment({x:.5,y:.5},{x:4.5,y:4.5}),reverse=traceFarmSegment({x:4.5,y:4.5},{x:.5,y:.5});const key=a=>new Set(a.map(p=>`${p.x},${p.y}`));assert.deepEqual(key(forward),key(reverse));assert.ok(forward.some(p=>p.x===1&&p.y===0));assert.ok(forward.some(p=>p.x===0&&p.y===1));});
test('feeding preview consumes available feed once across multiple shelters',()=>{const s=state();s.inventory.chicken_feed=4;s.entities=[{id:'s1',kind:'shelter',configId:'chicken',animals:Array.from({length:3},()=>({status:'hungry'}))},{id:'s2',kind:'shelter',configId:'chicken',animals:Array.from({length:3},()=>({status:'hungry'}))}];const stroke=createFarmStroke('feed',null,{x:0,y:0});stroke.ids=['s1','s2'];assert.deepEqual(previewFarmStroke(s,stroke).map(p=>p.quantity),[3,1]);assert.equal(s.inventory.chicken_feed,4);});

test('DOM-world projection matches QA field center at zoom0.75 with native scrollTop211',async()=>{
 const {farmPointFromWorldRect,farmCameraAfterScroll}=await import('../farm-gestures.mjs');
 const worldRect={left:-417,top:-736.797,width:2304,height:2304};
 const point=farmPointFromWorldRect(645,289.203,worldRect);
 assert.ok(Math.abs(point.x-29.5)<1e-10);
 assert.ok(Math.abs(point.y-28.5)<1e-10);
 const oldCamera={x:-417,y:-682.797};
 const camera=farmCameraAfterScroll(oldCamera,0,211);
 assert.equal(camera.x,-417);assert.equal(camera.y,-893.797);
 assert.deepEqual(oldCamera,{x:-417,y:-682.797});
 assert.ok(Math.abs((157+camera.y)-worldRect.top)<1e-10,'absorbing scroll preserves the visual world origin');
});
test('rendered cell centers remain exact across pan, zoom, both-axis native and ancestor scrolling',async()=>{
 const {farmPointFromWorldRect}=await import('../farm-gestures.mjs');
 for(const zoom of [.75,1,1.25,1.75])for(const scroll of [{x:0,y:0},{x:75,y:211},{x:321,y:589}]){
  const rect={left:80-417-scroll.x,top:157-682.797-scroll.y,width:3072*zoom,height:3072*zoom};
  for(const cell of [{x:28,y:28},{x:29,y:28},{x:30,y:29},{x:48,y:48}]){
   const point=farmPointFromWorldRect(rect.left+(cell.x+.5)*48*zoom,rect.top+(cell.y+.5)*48*zoom,rect);
   assert.ok(Math.abs(point.x-cell.x-.5)<1e-10);assert.ok(Math.abs(point.y-cell.y-.5)<1e-10);
  }
 }
});
test('scrolled visual stroke still covers its mature field IDs rather than a displaced row',async()=>{
 const {farmPointFromWorldRect}=await import('../farm-gestures.mjs');
 const rect={left:-417,top:-736.797,width:2304,height:2304};
 const first=farmPointFromWorldRect(645,289.203,rect),last=farmPointFromWorldRect(681,289.203,rect);
 const stroke=createFarmStroke('harvest',null,first);
 extendFarmStroke(stroke,last,cell=>cell.y===28&&[29,30].includes(cell.x)?`field_${cell.x}`:null);
 assert.deepEqual(finishFarmStroke(stroke).entityIds,['field_29','field_30']);
});
test('hidden or zero-size world cannot create non-finite economic target coordinates',async()=>{
 const {farmPointFromWorldRect}=await import('../farm-gestures.mjs');
 assert.throws(()=>farmPointFromWorldRect(1,1,{left:0,top:0,width:0,height:0}),RangeError);
});
