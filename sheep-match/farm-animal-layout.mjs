import {groundRect,overlaps} from './farm-world-geometry.mjs';
/** Presentation only. A full pen keeps its logical footprint and economy capacity. */
export const ANIMAL_WIDTHS=Object.freeze({chicken:30,cow:42,pig:38,sheep:36,lamb:32});
export function animalPlacement(shelter,footprint,index,art){
 const g=groundRect(shelter,footprint),row=Math.floor(index/3),column=index%3;
 const capacity=shelter.configId==='chicken'?6:5;
 const offset=row?(capacity===6?[-.19,0,.19][column]:[-.125,.125][column]):[-.23,0,.23][column];
 const foot={x:(g.left+g.right)/2+g.width*offset,y:g.top+g.height*(row?.76:.42)};
 const width=(ANIMAL_WIDTHS[shelter.configId]||36)*(art?.scale||1),height=width/(art?.aspect||1.1);
 return {left:foot.x-width/2,top:foot.y-height,width,height,foot,depth:Math.round(foot.y/12*10)+2};
}
export function shelterBackdropDepth(e,f){return Math.round((e.x+e.y+(f.w+f.h)*.22)*10);}
export function animalBadgeRect(r){return {left:r.left+r.width-8,top:r.top+r.height-17,width:18,height:18};}
export function rectContains(r,p){return p.x>=r.left&&p.x<=r.left+r.width&&p.y>=r.top&&p.y<=r.top+r.height;}

/** A selected pen cuts away only painted foreground objects intersecting its animals. */
export function animalOccluderIds(targets,candidates){
 const bounds=r=>({...r,right:r.left+r.width,bottom:r.top+r.height});
 return new Set(candidates.filter(c=>targets.some(t=>c.depth>t.depth&&overlaps(bounds(c),bounds(t)))).map(c=>c.entityId));
}
