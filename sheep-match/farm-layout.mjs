/** Pure orthographic world/layout rules. No economics or wall-clock state lives here. */
export const FARM_MAP = Object.freeze({width:64,height:64,tileSize:48,initialBounds:[16,16,48,48],exit:{x:32,y:47},houseDoor:{x:22,y:24}});
export const ROTATIONS = Object.freeze([0,90,180,270]);
const clone = value => structuredClone(value);
const coord = (x,y) => `${x},${y}`;
const isInt = Number.isSafeInteger;
const error = (code,message,entity,extra={}) => ({code,message,...(entity?{id:entity.id,x:entity.x,y:entity.y}:{}),...extra});

// Same stable distance/y/x numbering as the versioned project configuration.
export const LAND_PATCHES = Object.freeze(Array.from({length:64},(_,i)=>({x:(i%8)*8,y:Math.floor(i/8)*8,w:8,h:8})) .filter(p=>!(p.x>=16&&p.x<48&&p.y>=16&&p.y<48)) .sort((a,b)=>patchDistance(a)-patchDistance(b)||a.y-b.y||a.x-b.x) .map((p,i)=>Object.freeze({
        ...p,
        id:`land_${String(i+1).padStart(2,'0')}`,
        level:22,
        land_deed:2+2*Math.floor(i/4),
        mallet:2+2*Math.floor(i/4),
        marker_stake:2+2*Math.floor(i/4)
      })));
function patchDistance(p){
  return Math.max(16-p.x,0,p.x-40)/8+Math.max(16-p.y,0,p.y-40)/8;
}
const patchMap = new Map(LAND_PATCHES.map(p=>[p.id,p]));
export function isCellOpen(state,x,y){
  if(!isInt(x)||!isInt(y)||x<0||y<0||x>=64||y>=64)return false;
  if(x>=16&&x<48&&y>=16&&y<48)return true;
  return (state.openedLand??[]).some(id=>{
      const p=patchMap.get(id);
      return p&&x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h;
    });
}
export function canExpandLand(state,patchId){
  const patch=patchMap.get(patchId);
  if(!patch)return {ok:false,error:'UNKNOWN_LAND',message:'不存在的土地包'};
  if((state.openedLand??[]).includes(patchId))return {ok:false,error:'ALREADY_OWNED',message:'这块土地已开放'};
  if((state.level??1)<22)return {ok:false,error:'LEVEL_LOCKED',message:'22级开放扩地'};
  let adjacent=false;
  for(
    let n=0
    ;n<8;n++)if(isCellOpen(state,patch.x-1,patch.y+n)||isCellOpen(state,patch.x+8,patch.y+n)||isCellOpen(state,patch.x+n,patch.y-1)||isCellOpen(state,patch.x+n,patch.y+8))adjacent=true;
  return adjacent?{ok:true,patch}:{ok:false,error:'NOT_ADJACENT',message:'只能开垦与已有土地共边的地块'};
}
export function getFootprint(entity){
  const rotated=(entity.rotation??0)%180!==0;
  return {w:rotated?entity.h:entity.w,h:rotated?entity.w:entity.h};
}
export function entityCells(entity){
  if(entity.stored)return [];
  const {w,h}=getFootprint(entity),cells=[];
  for(
    let y=entity.y
    ;y<entity.y+h;y++)for(
    let x=entity.x
    ;x<entity.x+w;x++)cells.push({x,y});
  return cells;
}
export function isGround(entity){
  return entity.footprintLayer==='ground'||entity.kind==='road'||entity.kind==='ground';
}
export function isPassable(entity){
  return isGround(entity)||entity.passable===true||entity.walkable===true;
}
export function canStoreEntity(entity){
  return entity.kind==='decoration'||isGround(entity);
}
export function isFixedEntity(entity){
  return entity.fixed===true||entity.kind==='house'||entity.kind==='obstacle';
}
export function needsDoor(entity){
  return ['house','barn','silo','shelter','machine'].includes(entity.kind);
}
export function operationDoor(entity){
  if(entity.kind==='house')return {...FARM_MAP.houseDoor};

  // Door offsets are defined outside the canonical footprint, rotated together.
  const w=entity.w,h=entity.h;
  const p=entity.doorOffset??{x:Math.floor(w/2),y:h};
  let x=p.x,y=p.y;
  switch(entity.rotation??0){
    case 90:
    [x,y]=[h-1-p.y,p.x];
    break;
    case 180:
    [x,y]=[w-1-p.x,h-1-p.y];
    break;
    case 270:
    [x,y]=[p.y,w-1-p.x];
    break;
  }
  return {x:entity.x+x,y:entity.y+y};
}
export function positionOf(entity){
  return {id:entity.id,x:entity.x,y:entity.y,rotation:entity.rotation??0,stored:!!entity.stored};
}
export function beginLayout(state){
  return {positions:state.entities.map(positionOf),baseRevision:state.revision??0,layoutRevision:state.layoutRevision??0};
}
function positionsOf(value){
  return Array.isArray(value)?value:value?.positions;
}

