import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveShelterSpec,resolveShelterLayer,resolveShelterAnimalArt,resolveShelterAnimal,resolveShelterAnimalShadow,shelterRuntimeInventory,SHELTER_ASSET_METADATA} from '../farm-runtime-shelters.mjs';
import {renderRuntimeArt,runtimeArtHit} from '../farm-runtime-art.mjs';
const kinds=['chicken','cow','pig','sheep','lamb'];
const states=['hungry','producing','ready'];
const sha=data=>createHash('sha256').update(data).digest('hex');
test('five approved shelters retain source-space footprint, support, exclusions and contact metadata',()=>{
 for(const kind of kinds){
  const spec=resolveShelterSpec(kind),source=readFileSync(new URL('../'+spec.source,import.meta.url)),layout=JSON.parse(source);
  assert.equal(sha(source),spec.sourceSha256);
  for(const field of ['canvas','footprint','buildingSupport','standingRegion','standingExclusions','entry','occlusion','animalCanvas','referenceAnimalPlacements','animals'])assert.deepEqual(spec[field],layout[field],kind+': '+field);
  assert.deepEqual(spec.referenceSlots,layout.referenceAnimalPlacements);
  assert.equal(spec.referenceSlots.length,kind==='chicken'?6:5);
  assert.deepEqual(spec.footprint.logicalTiles,[4,4]);
  assert.ok(Object.isFrozen(spec));assert.ok(Object.isFrozen(spec.referenceSlots[0].at));
 }
});
test('55 transparent full-canvas derivatives preserve registration, source hashes and hit masks',()=>{
 assert.equal(shelterRuntimeInventory().length,55);
 for(const art of Object.values(SHELTER_ASSET_METADATA)){
  const data=readFileSync(new URL('../'+art.path,import.meta.url));
  assert.deepEqual([...data.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(data.readUInt32BE(16),art.width);assert.equal(data.readUInt32BE(20),art.height);
  assert.equal(data[25],6,'RGBA output, not opaque RGB');
  assert.deepEqual(art.bounds,[0,0,art.width,art.height]);
  assert.deepEqual([art.width,art.height],art.key.startsWith('layers/')?[600,500]:[360,280]);
  const [x0,y0,x1,y1]=art.paintedBounds;assert.ok(x0>=0&&y0>=0&&x1<=art.width&&y1<=art.height&&x1>x0&&y1>y0);
  const n=art.mask.size;assert.equal(art.mask.rows.length,n);assert.ok(art.mask.rows.every(row=>new RegExp(`^[0-9a-f]{${n/4}}$`).test(row)));
  assert.equal(sha(readFileSync(new URL('../'+art.source,import.meta.url))),art.sourceSha256);
 }
});
test('each facility uses separate ground, building, foreground fence and shadow rather than old shelter composites',()=>{
 for(const kind of kinds){
  const spec=resolveShelterSpec({kind:'shelter',configId:kind});
  assert.deepEqual(Object.keys(spec.layers),['ground','buildingShadow','rearFence','building','frontFence']);
  for(const key of Object.keys(spec.layers)){
   const art=resolveShelterLayer(kind,key);assert.equal(art,spec.layers[key]);assert.equal(art.aspect,1.2);assert.ok(art.fullCanvas);
   const html=renderRuntimeArt(art);assert.ok(html.includes('viewBox="0 0 600 500"'));assert.ok(html.includes(art.path));
   assert.equal(runtimeArtHit(art,0,0),false,'transparent margin must not block hit');
  }
  assert.notEqual(spec.layers.frontFence.src,spec.layers.rearFence.src);
 }
});
test('all fifteen animal states use common canvas and true grounded anchors; shadows are independent',()=>{
 for(const kind of kinds){
  const spec=resolveShelterSpec(kind),anchor=spec.animalCanvas.anchor.map((n,i)=>n/[spec.animalCanvas.width,spec.animalCanvas.height][i]);
  for(const status of states){
   const entity={kind:'animal',configId:kind,status},original=structuredClone(entity),art=resolveShelterAnimal(entity),shadow=resolveShelterAnimalShadow(entity);
   assert.equal(art,resolveShelterAnimalArt(kind,status));assert.equal(shadow,resolveShelterAnimalArt(kind,status,{shadow:true}));
   assert.deepEqual(art.anchor,anchor);assert.deepEqual(shadow.anchor,anchor);assert.equal(art.aspect,360/280);
   assert.notEqual(art.src,shadow.src);assert.deepEqual(art.bounds,shadow.bounds);assert.ok(art.key.endsWith(status));
   assert.deepEqual(entity,original);assert.ok(Object.isFrozen(art));
  }
  assert.equal(resolveShelterAnimalArt(kind,'unknown'),resolveShelterAnimalArt(kind,'hungry'));
 }
});
test('alpha-aware layered fence hits and reflected animals use the actual full-canvas silhouette',()=>{
 for(const kind of kinds)for(const art of [resolveShelterLayer(kind,'frontFence'),resolveShelterAnimalArt(kind,'ready')]){
  let hit=0,empty=0;const n=art.mask.size;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const u=(x+.5)/n,v=(y+.5)/n,expected=!!(BigInt('0x'+art.mask.rows[y])&(1n<<BigInt(x)));
   assert.equal(runtimeArtHit(art,u,v),expected);
   assert.equal(runtimeArtHit(art,1-u,v,{mirror:true}),expected);
   expected?hit++:empty++;
  }
  assert.ok(hit>10);assert.ok(empty>hit,'transparent full canvas stays click-through');
 }
});
test('unsupported kinds and earned skins preserve legacy fallback without modifying saved data',()=>{
 assert.equal(resolveShelterSpec('unavailable'),null);
 assert.equal(resolveShelterLayer('unavailable','building'),null);
 assert.equal(resolveShelterAnimalArt('unavailable','ready'),null);
 assert.equal(resolveShelterLayer('chicken','unavailable'),null);
 const entity={kind:'shelter',configId:'cow',skinId:'floral'},original=structuredClone(entity);
 assert.equal(resolveShelterSpec(entity),null);assert.equal(resolveShelterLayer(entity,'building'),null);assert.deepEqual(entity,original);
});

test('production allowlist includes every layered PNG and its presentation modules, never art-source previews',async()=>{
 const {spawnSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const root=fileURLToPath(new URL('../',import.meta.url));
 const result=spawnSync('python3',['-c',"import json,sys;from pathlib import Path;sys.path.insert(0,sys.argv[1]+'/deploy');from runtime_files import expected_runtime;print(json.dumps(expected_runtime(Path(sys.argv[1]))))",root],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const files=JSON.parse(result.stdout);
 for(const name of ['farm-runtime-shelters.mjs','farm-runtime-shelters-metadata.mjs','farm-shelter-geometry.mjs','assets/farm-runtime/shelters-v2/manifest.json'])assert.ok(files[name],name);
 for(const art of Object.values(SHELTER_ASSET_METADATA))assert.equal(files[art.path],'image/png',art.path);
 assert.ok(!Object.keys(files).some(path=>path.startsWith('docs/')));
});
