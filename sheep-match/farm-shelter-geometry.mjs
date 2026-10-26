import {groundRect,depth,pointInPolygon,footprintPolygon} from './farm-world-geometry.mjs';
import {resolveShelterSpec,resolveShelterLayer} from './farm-runtime-shelters.mjs';
import {runtimeArtHit} from './farm-runtime-art.mjs';

/** One similarity transform for every authored layer, contact and exclusion.
 * Logical footprint/rotation and saved economy data are never changed. */
export function shelterCanvasRect(entity,footprint){
 const spec=resolveShelterSpec(entity);if(!spec)return null;
 const g=groundRect(entity,footprint),xs=spec.footprint.polygon.map(p=>p[0]),scale=g.width/(Math.max(...xs)-Math.min(...xs));
 const [ax,ay]=spec.canvas.commonAnchor,cx=(g.left+g.right)/2,cy=(g.top+g.bottom)/2;
 return {left:cx-ax*scale,top:cy-ay*scale,width:spec.canvas.width*scale,height:spec.canvas.height*scale,scale,depth:depth(entity,footprint),foot:{x:cx,y:cy}};
}
export function shelterCanvasPoint(entity,footprint,point){
 const r=shelterCanvasRect(entity,footprint),spec=resolveShelterSpec(entity);if(!r)return null;
 return {x:r.left+(entity.rotation===270?spec.canvas.width-point[0]:point[0])*r.scale,y:r.top+point[1]*r.scale};
}
export function shelterLayerDepths(entity,footprint){
 const spec=resolveShelterSpec(entity);if(!spec)return null;
 const r=shelterCanvasRect(entity,footprint),y=p=>Math.round((r.top+p*r.scale)/12*10);
 return {ground:1,buildingShadow:2,rearFence:y(Math.min(...spec.footprint.polygon.map(p=>p[1])))-1,building:y(Math.max(...spec.buildingSupport.map(p=>p[1]))),frontFence:depth(entity,footprint)+1};
}
export function shelterLayerHit(entity,footprint,key,point){
 const r=shelterCanvasRect(entity,footprint),art=resolveShelterLayer(entity,key);return !!r&&runtimeArtHit(art,(point.x-r.left)/r.width,(point.y-r.top)/r.height,{mirror:entity.rotation===270});
}
export function shelterSummary(entity){
 const ready=entity.animals.filter(a=>a.status==='ready').length,hungry=entity.animals.filter(a=>a.status==='hungry').length;
 return ready?{state:'ready',count:ready,label:`${ready}只待收`}:hungry?{state:'hungry',count:hungry,label:`${hungry}只待喂`}:null;
}

/** Hit candidates use the exact same per-layer depths as the painter. */
export function shelterHitCandidates(entity,footprint,point){
 const layers=shelterLayerDepths(entity,footprint);if(!layers)return [];
 const hits=pointInPolygon(point,footprintPolygon(entity,footprint))?[{entityId:entity.id,layer:'ground',z:layers.ground}]:[];
 for(const key of ['rearFence','building','frontFence'])if(shelterLayerHit(entity,footprint,key,point))hits.push({entityId:entity.id,layer:key,z:layers[key]});
 return hits;
}