/** Full maps only: an old layout must not silently omit a newly purchased object. */
export function validateLayout(state,draft=state.entities){
  const errors=[],positions=positionsOf(draft),entities=state?.entities;
  if(!Array.isArray(entities)||!Array.isArray(positions))return {ok:false,errors:[error('INVALID_LAYOUT','布局格式无效')]};
  const ids=new Set(),source=new Map();
  for(const entity of entities){
    if(!entity||typeof entity.id!=='string'||ids.has(entity.id)){
      errors.push(error('DUPLICATE_ENTITY','实体标识重复或无效',entity));
      continue;
    }
    ids.add(entity.id);
    source.set(entity.id,entity);
  }
  const seen=new Set(),placed=[];
  for(const p of positions){
    if(!p||typeof p.id!=='string'){
      errors.push(error('INVALID_POSITION','布局位置无效'));
      continue;
    }
    if(seen.has(p.id)){
      errors.push(error('DUPLICATE_ENTITY','布局不能复制同一实体',p));
      continue;
    }
    seen.add(p.id);
    const original=source.get(p.id);
    if(!original){
      errors.push(error('UNKNOWN_ENTITY','方案包含当前不存在的物件',p));
      continue;
    }
    const e={...original,x:p.x,y:p.y,rotation:p.rotation??0,stored:!!p.stored};
    if(!ROTATIONS.includes(e.rotation)||(!canStoreEntity(e)&&e.stored)||!isInt(e.x)||!isInt(e.y)||!isInt(e.w)||!isInt(e.h)||e.w<1||e.h<1||e.w>64||e.h>64){
      errors.push(error('INVALID_POSITION','物件位置、旋转或收起状态无效',e));
      continue;
    }
    if((e.kind==='field'||isGround(e))&&e.rotation!==0){
      errors.push(error('ROTATION_FORBIDDEN','田格与地面不能旋转',e));
      continue;
    }
    if(isFixedEntity(e)&&(e.x!==original.x||e.y!==original.y||e.rotation!==(original.rotation??0)||e.stored)){
      errors.push(error('FIXED_ENTITY','固定房屋与自然障碍不能移动或收起',e));
      continue;
    }
    if(e.kind==='house'&&(e.x!==20||e.y!==20||e.w!==4||e.h!==4||e.rotation!==0)){
      errors.push(error('FIXED_ENTITY','房屋必须保留在初始位置',e));
      continue;
    }
    if(!e.stored)placed.push(e);
  }
  for(const e of entities)if(!seen.has(e.id))errors.push(error('MISSING_ENTITY',canStoreEntity(e)?'方案缺少装饰，请明确摆放或收起':'方案缺少生产设施，必须逐项安置',e));
  const owned=new Set();
  if(!Array.isArray(state.openedLand??[]))errors.push(error('INVALID_LAND','土地记录无效')); else for(const id of state.openedLand??[]){
    if(!patchMap.has(id)||owned.has(id))errors.push(error('INVALID_LAND','土地标识重复或未知',null,{patchId:id}));
    owned.add(id);
  }

  // Imported ownership must also be reachable by the same shared-edge rule.
  const remaining=new Set(owned),connected={openedLand:[]};
  let progressed=true;
  while(remaining.size&&progressed){
    progressed=false;
    for(const id of remaining){
      const p=patchMap.get(id);
      if(!p)continue;
      for(
        let n=0
        ;n<8;n++)if(isCellOpen(connected,p.x-1,p.y+n)||isCellOpen(connected,p.x+8,p.y+n)||isCellOpen(connected,p.x+n,p.y-1)||isCellOpen(connected,p.x+n,p.y+8)){
        connected.openedLand.push(id);
        remaining.delete(id);
        progressed=true;
        break;
      }
    }
  }
  for(const id of remaining)errors.push(error('DISCONNECTED_LAND','已开放地块必须与农场共边连通',null,{patchId:id}));
  if(errors.length)return {ok:false,errors};
  const collision=new Map(),ground=new Map(),blocked=new Set();
  for(const e of placed){
    const layer=isGround(e)?ground:collision;
    for(const p of entityCells(e)){
      const key=coord(p.x,p.y);
      if(!isCellOpen(state,p.x,p.y)){
        errors.push(error('UNOPENED_LAND','物件超出已开放土地',e,p));
        break;
      }
      const other=layer.get(key);
      if(other){
        errors.push(error('COLLISION','物件底座重叠',e,{...p,otherId:other}));
        break;
      }
      layer.set(key,e.id);
      if(!isPassable(e))blocked.add(key);
    }
  }
  const exit=FARM_MAP.exit;
  if(blocked.has(coord(exit.x,exit.y)))errors.push(error('EXIT_BLOCKED','固定农场入口不能被堵住',null,exit));
  if(errors.length)return {ok:false,errors};
  const reachable=new Set([coord(exit.x,exit.y)]),queue=[exit];
  for(
    let i=0
    ;i<queue.length;i++){
    const p=queue[i];
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=p.x+dx,y=p.y+dy,key=coord(x,y);
      if(isCellOpen(state,x,y)&&!blocked.has(key)&&!reachable.has(key)){
        reachable.add(key);
        queue.push({x,y});
      }
    }
  }
  for(const e of placed.filter(needsDoor)){
    const door=operationDoor(e);
    if(!reachable.has(coord(door.x,door.y)))errors.push(error('DOOR_BLOCKED','建筑门口无法通往农场入口',e,{door}));
  }
  return {ok:errors.length===0,errors};
}
export function applyLayout(state,draft){
  const result=validateLayout(state,draft);
  if(!result.ok)return {...result,state};
  const positions=new Map(positionsOf(draft).map(p=>[p.id,p]));
  const next=clone(state);
  next.entities=next.entities.map(e=>{
      const p=positions.get(e.id);
      return {...e,x:p.x,y:p.y,rotation:p.rotation??0,stored:!!p.stored};
    });
  next.layoutRevision=(state.layoutRevision??0)+1;
  return {ok:true,state:next,delta:{layout:true},errors:[]};
}
export function findFreePlacement(state,entity,{around={x:28,y:30}}={}){
  const candidates=[];
  for(
    let y=0
    ;y<64;y++)for(
    let x=0
    ;x<64;x++)if(isCellOpen(state,x,y))candidates.push({x,y});
  candidates.sort((a,b)=>Math.abs(a.x-around.x)+Math.abs(a.y-around.y)-Math.abs(b.x-around.x)-Math.abs(b.y-around.y)||a.y-b.y||a.x-b.x);
  for(const p of candidates){
    const e={...entity,...p,rotation:entity.rotation??0};
    const test={...state,entities:[...state.entities.filter(o=>o.id!==e.id),e]};
    if(validateLayout(test).ok)return p;
  }
  return null;
}

