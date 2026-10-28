import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {completionIconPaths,farmAssetPathUrl,farmAssetUrl} from '../farm-assets.mjs';
import {priorityIconPaths} from '../farm-priority-icons.mjs';
import {ITEMS,ANIMALS,COSMETICS} from '../farm-config.mjs';
import {resolveShelterSpec,resolveShelterLayer,resolveShelterAnimal,renderShelterLayer,FLORAL_SHELTER_ASSET_METADATA} from '../farm-runtime-shelters.mjs';
import {penLayers} from '../farm-pen-art.mjs';
import {shelterCanvasRect,shelterLayerDepths,shelterLayerHit,shelterCanvasPoint} from '../farm-shelter-geometry.mjs';
import {animalPlacement} from '../farm-animal-layout.mjs';
import {runtimeArtHit} from '../farm-runtime-art.mjs';
import {createAnimalAnimationController} from '../farm-animal-animation.mjs';
const root=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(new URL('assets/farm/completion-icons-v1/manifest.json',root)));
const skins=[['chicken','skin_coop'],['sheep','skin_sheep']];
const read=path=>readFileSync(new URL(path,root));

test('all 93 approved completion SVGs map legacy IDs, remain independent and preserve source bytes',()=>{
 assert.equal(manifest.icons.length,93);assert.equal(Object.keys(completionIconPaths()).length,93);
 const counts={};
 for(const icon of manifest.icons){
  counts[icon.category]=(counts[icon.category]||0)+1;
  const bytes=read('assets/farm/completion-icons-v1/'+icon.svg),legacy=icon.originalPath.replace('sheep-match/assets/farm/','');
  assert.equal(sha(bytes),icon.sha256,icon.id);assert.deepEqual(bytes,read(manifest.sourcePack+'/'+icon.svg));
  assert.match(bytes.toString(),/viewBox="0 0 128 128"/);assert.doesNotMatch(bytes.toString(),/<image|<script|<foreignObject/);
  assert.ok(existsSync(new URL('assets/farm/'+legacy,root)));assert.equal(completionIconPaths()[legacy],icon.svg);
  assert.equal(farmAssetPathUrl(legacy),new URL('assets/farm/completion-icons-v1/'+icon.svg,root).href);
  if(icon.category==='achievements'){assert.deepEqual(icon.anchor,[64,112]);assert.deepEqual(icon.uiAnchor,[64,64]);}
 }
 assert.deepEqual(counts,{processed:38,materials:15,currency:6,achievements:30,branch:4});
});

