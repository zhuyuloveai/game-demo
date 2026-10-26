import {groundRect,depth,project} from './farm-world-geometry.mjs';
import {mirroredArt} from './farm-art-direction.mjs';

/** Art size, ground support and logical collision are three independent values.
 * All state variants attach their annotated root/feet to the same ground point. */
export function anchoredArtRect(entity,footprint,art){
 const g=groundRect(entity,footprint),width=art.visualWidth*(art.scale||1),height=width/art.aspect;
 const mirror=mirroredArt(entity),anchor=art.anchor||[.5,1],ground=art.groundPoint||[.5,.5];
 const foot={x:g.left+g.width*ground[0],y:g.top+g.height*ground[1]};
 return {left:foot.x-width*(mirror?1-anchor[0]:anchor[0]),top:foot.y-height*anchor[1],width,height,bottom:foot.y,foot,depth:depth(entity,footprint)};
}
export function environmentRect(entity,footprint,art){
 const p=project(entity.x+footprint.w/2,entity.y+footprint.h/2);
 const width=({natural_tree:76,natural_bush:42,rock:42})[entity.configId]||48,height=width*art.height/art.width;
 return {left:p.x-width*art.anchor[0]/art.width,top:p.y-height*art.anchor[1]/art.height,width,height,bottom:p.y,depth:depth(entity,footprint)};
}
/** Each collapsed tray exposes one real job, with a count for remaining jobs.
 * The full swipe-to-collect list remains in the selected machine's panel. */
export function compactTrayPlacement(rect,art,zoom=1,mirror=false){
 const a=art?.outputAnchor||[.7,.82],size=44;
 return {x:rect.left+rect.width*(mirror?1-a[0]:a[0])-size/2,y:rect.top+rect.height*a[1]-size/2,width:size,height:size,slots:1};
}
export function worldBadge(entity,now,{selected=false,editing=false,harvestView=false}={}){
 if(editing)return {mode:'none'};
 if(entity.kind==='field'){
  if(!entity.crop)return {mode:'none'};
  if(entity.crop.readyAt<=now)return {mode:'dot',label:'成熟，可收获',text:'✓'};
  return {mode:selected?'label':'none'};
 }
 if(entity.kind==='fruit'){
  if(entity.status==='ready')return {mode:'dot',label:'果实成熟，可收获',text:'✓'};
  if(['revive','withered'].includes(entity.status))return {mode:'dot',label:entity.status==='revive'?'待复苏':'待清理',text:'!'};
  return {mode:selected?'label':'none'};
 }
 if(entity.kind==='machine')return {mode:entity.built?(selected?'label':'none'):'label'};
 if(['barn','silo'].includes(entity.kind))return {mode:selected?'label':'none'};
 return {mode:'none'};
}