/** Supercover traversal includes every crossed tile; shared edges include both cells. */
export function cellsAlongLine(from,to){
  const result=[],seen=new Set();
  const add=(x,y)=>{
    const k=coord(x,y);
    if(!seen.has(k)){
      seen.add(k);
      result.push({x,y});
    }
  };
  let x=Math.floor(from.x),y=Math.floor(from.y),endX=Math.floor(to.x),endY=Math.floor(to.y);
  add(x,y);
  const dx=to.x-from.x,dy=to.y-from.y,sx=Math.sign(dx),sy=Math.sign(dy);
  const tx=dx===0?Infinity:Math.abs(1/dx),ty=dy===0?Infinity:Math.abs(1/dy);
  let mx=dx===0?Infinity:(sx>0?x+1-from.x:from.x-x)/Math.abs(dx);
  let my=dy===0?Infinity:(sy>0?y+1-from.y:from.y-y)/Math.abs(dy);
  for(
    let count=0
    ;(x!==endX||y!==endY)&&count<8192;count++){
    if(Math.abs(mx-my)<1e-10){
      add(x+sx,y);
      add(x,y+sy);
      x+=sx;
      y+=sy;
      mx+=tx;
      my+=ty;
    } else if(mx<my){
      x+=sx;
      mx+=tx;
    }else{
      y+=sy;
      my+=ty;
    }
    add(x,y);
  }
  return result;
}
