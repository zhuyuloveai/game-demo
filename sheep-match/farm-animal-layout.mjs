import {resolveShelterSpec} from './farm-runtime-shelters.mjs';
import {shelterCanvasRect,shelterCanvasPoint,shelterLayerDepths} from './farm-shelter-geometry.mjs';
import {groundRect,overlaps} from './farm-world-geometry.mjs';
/** Presentation only. A full pen keeps its logical footprint and economy capacity. */
export const ANIMAL_WIDTHS=Object.freeze({chicken:28,cow:38,pig:35,sheep:33,lamb:30});
export function animalPlacement(shelter,footprint,index,art){
 const spec=resolveShelterSpec(shelter);
 if(spec&&art?.shelterLayered){
  const canvas=shelterCanvasRect(shelter,footprint),slot=spec.referenceAnimalPlacements[index]||spec.referenceAnimalPlacements[0];
  const foot=shelterCanvasPoint(shelter,footprint,slot.at),anchor=art.anchor;
  const breathingRoom=({chicken:.92,sheep:.95})[shelter.configId]||1;
  const width=spec.animalCanvas.width*canvas.scale*breathingRoom,height=spec.animalCanvas.height*canvas.scale*breathingRoom;
  return {left:foot.x-width*(shelter.rotation===270?1-anchor[0]:anchor[0]),top:foot.y-height*anchor[1],width,height,foot,depth:Math.round(foot.y/12*10)+2,mirror:shelter.rotation===270};
 }
 const g=groundRect(shelter,footprint),row=Math.floor(index/3),column=index%3;
 const capacity=shelter.configId==='chicken'?6:5;
 const offset=row?(capacity===6?[-.19,0,.19][column]:[-.125,.125][column]):[-.23,0,.23][column];
 const foot={x:(g.left+g.right)/2+g.width*offset,y:g.top+g.height*(row?.77:.48)};
 const width=(art?.visualWidth||ANIMAL_WIDTHS[shelter.configId]||36)*(art?.scale||1),height=width/(art?.aspect||1.1),anchor=art?.anchor||[.5,1];
 return {left:foot.x-width*anchor[0],top:foot.y-height*anchor[1],width,height,foot,depth:Math.round(foot.y/12*10)+2};
}
export function shelterBackdropDepth(e,f){const layers=shelterLayerDepths(e,f);if(layers)return layers.building;return Math.round((e.x+e.y+(f.w+f.h)*.22)*10);}
export function animalBadgeRect(r){return {left:r.left+r.width-8,top:r.top+r.height-17,width:18,height:18};}
export function rectContains(r,p){return p.x>=r.left&&p.x<=r.left+r.width&&p.y>=r.top&&p.y<=r.top+r.height;}

/** A selected pen cuts away only painted foreground objects intersecting its animals. */
export function animalOccluderIds(targets,candidates){
 const bounds=r=>({...r,right:r.left+r.width,bottom:r.top+r.height});
 const paintedOverlap=(c,t)=>{if(c.depth<=t.depth||!overlaps(bounds(c),bounds(t)))return false;if(!c.hitAt&&!t.hitAt)return true;
  const left=Math.max(c.left,t.left),right=Math.min(c.left+c.width,t.left+t.width),top=Math.max(c.top,t.top),bottom=Math.min(c.top+c.height,t.top+t.height);
  for(let y=top+.5;y<bottom;y+=2)for(let x=left+.5;x<right;x+=2){const p={x,y};if((!c.hitAt||c.hitAt(p))&&(!t.hitAt||t.hitAt(p)))return true;}return false;};
 return new Set(candidates.filter(c=>targets.some(t=>paintedOverlap(c,t))).map(c=>c.entityId));
}
