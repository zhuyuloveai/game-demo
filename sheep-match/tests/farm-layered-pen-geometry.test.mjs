import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveShelterSpec,resolveShelterAnimal} from '../farm-runtime-shelters.mjs';
import {shelterCanvasRect,shelterCanvasPoint,shelterLayerDepths,shelterLayerHit,shelterSummary,shelterHitCandidates} from '../farm-shelter-geometry.mjs';
import {animalPlacement} from '../farm-animal-layout.mjs';
import {runtimeArtHit} from '../farm-runtime-art.mjs';
import {pointInPolygon,topmostHit,footprintPolygon,groundRect} from '../farm-world-geometry.mjs';
const kinds=['chicken','cow','pig','sheep','lamb'];
// Convex standing regions and exclusions are authored in the same source canvas.
const points=ps=>ps.map(([x,y])=>({x,y}));
for(const configId of kinds)for(const rotation of [0,270])test(`${configId}/${rotation}: full v2 pen has ground contacts and exposed body hit pixels in every state`,()=>{
 const e={id:'pen',kind:'shelter',configId,x:20,y:20,w:4,h:4,rotation},spec=resolveShelterSpec(e),canvas=shelterCanvasRect(e,e),d=shelterLayerDepths(e,e),before=JSON.stringify(e);
 assert.equal(canvas.width/canvas.height,1.2);
 for(const [i,p] of spec.referenceAnimalPlacements.entries()){
  assert(pointInPolygon({x:p.at[0],y:p.at[1]},points(spec.standingRegion)),`slot${i} inside activity area`);
  assert(spec.standingExclusions.every(poly=>!pointInPolygon({x:p.at[0],y:p.at[1]},points(poly))),`slot${i} not in building/ramp`);
 }
 for(const status of ['hungry','producing','ready']){
  const art=resolveShelterAnimal({configId,status}),rows=spec.referenceAnimalPlacements.map((_,i)=>animalPlacement(e,e,i,art));
  for(const [i,r] of rows.entries()){
   assert(pointInPolygon(r.foot,footprintPolygon(e,e)));
   assert(r.depth>d.building&&r.depth<d.frontFence);
   assert.deepEqual(r.foot,shelterCanvasPoint(e,e,spec.referenceAnimalPlacements[i].at));
   let exposed=0;
   for(let y=.08;y<.94;y+=.035)for(let x=.08;x<.94;x+=.035){
    const p={x:r.left+r.width*x,y:r.top+r.height*y};
    if(shelterLayerHit(e,e,'frontFence',p))continue;
    const hits=rows.map((q,j)=>runtimeArtHit(art,(p.x-q.left)/q.width,(p.y-q.top)/q.height,{mirror:rotation===270})?{id:j,z:q.depth}:null).filter(Boolean);
    if(topmostHit(hits)?.id===i)exposed++;
   }
   assert(exposed>12,`${status} animal ${i} has sufficient exposed alpha target (${exposed})`);
  }
 }
 assert.equal(JSON.stringify(e),before);
});
test('rotation mirrors layers, feet and animal pixels through one shared ground center',()=>{
 for(const configId of kinds){const e={configId,x:20,y:20,w:4,h:4},m={...e,rotation:270},art=resolveShelterAnimal({configId,status:'ready'}),g=groundRect(e,e);
  for(let i=0;i<resolveShelterSpec(e).referenceAnimalPlacements.length;i++){const a=animalPlacement(e,e,i,art),b=animalPlacement(m,m,i,art);assert(Math.abs(a.foot.x+b.foot.x-g.left-g.right)<1e-8);assert.equal(a.foot.y,b.foot.y);}
 }
});
test('summary status is one scoped affordance, does not collect or mutate economy',()=>{
 const e={animals:[{status:'ready'},{status:'hungry'},{status:'ready'}]},before=JSON.stringify(e);
 assert.deepEqual(shelterSummary(e),{state:'ready',count:2,label:'2只待收'});assert.equal(JSON.stringify(e),before);
 assert.equal(shelterSummary({animals:[]}),null);assert.equal(shelterSummary({animals:[{status:'producing'}]}),null);
});
test('formal scene uses new layers, own-pen summary, mirrored alpha and no rectangle-only fence hits',()=>{
 const source=readFileSync(new URL('../farm-scene-world.mjs',import.meta.url),'utf8');
 assert(source.includes('shelterCanvasRect(e,ctx.layout.getFootprint(e))'));
 assert(source.includes("resolveShelterAnimal(a)"));assert(source.includes('shelterForegroundAt(shelter,p)'));
 assert(source.includes('selected!==e.id&&!faded.has(e.id)'));assert(source.includes('selected===e.id&&!draft?'));
 assert(source.includes('data-pen="${e.id}"'));assert(source.includes("shelterHitCandidates(e,f,projected)"));
});

test('transparent common-canvas overlap does not fade unrelated pens; painted overlap still does',async()=>{
 const {animalOccluderIds}=await import('../farm-animal-layout.mjs');
 const target={left:0,top:0,width:40,height:40,depth:10,hitAt:p=>p.x>20&&p.y>20};
 const transparent={left:0,top:0,width:100,height:100,depth:20,entityId:'unrelated',hitAt:p=>p.x>50};
 assert.equal(animalOccluderIds([target],[transparent]).size,0);
 assert.deepEqual([...animalOccluderIds([target],[{...transparent,entityId:'painted',hitAt:p=>p.x>25&&p.y>25}])],['painted']);
});

test('neighbor rear-fence hit cannot steal a visible higher-depth chicken body',()=>{
 const e={id:'target',kind:'shelter',configId:'chicken',x:20,y:20,w:4,h:4},neighbor={...e,id:'neighbor',x:24},p={x:1579.6224,y:549.0432};
 const art=resolveShelterAnimal({configId:'chicken',status:'ready'}),r=animalPlacement(e,e,5,art),layers=shelterHitCandidates(neighbor,neighbor,p);
 assert(layers.some(l=>l.layer==='rearFence'));assert(!layers.some(l=>l.layer==='building'||l.layer==='frontFence'));
 assert(runtimeArtHit(art,(p.x-r.left)/r.width,(p.y-r.top)/r.height));
 assert.equal(topmostHit([...layers,{entityId:e.id,animalId:'a5',z:r.depth}]).animalId,'a5');
});
