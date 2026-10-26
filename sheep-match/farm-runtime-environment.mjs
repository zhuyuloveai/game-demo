/** Approved 2:1 components. Pixel anchors are source ground points, never saved data. */
import {ENVIRONMENT_ART_METADATA} from './farm-runtime-environment-metadata.mjs';
import {BUILDINGS,ITEMS} from './farm-config.mjs';
export {ENVIRONMENT_ART_METADATA};
const resolved=new Map();
function descriptor(key){
 const data=ENVIRONMENT_ART_METADATA[key];if(!data)return null;
 if(!resolved.has(key))resolved.set(key,Object.freeze({...data,key,src:new URL(data.path,import.meta.url).href}));
 return resolved.get(key);
}
export function resolveEnvironmentArt(id){return descriptor('environment/'+id);}
export function resolveBuildingStateArt(id){return descriptor('building-states/'+id);}
export function resolveObstacleArt(entity){return entity?.kind==='obstacle'?resolveEnvironmentArt(({natural_tree:'natural-tree',natural_bush:'natural-bush',rock:'rocks-0'})[entity.configId]):null;}
/** Routes only known old component paths. Unknown assets retain their original adapter. */
export function resolveEnvironmentLegacyArt(path){
 const data=Object.values(ENVIRONMENT_ART_METADATA).find(entry=>entry.legacyPath===path);
 return data?descriptor((data.group?'environment/':'building-states/')+data.id):null;
}
export function resolveMachineMasteryArt(entity,state){
 if(entity?.kind!=='machine'||!entity.built)return null;
 const config=Object.values(BUILDINGS).find(b=>b.machineType===entity.machineType);
 const stars=config?config.masteryCumulativeHours.filter(h=>(state?.mastery?.[entity.machineType]||0)>=h*3600000).length:0;
 return resolveBuildingStateArt('mastery-'+Math.min(3,stars));
}
/** Status priority is actionable construction/completion, then processing; capacity uses real item storage. */
export function resolveBuildingBadge(entity,state={now:0}){
 if(entity?.kind==='machine'){
  if(!entity.built)return resolveBuildingStateArt(entity.buildReadyAt<=state.now?'complete':'constructing');
  if(entity.completed?.length)return resolveBuildingStateArt('complete');
  if(entity.queue?.length)return resolveBuildingStateArt('processing');
 }
 if(['barn','silo'].includes(entity?.kind)){
  const capacity=state.storage?.[entity.kind]?.capacity;
  const used=Object.entries(state.inventory||{}).reduce((n,[id,q])=>n+(ITEMS[id]?.storage===entity.kind?q:0),0);
  if(Number.isFinite(capacity)&&used>=capacity)return resolveBuildingStateArt('full');
 }
 return null;
}