test('26 prior item icons plus 38 processing icons cover all 64 economic products; materials/rewards do not become new recipes',()=>{
 const original=Object.keys(priorityIconPaths()).filter(p=>p.startsWith('items/'));
 assert.equal(original.length,26);
 const materialIds=new Set(manifest.icons.filter(i=>i.category==='materials').map(i=>i.id));
 const economic=Object.values(ITEMS).filter(i=>!materialIds.has(i.id));
 assert.equal(economic.length,64);
 for(const {id} of economic)assert.match(farmAssetUrl(id),/\/(priority-icons-v1\/items|completion-icons-v1\/icons\/processed)\//,id);
 for(const icon of manifest.icons.filter(i=>i.category==='materials'))assert.match(farmAssetUrl(icon.id),/completion-icons-v1\/icons\/materials\//);
 for(const icon of manifest.icons.filter(i=>i.category==='currency'))assert.match(farmAssetUrl(icon.id),/completion-icons-v1\/icons\/currency\//);
});

test('only six new small RGBA flower layers are added; approved v2 base and all animal state files are reused',()=>{
 const entries=Object.values(FLORAL_SHELTER_ASSET_METADATA);assert.equal(entries.length,6);let bytes=0;
 for(const art of entries){const png=read(art.path);bytes+=png.length;
  assert.equal(png.readUInt32BE(16),600);assert.equal(png.readUInt32BE(20),500);assert.equal(png[25],6);
  assert.deepEqual(art.anchor,[.5,.59]);assert.deepEqual(art.bounds,[0,0,600,500]);assert.equal(sha(read(art.source)),art.sourceSha256);
  assert.equal(art.mask.size,128);assert.equal(art.mask.rows.length,128);assert.equal(runtimeArtHit(art,0,0),false);
 }
 assert.ok(bytes<100000,`flower layers total ${bytes} bytes`);
 for(const [kind,skinId] of skins){
  const base=resolveShelterSpec(kind),spec=resolveShelterSpec({configId:kind,skinId});
  assert.equal(sha(read(spec.skinSource)),spec.skinSourceSha256);
  for(const field of ['canvas','footprint','buildingSupport','standingRegion','standingExclusions','entry','occlusion','animalCanvas','referenceAnimalPlacements','animalKeys'])assert.deepEqual(spec[field],base[field]);
  assert.equal(spec.referenceSlots.length,ANIMALS[kind].capacity);assert.deepEqual(spec.footprint.logicalTiles,[4,4]);assert.equal(COSMETICS[skinId].target,kind);
  for(const layer of Object.keys(base.layers)){
   assert.equal(spec.layers[layer].src,base.layers[layer].src,`${skinId} reuses ${layer}`);
   assert.equal(!!spec.layers[layer].flowerLayer,['rearFence','building','frontFence'].includes(layer));
  }
 }
 assert.equal(resolveShelterSpec({configId:'cow',skinId:'skin_coop'}),null);
 assert.equal(resolveShelterSpec({configId:'chicken',skinId:'unknown'}),null);
});

for(const [configId,skinId] of skins)for(const rotation of [0,270])test(`${skinId}/${rotation}: one ground/shadow, correct layered paint order, unchanged full-capacity feet and alpha occlusion`,()=>{
 const e={id:'pen',kind:'shelter',configId,skinId,rotation,x:20,y:20,w:4,h:4},base={...e,skinId:undefined},before=JSON.stringify(e),spec=resolveShelterSpec(e),r=shelterCanvasRect(e,e),d=shelterLayerDepths(e,e),pen=penLayers(e,e);
 assert.deepEqual(r,shelterCanvasRect(base,base));assert.deepEqual(d,shelterLayerDepths(base,base));
 const building=renderShelterLayer(e,'building'),html=pen.ground+pen.rear+building+pen.front;
 assert.equal((html.match(/<image /g)||[]).length,8);assert.doesNotMatch(html,/_Floral\.svg|preview\.png/);
 assert.equal(html.split(spec.layers.ground.src).length-1,1);assert.equal(html.split(spec.layers.buildingShadow.src).length-1,1);
 for(const layer of ['rearFence','building','frontFence']){
  const art=spec.layers[layer],chunk=layer==='building'?building:pen[layer==='rearFence'?'rear':'front'];
  assert.ok(chunk.indexOf(art.src)<chunk.indexOf(art.flowerLayer.src));
  for(let y=0;y<128;y++)assert.equal(BigInt('0x'+art.mask.rows[y]),BigInt('0x'+resolveShelterLayer(base,layer).mask.rows[y])|BigInt('0x'+art.flowerLayer.mask.rows[y]));
 }
 for(const status of ['hungry','producing','ready']){
  const art=resolveShelterAnimal({configId,status});
  for(let i=0;i<ANIMALS[configId].capacity;i++){
   const a=animalPlacement(e,e,i,art);assert.deepEqual(a,animalPlacement(base,base,i,art));assert.deepEqual(a.foot,shelterCanvasPoint(e,e,spec.referenceSlots[i].at));
   assert.ok(a.depth>d.building&&a.depth<d.frontFence);
   let exposed=0;for(let y=.1;y<.9;y+=.04)for(let x=.1;x<.9;x+=.04){const p={x:a.left+x*a.width,y:a.top+y*a.height};if(runtimeArtHit(art,x,y,{mirror:rotation===270})&&!shelterLayerHit(e,e,'frontFence',p))exposed++;}
   assert.ok(exposed>20,`${status} slot ${i} remains visible and interactive`);
  }
 }
 assert.equal(JSON.stringify(e),before);
});

test('skin picker uses new empty thumbnails, while production contains only runtime icons/layers and no source pack',()=>{
 for(const [kind] of skins)assert.match(farmAssetPathUrl(`buildings/${kind==='chicken'?'Chicken':'Sheep'}_Shelter_Floral.svg`),new RegExp(`/floral-skins-v1/${kind}/preview\\.png$`));
 const result=spawnSync('python3',['-c',"import json,sys;from pathlib import Path;sys.path.insert(0,sys.argv[1]+'/deploy');from runtime_files import expected_runtime;print(json.dumps(expected_runtime(Path(sys.argv[1]))))",fileURLToPath(root)],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);const files=JSON.parse(result.stdout);
 for(const icon of manifest.icons)assert.equal(files['assets/farm/completion-icons-v1/'+icon.svg],'image/svg+xml');
 for(const a of Object.values(FLORAL_SHELTER_ASSET_METADATA))assert.equal(files[a.path],'image/png');
 assert.ok(files['assets/farm-runtime/floral-skins-v1/metadata.mjs']);
 assert.ok(!Object.keys(files).some(p=>p.startsWith('docs/')||p.includes('editable.')||p.includes('/previews/')));
});

// A panel can supply valid animal art even for an unknown skin. Eligibility must
// validate the shelter skin, not merely trust that animal fallback descriptor.
test('registered floral skins retain existing animal animation; arbitrary or mismatched skins stay static',()=>{
 for(const [species,skinId,allowed] of [['chicken','skin_coop',true],['sheep','skin_sheep',true],['chicken','skin_sheep',false],['cow','skin_coop',false],['chicken','unknown',false]]){
  const animal={id:'a',configId:species,status:'producing'},shelter={configId:species,skinId},image={href:'',getAttribute(){return this.href;},setAttribute(_,v){this.href=v;}},bounds={left:0,top:0,right:360,bottom:280,width:360,height:280};
  const node={dataset:{animal:'a',shelter:'s'},querySelector:()=>image,getBoundingClientRect:()=>bounds},root={querySelectorAll:()=>[node],closest:()=>null,getBoundingClientRect:()=>bounds};
  let pending=null;const c=createAnimalAnimationController({root,getAnimal:()=>({animal,shelter}),getStaticArt:resolveShelterAnimal,Image:null,matchMedia:()=>({matches:false}),requestFrame:f=>(pending=f,1),cancelFrame:()=>pending=null});
  c.sync();c.playEat(['a']);pending?.(0);assert.equal(!!c.getArt('a',null),allowed,`${species}/${skinId}`);
  if(allowed){assert.equal(c.getArt('a').frame,0);assert.deepEqual(c.getArt('a').anchor,resolveShelterAnimal(animal).anchor);}
  else assert.equal(image.href,resolveShelterAnimal(animal).src);c.destroy();
 }
});
