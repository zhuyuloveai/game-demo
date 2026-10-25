/** Pure gesture transaction helpers shared by the interactive map and regression tests. */
import {ITEMS,FRUITS,ANIMALS} from './farm-config.mjs';

/** Exact grid traversal, including both cells on a corner, for fast pointer segments. */
export function traceFarmSegment(from,to){
  const cells=[],seen=new Set();
  const add=(x,y)=>{
    const k=`${x},${y}`;
    if(!seen.has(k)){
      cells.push({x,y});
      seen.add(k);
    }
  };
  let x=Math.floor(from.x),y=Math.floor(from.y);
  const endX=Math.floor(to.x),endY=Math.floor(to.y),dx=to.x-from.x,dy=to.y-from.y,sx=Math.sign(dx),sy=Math.sign(dy);
  const tx=dx?Math.abs(1/dx):Infinity,ty=dy?Math.abs(1/dy):Infinity;
  let maxX=dx?(sx>0?x+1-from.x:from.x-x)/Math.abs(dx):Infinity,maxY=dy?(sy>0?y+1-from.y:from.y-y)/Math.abs(dy):Infinity;
  add(x,y);
  for(
    let n=0
    ;n<8192&&(x!==endX||y!==endY);n++){
    if(Math.abs(maxX-maxY)<1e-10){
      add(x+sx,y);
      add(x,y+sy);
      x+=sx;
      y+=sy;
      maxX+=tx;
      maxY+=ty;
    }else if(maxX<maxY){
      x+=sx;
      maxX+=tx;
    }else{
      y+=sy;
      maxY+=ty;
    }
    add(x,y);
  }
  return cells;
}
export function createFarmStroke(mode,itemId,point){
  if(!['plant','harvest','feed'].includes(mode))return null;
  return {mode,itemId,ids:[],seen:new Set(),last:point,active:true,cancelReason:null};
}
export function extendFarmStroke(stroke,point,resolveCell){
  if(!stroke?.active)return stroke;
  for(const cell of traceFarmSegment(stroke.last||point,point)){
    const id=resolveCell(cell);
    if(id&&!stroke.seen.has(id)){
      stroke.seen.add(id);
      stroke.ids.push(id);
    }
  }
  stroke.last=point;
  return stroke;
}
export function cancelFarmStroke(stroke,reason='cancelled'){
  if(!stroke)return;
  stroke.active=false;
  stroke.cancelReason=reason;
  stroke.ids=[];
  stroke.seen.clear();
}
export function finishFarmStroke(stroke){
  if(!stroke?.active)return null;
  stroke.active=false;
  if(!stroke.ids.length)return null;
  return {
    type:stroke.mode==='plant'?'plant':stroke.mode==='feed'?'feed':'harvest',
    entityIds:[...stroke.ids],
    ...(stroke.mode==='plant'?{itemId:stroke.itemId}:{})
  };
}
export function previewFarmStroke(state,stroke){
  if(!stroke?.active)return [];
  let seeds=state.inventory[stroke.itemId]||0;
  const used=Object.entries(state.inventory).reduce((n,[id,q])=>n+(ITEMS[id]?.storage==='silo'?q:0),0);
  let space=state.storage.silo.capacity-used;
  const feed={...state.inventory};
  return stroke.ids.map(id=>{
      const e=state.entities.find(e=>e.id===id);
      let valid=false,reason='状态不符',quantity=0;
      if(!e)return {id,valid,reason:'目标已不存在',quantity};
      if(stroke.mode==='plant'&&!e.crop){
        valid=seeds>0;
        reason=valid?'可播种':'种子不足';
        if(valid){
          seeds--;
          quantity=1;
        }
      }
      if(stroke.mode==='harvest'){
        if(e.kind==='field'&&e.crop?.readyAt<=state.now)quantity=e.crop.yieldCount;
        if(e.kind==='fruit'&&e.status==='ready')quantity=FRUITS[e.configId].sequence[e.harvestStage];
        if(quantity){
          valid=space>=quantity;
          reason=valid?'可收获':'粮仓空间不足';
          if(valid)space-=quantity;
        }
      }
      if(stroke.mode==='feed'&&e.kind==='shelter'){
        const a=ANIMALS[e.configId],hungry=e.animals.filter(a=>a.status==='hungry').length;
        quantity=Math.min(hungry,feed[a.feedItem]||0);
        valid=quantity>0;
        feed[a.feedItem]=(feed[a.feedItem]||0)-quantity;
        reason=valid?`可喂${quantity}只`:'饲料不足或无需喂养';
      }
      return {id,valid,reason,quantity};
    });
}

/** Invert the actual rendered world box, including zoom and ancestor scrolling. */
export function farmPointFromWorldRect(clientX,clientY,rect,width=64,height=64) {
  if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||rect.width<=0||rect.height<=0) {
    throw new RangeError('牧场地图尚未显示，不能投影指针');
  }
  return {x:(clientX-rect.left)*width/rect.width,y:(clientY-rect.top)*height/rect.height};
}

/** Fold native hidden-container scrolling into the single camera model. */
export function farmCameraAfterScroll(camera,scrollLeft=0,scrollTop=0) {
  return {x:camera.x-scrollLeft,y:camera.y-scrollTop};
}

/** A graphical recipe/product tool commits only on an explicit drop on its owner.
 * No gesture state or economy is mutated here; cancellation always wins. */
export function finishFarmToolDrop(tool,targetEntityId,{dragged=false,cancelled=false,inside=true}={}) {
  const command=tool?.command;
  if(cancelled||!inside||!dragged||!command||typeof command.entityId!=='string'||!command.entityId||targetEntityId!==command.entityId)return null;
  if(!['enqueue','collectAnimal','collectMachine'].includes(command.type))return null;
  return {...command};
}

/** A short tool tap must end on the same visible control, never outside the map. */
export function isFarmToolTap(start,end,toolRect,viewportRect) {
  const inRect=(p,r)=>r&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;
  return !!(start&&end&&Math.hypot(end.x-start.x,end.y-start.y)<8&&inRect(end,toolRect)&&inRect(end,viewportRect));
}

/** Clip the initial path to the outside of its tool tray; covered land is not drawn. */
export function farmToolExitPoint(start,end,rect) {
  if(!start||!end||!rect||![start.x,start.y,end.x,end.y,rect.left,rect.right,rect.top,rect.bottom].every(Number.isFinite))return null;
  const inside=p=>p.x>=rect.left&&p.x<=rect.right&&p.y>=rect.top&&p.y<=rect.bottom;
  if(inside(end))return null;
  if(!inside(start))return {...start};
  const dx=end.x-start.x,dy=end.y-start.y,candidates=[];
  if(dx)candidates.push(((dx>0?rect.right:rect.left)-start.x)/dx);
  if(dy)candidates.push(((dy>0?rect.bottom:rect.top)-start.y)/dy);
  const t=Math.min(...candidates.filter(t=>t>=0&&t<=1));
  if(!Number.isFinite(t))return null;
  const outside=Math.min(1,t+0.01/Math.max(1,Math.hypot(dx,dy)));
  return {x:start.x+dx*outside,y:start.y+dy*outside};
}
