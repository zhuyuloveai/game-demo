/** Approved v2 shelter layers. Presentation-only; saved entities are untouched. */
import {SHELTER_ASSET_METADATA,SHELTER_SPATIAL_METADATA} from './farm-runtime-shelters-metadata.mjs';
import {FLORAL_SHELTER_ASSET_METADATA,FLORAL_SHELTER_SKINS} from './assets/farm-runtime/floral-skins-v1/metadata.mjs';
import {renderRuntimeArt} from './farm-runtime-art.mjs';
export {SHELTER_ASSET_METADATA,SHELTER_SPATIAL_METADATA};
export {FLORAL_SHELTER_ASSET_METADATA,FLORAL_SHELTER_SKINS};
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const descriptors=new Map(),specs=new Map();
function descriptor(key){
 const data=SHELTER_ASSET_METADATA[key]||FLORAL_SHELTER_ASSET_METADATA[key];if(!data)return null;
 if(!descriptors.has(key))descriptors.set(key,freeze({...data,src:new URL(data.path,import.meta.url).href,aspect:data.width/data.height,animation:'static',fullCanvas:true,shelterLayered:true}));
 return descriptors.get(key);
}
const kindOf=value=>typeof value==='string'?value:value?.configId;
// A flower cluster may protrude beyond the original rail. Painting and hits
// share the union silhouette, but the base and flower PNGs remain independent.
function decoratedLayer(base,flower){
 const a=base.paintedBounds,b=flower.paintedBounds,n=base.mask.size;
 return freeze({...base,key:base.key+':'+flower.key,flowerLayer:flower,
  paintedBounds:[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])],
  mask:{size:n,rows:base.mask.rows.map((row,i)=>(BigInt('0x'+row)|BigInt('0x'+flower.mask.rows[i])).toString(16).padStart(n/4,'0'))}});
}
/** Layout coordinates are in the original art canvas, not derivative pixels. */
export function resolveShelterSpec(entityOrKind){
 const kind=kindOf(entityOrKind),data=SHELTER_SPATIAL_METADATA[kind];if(!data)return null;
 const skinId=typeof entityOrKind==='object'?entityOrKind?.skinId:null,skin=skinId&&FLORAL_SHELTER_SKINS[skinId];
 if(skinId&&(!skin||skin.species!==kind))return null;
 const cacheKey=skin?kind+':'+skinId:kind;
 if(!specs.has(cacheKey))specs.set(cacheKey,freeze({...data,...(skin?{skinId,skinSource:skin.source,skinSourceSha256:skin.sourceSha256}:{}),layers:Object.fromEntries(Object.entries(data.layerKeys).map(([name,key])=>{
  const base=descriptor(key),flower=skin&&descriptor(skin.flowerKeys[name]);
  return [name,flower?decoratedLayer(base,flower):base];
 }))}));
 return specs.get(cacheKey);
}
export function resolveShelterLayer(entityOrKind,layerKey){return resolveShelterSpec(entityOrKind)?.layers[layerKey]||null;}
/** Ordered base + optional floral overlay, at one shared full-canvas transform. */
export function renderShelterLayer(entityOrKind,layerKey,options={}){
 const art=resolveShelterLayer(entityOrKind,layerKey);if(!art)return '';
 return renderRuntimeArt(art,options)+(art.flowerLayer?renderRuntimeArt(art.flowerLayer,{...options,alt:''}):'');
}
export function resolveShelterAnimalArt(entityOrKind,state,{shadow=false}={}){
 const spec=resolveShelterSpec(entityOrKind);if(!spec)return null;
 const status=state??(typeof entityOrKind==='object'?entityOrKind.status:null);
 return descriptor(spec.animalKeys[['hungry','producing','ready'].includes(status)?status:'hungry'][shadow?'shadow':'body']);
}
export function resolveShelterAnimal(entity){return resolveShelterAnimalArt(entity,entity?.status);}
export function resolveShelterAnimalShadow(entity){return resolveShelterAnimalArt(entity,entity?.status,{shadow:true});}
export function shelterRuntimeInventory(){return [...Object.keys(SHELTER_ASSET_METADATA),...Object.keys(FLORAL_SHELTER_ASSET_METADATA)].sort();}
