import {resolveShelterAnimal,resolveShelterSpec} from '../farm-runtime-shelters.mjs';
import {shelterCanvasRect,shelterLayerDepths} from '../farm-shelter-geometry.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {artRotations,nextArtRotation,mirroredArt} from '../farm-art-direction.mjs';
import {anchoredArtRect,compactTrayPlacement,worldBadge} from '../farm-art-presentation.mjs';
import {resolveWorldArt,runtimeArtHit,runtimeArtFrontHit,renderRuntimeArt,RUNTIME_ART_METADATA} from '../farm-runtime-art.mjs';
import {project,footprintPolygon,pointInPolygon} from '../farm-world-geometry.mjs';
import {getFootprint,operationDoor,validateLayout,beginLayout} from '../farm-layout.mjs';
import {animalPlacement} from '../farm-animal-layout.mjs';
import {penLayers} from '../farm-pen-art.mjs';
import {CROPS,FRUITS,ANIMALS} from '../farm-config.mjs';
import {createFarm} from '../farm-core.mjs';
import {resolveTerrainArt,TERRAIN_DIRECTIONS} from '../farm-runtime-terrain.mjs';

test('new facing control cycles visible front doors; old rear-view layouts retain save compatibility',()=>{
 const e={kind:'machine',configId:'bakery',x:30,y:30,w:2,h:2,rotation:0};
 assert.deepEqual(artRotations(e),[0,270]);assert.equal(nextArtRotation(e),270);
 const turned={...e,rotation:270};assert.equal(nextArtRotation(turned),0);
 assert.equal(operationDoor(e).y,e.y+e.h);assert.equal(operationDoor(turned).x,e.x+e.h);
 for(const rotation of [90,180])assert.equal(nextArtRotation({...e,rotation}),0);
 for(const kind of ['house','field','road','fruit','obstacle'])assert.deepEqual(artRotations({...e,kind}),[0]);
 const s=createFarm(1);s.entities.find(e=>e.kind==='barn').rotation=180;
 assert(validateLayout(s,beginLayout(s)).ok,'unchanged legacy direction is accepted');
});
test('mirrored artwork and alpha hit map agree at all sampled visible/transparent pixels',()=>{
 const e={kind:'machine',configId:'bakery',rotation:270},a=resolveWorldArt(e);
 assert.match(renderRuntimeArt(a,{mirror:mirroredArt(e)}),/scale\(-1 1\)/);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++)assert.equal(runtimeArtHit(a,(x+.5)/64,(y+.5)/64,{mirror:true}),runtimeArtHit(a,(63-x+.5)/64,(y+.5)/64));
});
test('every crop and fruit growth state remains rooted in the same ground center',()=>{
 for(const itemId of Object.keys(CROPS))for(const now of [0,50,100]){
  const e={kind:'field',x:30,y:30,w:1,h:1,crop:{itemId,plantedAt:0,readyAt:100}},a=resolveWorldArt(e,now),r=anchoredArtRect(e,e,a),center=project(30.5,30.5);
  assert.deepEqual(r.foot,center);assert(Math.abs(r.top+r.height*a.anchor[1]-center.y)<1e-6);
  assert(r.width<=42,'ripe plants leave a visible margin around each 48px field');
 }
 for(const configId of Object.keys(FRUITS))for(const status of ['growing','ready','revive','withered']){
  const e={kind:'fruit',configId,status,readyAt:1e10,harvestStage:0,x:30,y:30,w:2,h:2},a=resolveWorldArt(e),r=anchoredArtRect(e,e,a);
  assert.deepEqual(r.foot,project(31,31));
 }
});
test('visual sizes remain stable when a collision footprint changes, and output anchors follow mirroring',()=>{
 const e={kind:'machine',configId:'bakery',x:20,y:20,w:2,h:2},a=resolveWorldArt(e),r=anchoredArtRect(e,e,a),larger=anchoredArtRect({...e,w:4,h:4},{w:4,h:4},a);
 assert.equal(r.width,larger.width);assert.equal(r.width,110);
 const left=compactTrayPlacement(r,a,1,false),right=compactTrayPlacement(r,a,1,true);
 assert.equal(left.width,44);assert.equal(left.slots,1);assert.equal((left.x+22)+(right.x+22),2*r.left+r.width);
});
test('unselected growing plants do not show countdowns, ripe crops keep a small actionable marker',()=>{
 const e={kind:'field',crop:{readyAt:100}};
 assert.equal(worldBadge(e,0).mode,'none');assert.equal(worldBadge(e,0,{selected:true}).mode,'label');
 assert.equal(worldBadge(e,100).mode,'dot');assert.equal(worldBadge(e,100,{editing:true}).mode,'none');
 assert.equal(worldBadge({kind:'fruit',status:'revive'},0).text,'!');
 assert.equal(worldBadge({kind:'machine',built:true,completed:[{}]},0).mode,'none');
});
test('five layered pens keep every full-capacity foot in the yard between rear and near fence',()=>{
 for(const configId of Object.keys(ANIMALS))for(const rotation of [0,270]){
  const e={kind:'shelter',configId,x:20,y:20,w:4,h:4,rotation},f=getFootprint(e),layers=penLayers(e,f),canvas=shelterCanvasRect(e,f);
  for(let i=0;i<ANIMALS[configId].capacity;i++){
   const r=animalPlacement(e,f,i,resolveShelterAnimal({configId,status:'ready'}));
   assert(pointInPolygon(r.foot,footprintPolygon(e,f)));assert(r.depth>shelterLayerDepths(e,f).building);
   assert(layers.rearDepth<r.depth&&r.depth<layers.frontDepth);
  }
  assert(layers.front.includes('<svg'));assert(layers.ground.includes(resolveShelterSpec(configId).layers.ground.src));assert(layers.ground.includes(resolveShelterSpec(configId).layers.buildingShadow.src));
 }
});
test('all sixteen flowering fence masks connect and ignore neighboring wooden fences',()=>{
 const base={kind:'decoration',configId:'flower_fence',x:20,y:20};
 for(let mask=0;mask<16;mask++){
  const rows=[base,...TERRAIN_DIRECTIONS.filter(d=>mask&d.bit).map(d=>({...base,x:base.x+d.dx,y:base.y+d.dy})),{...base,configId:'wood_fence',x:19,y:20}];
  const art=resolveTerrainArt(base,rows);assert.equal(art.mask,mask);assert.match(readFileSync(new URL(art.src),'utf8'),/viewBox="0 0 128 136"/);
 }
});
test('all PNGs ship authored spatial specifications and bridge/arch connection metadata',()=>{
 for(const [key,a] of Object.entries(RUNTIME_ART_METADATA)){assert(a.visualWidth>0,key);assert(a.anchor[1]<1,key);assert.equal(a.groundPoint.length,2);}
 for(const key of ['bridge','reward-bridge','arch','meadow-banner']){const a=RUNTIME_ART_METADATA['decor/'+key];assert.equal(a.connectionPoints.length,2);assert.equal(a.passageAxis.length,2);assert(a.layerPlan.length>=2);}
});
test('composite front masks reflect with the sprite and preserve complementary render layers',()=>{
 for(const configId of ['arch','bridge','decor_bridge','decor_flag']){
  const a=resolveWorldArt({kind:'decoration',configId});let front=0,back=0;
  for(let y=0;y<30;y++)for(let x=0;x<30;x++){
   const u=(x+.5)/30,v=(y+.5)/30,f=runtimeArtFrontHit(a,u,v);
   assert.equal(runtimeArtFrontHit(a,1-u,v,{mirror:true}),f);f?front++:back++;
  }
  assert(front>0&&back>0);const full=renderRuntimeArt(a),rear=renderRuntimeArt(a,{layer:'back'}),near=renderRuntimeArt(a,{layer:'front'});
  assert(!full.includes('<clipPath'));assert(rear.includes('clip-rule="evenodd"'));assert(near.includes('<clipPath'));
  assert.notEqual(rear.match(/id="([^"]+)/)[1],near.match(/id="([^"]+)/)[1],'clip definitions never collide across instances');
 }
});
