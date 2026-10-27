/** Approved one-shot sprite atlas metadata; all offsets include the 2px gutters. */
import {LAND_PATCHES} from './farm-layout.mjs';
export const WORKSHOP_EFFECTS=Object.freeze(Object.fromEntries(['clear-dust','wood-chips','stone-chips','land-open'].map(id=>[id,Object.freeze({id,src:new URL(`./assets/farm/effects-workshop/${id}.png`,import.meta.url).href,width:128,height:96,anchor:[64,76],atlasWidth:528,atlasHeight:200,frames:8,fps:id==='land-open'?16:12,duration:id==='land-open'?500:1000*8/12})])));
export function workshopEffectFrame(id,elapsed){const fx=WORKSHOP_EFFECTS[id];if(!fx||elapsed<0||elapsed>=fx.duration)return null;const frame=Math.min(7,Math.floor(elapsed*fx.fps/1000));return {frame,x:2+frame%4*132,y:2+Math.floor(frame/4)*100};}
/** Authoritative before/after comparison prevents canceled, failed, duplicate or
 * skipped commands from displaying success. Points are logical ground anchors. */
export function committedTerrainEffects(before,command,result){
 if(!result?.ok||!result.state)return [];
 const after=result.state;
 if(command.type==='expandLand'){
  const id=command.patchId||command.landId,p=LAND_PATCHES.find(p=>p.id===id);
  return p&&!(before.openedLand||[]).includes(id)&&(after.openedLand||[]).includes(id)?[{id:'land-open',x:p.x+p.w/2,y:p.y+p.h/2,entityId:id}]:[];
 }
 if(command.type!=='clearObstacle')return [];
 const ids=new Set(command.entityIds||[command.entityId]),remaining=new Set(after.entities.map(e=>e.id));
 return before.entities.filter(e=>e.kind==='obstacle'&&ids.has(e.id)&&!remaining.has(e.id)).flatMap(e=>[{id:'clear-dust',x:e.x+.5,y:e.y+.5,entityId:e.id},{id:e.configId==='rock'?'stone-chips':'wood-chips',x:e.x+.5,y:e.y+.5,entityId:e.id}]);
}
