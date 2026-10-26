/** Approved v2 shelter layers. Presentation-only; saved entities are untouched. */
import {SHELTER_ASSET_METADATA,SHELTER_SPATIAL_METADATA} from './farm-runtime-shelters-metadata.mjs';
export {SHELTER_ASSET_METADATA,SHELTER_SPATIAL_METADATA};
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const descriptors=new Map(),specs=new Map();
function descriptor(key){
 const data=SHELTER_ASSET_METADATA[key];if(!data)return null;
 if(!descriptors.has(key))descriptors.set(key,freeze({...data,src:new URL(data.path,import.meta.url).href,aspect:data.width/data.height,animation:'static',fullCanvas:true,shelterLayered:true}));
 return descriptors.get(key);
}
const kindOf=value=>typeof value==='string'?value:value?.skinId?null:value?.configId;
/** Layout coordinates are in the original art canvas, not derivative pixels. */
export function resolveShelterSpec(entityOrKind){
 const kind=kindOf(entityOrKind),data=SHELTER_SPATIAL_METADATA[kind];if(!data)return null;
 if(!specs.has(kind))specs.set(kind,freeze({...data,layers:Object.fromEntries(Object.entries(data.layerKeys).map(([name,key])=>[name,descriptor(key)]))}));
 return specs.get(kind);
}
export function resolveShelterLayer(entityOrKind,layerKey){return resolveShelterSpec(entityOrKind)?.layers[layerKey]||null;}
export function resolveShelterAnimalArt(entityOrKind,state,{shadow=false}={}){
 const spec=resolveShelterSpec(entityOrKind);if(!spec)return null;
 const status=state??(typeof entityOrKind==='object'?entityOrKind.status:null);
 return descriptor(spec.animalKeys[['hungry','producing','ready'].includes(status)?status:'hungry'][shadow?'shadow':'body']);
}
export function resolveShelterAnimal(entity){return resolveShelterAnimalArt(entity,entity?.status);}
export function resolveShelterAnimalShadow(entity){return resolveShelterAnimalArt(entity,entity?.status,{shadow:true});}
export function shelterRuntimeInventory(){return Object.keys(SHELTER_ASSET_METADATA).sort();}
