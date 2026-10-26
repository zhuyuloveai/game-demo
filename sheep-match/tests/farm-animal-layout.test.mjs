import test from 'node:test';
import assert from 'node:assert/strict';
import {animalPlacement,animalBadgeRect,shelterBackdropDepth,rectContains,animalOccluderIds} from '../farm-animal-layout.mjs';
import {footprintPolygon,pointInPolygon,topmostHit} from '../farm-world-geometry.mjs';
import {resolveWorldArt,runtimeArtHit} from '../farm-runtime-art.mjs';
import {segmentHits,createStroke,extendStroke,finishStroke} from '../farm-scene-world.mjs';
const species=['chicken','cow','pig','sheep','lamb'];
for(const configId of species)test(`${configId}: full pen has distinct stable feet, body targets and independent product indicators`,()=>{
 const e={id:'pen',kind:'shelter',configId,x:20,y:20,w:4,h:4},f={w:4,h:4},n=configId==='chicken'?6:5;
 let baseline;
 for(const status of ['hungry','producing','ready']){
  const meta=resolveWorldArt({kind:'animal',configId,status}),rows=Array.from({length:n},(_,i)=>animalPlacement(e,f,i,meta));
  assert.equal(new Set(rows.map(r=>`${r.foot.x},${r.foot.y}`)).size,n);
  if(baseline)assert.deepEqual(rows.map(r=>r.foot),baseline);else baseline=rows.map(r=>r.foot);
  for(const [i,r] of rows.entries()){
   assert(pointInPolygon(r.foot,footprintPolygon(e,f)),`foot ${i} inside original 4x4`);
   assert(r.depth>shelterBackdropDepth(e,f));
   const badge=animalBadgeRect(r),center={x:badge.left+9,y:badge.top+9};
   assert.deepEqual(rows.map((o,j)=>rectContains(animalBadgeRect(o),center)?j:null).filter(x=>x!==null),[i]);
   const indicatorHits=rows.map((o,j)=>rectContains(animalBadgeRect(o),center)||runtimeArtHit(meta,(center.x-o.left)/o.width,(center.y-o.top)/o.height)?{id:j,z:o.depth}:null).filter(Boolean);
   assert.equal(topmostHit(indicatorHits)?.id,i,'visible indicator targets its own animal, not an adjacent body');
   // Actual alpha body pixels have at least one exposed selectable point for every animal.
   let selectable=0;
   for(let y=.1;y<.9;y+=.08)for(let x=.1;x<.9;x+=.08){const p={x:r.left+r.width*x,y:r.top+r.height*y};
    const hits=rows.map((other,j)=>runtimeArtHit(meta,(p.x-other.left)/other.width,(p.y-other.top)/other.height)?{id:j,z:other.depth}:null).filter(Boolean);
    if(topmostHit(hits)?.id===i)selectable++;
   }
   assert(selectable>5,`body ${i} has exposed alpha hit area: ${selectable}`);
  }
  const badges=rows.map((r,i)=>{const b=animalBadgeRect(r);return {id:'a'+i,entityId:'pen',...b,right:b.left+b.width,bottom:b.top+b.height};});
  for(const order of [badges,[...badges].reverse()]){const first=order[0],stroke=createStroke({action:'collectAnimal',entityId:'pen'},{x:first.left+9,y:first.top+9});for(const b of order)extendStroke(stroke,{x:b.left+9,y:b.top+9},badges);const result=finishStroke(stroke);assert.equal(new Set(result.animalIds).size,n);assert.equal(result.animalIds.length,n);}
 }
});
test('animal presentation never mutates pen state and scales screen hit geometry consistently',()=>{
 const e={configId:'cow',x:20,y:20,w:4,h:4,animals:[]},before=JSON.stringify(e),r=animalPlacement(e,e,0,resolveWorldArt({kind:'animal',configId:'cow',status:'ready'}));
 for(const zoom of [.75,1,1.75]){const b=animalBadgeRect(r),screen={left:b.left*zoom,top:b.top*zoom,width:b.width*zoom,height:b.height*zoom};assert(rectContains(screen,{x:(b.left+9)*zoom,y:(b.top+9)*zoom}));}
 assert.equal(JSON.stringify(e),before);
});

test('zero, single, three and mixed-state full pens preserve existing slot identity',()=>{
 for(const configId of species){const e={configId,x:20,y:20,w:4,h:4},n=configId==='chicken'?6:5,states=['hungry','producing','ready'];
  const all=Array.from({length:n},(_,i)=>{const meta=resolveWorldArt({kind:'animal',configId,status:states[i%3]});return {meta,...animalPlacement(e,e,i,meta)};});
  for(const count of [0,1,3,n])assert.deepEqual(all.slice(0,count).map(r=>r.foot),Array.from({length:count},(_,i)=>animalPlacement(e,e,i,all[i].meta).foot));
  for(const [i,r] of all.entries()){const b=animalBadgeRect(r),p={x:b.left+9,y:b.top+9},hits=all.map((o,j)=>rectContains(animalBadgeRect(o),p)||runtimeArtHit(o.meta,(p.x-o.left)/o.width,(p.y-o.top)/o.height)?{id:j,z:o.depth}:null).filter(Boolean);assert.equal(topmostHit(hits)?.id,i);}
 }
});

test('selected full pen cuts away adjacent foreground animals even when their own shelter backdrop is behind',()=>{
 const meta=resolveWorldArt({kind:'animal',configId:'cow',status:'ready'}),e={id:'target',configId:'cow',x:20,y:20,w:4,h:4};
 const targets=Array.from({length:5},(_,i)=>animalPlacement(e,e,i,meta));
 for(const delta of [{x:0,y:4},{x:4,y:0}]){const other={...e,id:'neighbor',x:e.x+delta.x,y:e.y+delta.y},animals=Array.from({length:5},(_,i)=>({...animalPlacement(other,other,i,meta),entityId:other.id}));assert.deepEqual([...animalOccluderIds(targets,animals)],['neighbor']);}
 const far={...e,x:40,y:40};assert.equal(animalOccluderIds(targets,[{...animalPlacement(far,far,0,meta),entityId:'far'}]).size,0);
});
