import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CROPS,FRUITS,ANIMALS,BUILDINGS,DECORATIONS} from '../farm-config.mjs';
import {resolveWorldArt,renderRuntimeArt,runtimeArtHit,runtimeArtInventory,RUNTIME_ART_METADATA} from '../farm-runtime-art.mjs';
test('all formal crop/fruit/machine/animal/decor base kinds have PNGs, not only preview subset',()=>{
 assert.equal(Object.keys(CROPS).length,11);assert.equal(Object.keys(FRUITS).length,5);
 for(const itemId of Object.keys(CROPS))assert.ok(resolveWorldArt({kind:'field',crop:{itemId,readyAt:10}},10),itemId);
 for(const configId of Object.keys(FRUITS))assert.ok(resolveWorldArt({kind:'fruit',configId,status:'ready'}),configId);
 for(const configId of Object.keys(BUILDINGS))assert.ok(resolveWorldArt({kind:'machine',configId}),configId);
 for(const configId of Object.keys(ANIMALS)){assert.ok(resolveWorldArt({kind:'shelter',configId}));for(const status of ['hungry','producing','ready'])assert.ok(resolveWorldArt({kind:'animal',configId,status}));}
 for(const configId of Object.keys(DECORATIONS))assert.ok(resolveWorldArt({kind:'decoration',configId}),configId);
});
test('all new plant state artwork maps timings, regrowth, revival and terminal states',()=>{
 for(const itemId of Object.keys(CROPS)){
  const e={kind:'field',crop:{itemId,plantedAt:100,readyAt:200}};
  assert.ok(resolveWorldArt(e,100).key.endsWith('-sprout'));
  assert.ok(resolveWorldArt(e,150).key.endsWith('-grown'));
  assert.ok(resolveWorldArt(e,199).key.endsWith('-grown'));
  assert.equal(resolveWorldArt(e,200).key,'crops/'+itemId.replaceAll('_','-'));
  assert.ok(resolveWorldArt(e,100).scale<resolveWorldArt(e,200).scale);
 }
 for(const configId of Object.keys(FRUITS)){
  const duration=FRUITS[configId].durationMs,e={kind:'fruit',configId,harvestStage:0,status:'growing',readyAt:duration};
  assert.ok(resolveWorldArt(e,0).key.endsWith('-young'));
  assert.ok(resolveWorldArt(e,duration/2).key.endsWith('-growing'));
  assert.ok(resolveWorldArt({...e,harvestStage:1},0).key.endsWith('-growing'));
  assert.ok(resolveWorldArt({...e,status:'revive'},0).key.endsWith('-wilt_help'));
  assert.ok(resolveWorldArt({...e,status:'withered'},0).key.endsWith('-wilt_final'));
 }
});
test('earned skins, absent plants and unsupported world kinds deliberately retain SVG fallback',()=>{
 assert.equal(resolveWorldArt({kind:'field'}),null);
 assert.equal(resolveWorldArt({kind:'shelter',configId:'cow',skinId:'floral'}),null);
 for(const kind of ['obstacle','road'])assert.equal(resolveWorldArt({kind,configId:'natural_tree'}),null);
 assert.equal(resolveWorldArt({kind:'decoration',configId:'badge_fieldHarvests_1'}),null);
});
test('all 115 transparent derivative PNGs and source digests are valid',()=>{
 assert.equal(runtimeArtInventory().length,115);
 for(const art of Object.values(RUNTIME_ART_METADATA)){
  const data=readFileSync(new URL('../'+art.path,import.meta.url));assert.deepEqual([...data.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(data.readUInt32BE(16),art.width);assert.equal(data.readUInt32BE(20),art.height);assert.ok(Math.max(art.width,art.height)<=512);
  const [x0,y0,x1,y1]=art.bounds;assert.ok(x0>=0&&y0>=0&&x1<=art.width&&y1<=art.height&&x1>x0&&y1>y0);
  assert.equal(art.mask.rows.length,64);assert.ok(art.mask.rows.every(row=>/^[0-9a-f]{16}$/.test(row)));
  const original=readFileSync(new URL('../'+art.source,import.meta.url));assert.equal(createHash('sha256').update(original).digest('hex'),art.sourceSha256);
 }
});
test('cropped alpha hit rejects outside/transparent pixels and accepts only sampled silhouette',()=>{
 const art=resolveWorldArt({kind:'house'});let transparent=0,solid=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){const hit=runtimeArtHit(art,(x+.5)/64,(y+.5)/64);const bit=!!(BigInt('0x'+art.mask.rows[y])&(1n<<BigInt(x)));assert.equal(hit,bit);hit?solid++:transparent++;}
 assert.ok(transparent>100);assert.ok(solid>100);for(const [x,y] of [[-1,0],[0,-1],[1,0],[0,1],[NaN,.5]])assert.equal(runtimeArtHit(art,x,y),false);
});
test('cropped viewport preserves aspect and escapes attributes without mutating entity',()=>{
 const e={kind:'machine',configId:'bakery',built:false,queue:[{id:'job'}]},copy=structuredClone(e),art=resolveWorldArt(e);
 const html=renderRuntimeArt(art,{className:'"test',alt:'<hello>'});assert.ok(html.includes('preserveAspectRatio="xMidYMax meet"'));assert.ok(html.includes('&lt;hello&gt;'));assert.deepEqual(e,copy);
 assert.equal(art.animation,'static');assert.equal(resolveWorldArt(e),art);
});

test('new plant manifest scale and complete 42-state inventory are preserved',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/art-packs/sumikko-farm-v1/plant-states/manifest.json',import.meta.url)));
 const generated=manifest.assets.filter(a=>a.status!=='existing');assert.equal(generated.length,42);
 for(const entry of generated){const art=RUNTIME_ART_METADATA['plant-states/'+entry.group+'/'+entry.key];assert.ok(art);assert.equal(art.scale,entry.displayScale);assert.deepEqual(art.anchor,[.5,1]);}
});

test('all five animal families use stable anchored state poses with unknown states falling back',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/art-packs/sumikko-farm-v1/animal-states/manifest.json',import.meta.url)));
 for(const configId of Object.keys(ANIMALS)){
  const entity={kind:'animal',configId,status:'hungry'},copy=structuredClone(entity),base=resolveWorldArt(entity);
  assert.equal(base.key,'animals/'+configId);
  for(const status of ['producing','ready']){
   const art=resolveWorldArt({...entity,status}),entry=manifest.assets.find(a=>a.key===configId+'-'+status);
   assert.equal(art.key,'animal-states/'+configId+'-'+status);assert.deepEqual(art.anchor,base.anchor);assert.equal(art.scale,entry.displayScale);
   assert.notEqual(art.sourceSha256,base.sourceSha256);assert.equal(art.animation,'static');
  }
  assert.equal(resolveWorldArt({...entity,status:'walking'}),base);assert.deepEqual(entity,copy);
 }
});
