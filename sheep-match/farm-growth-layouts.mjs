/** Authored growth blueprint. Coordinates are logical ground cells, never screen pixels.
 * No ownership, money, unlock or save-schema mutation happens in this module.
 * Existing farms opt in through a normal layout draft; merely loading is a no-op.
 */
import {validateLayout,positionOf,isFixedEntity,isGround,isPassable,isCellOpen,entityCells,operationDoor,needsDoor,FARM_MAP} from './farm-layout.mjs';

export const GROWTH_STAGES=Object.freeze([
  {id:1,name:'一小片家园',description:'已有小屋、仓库、六块田与鸡舍'},
  {id:2,name:'农场初成',description:'实际购入第一座工坊或增加田地'},
  {id:3,name:'生产成簇',description:'拥有五座工坊或三种动物栏舍'},
  {id:4,name:'果牧丰盛',description:'拥有果园并扩展生产，或拥有九座工坊'},
  {id:5,name:'繁荣农庄',description:'拥有十二座工坊，或四十八块田与五种果树'}
].map(Object.freeze));
const MACHINE_SLOTS=Object.freeze({
  bakery:[34,18],feed_mill_1:[38,18],feed_mill_2:[44,18],dairy:[42,18],
  sugar_mill:[34,22],popcorn_pot:[38,22],bbq_grill:[42,22],
  pie_oven:[36,26],loom:[40,26],sewing_machine:[44,26],
  cake_oven:[36,30],juice_press:[40,30],ice_cream_maker:[44,30]
});
const SPECIES=['chicken','cow','pig','sheep','lamb'];
// Rear/left animal quarter; machines stay behind/right of the operational crop area.
const SHELTER_SLOTS=[[22,28],[18,23],[23,30],[18,29],[23,35],[18,39],[23,40],[36,35],[41,35],[36,41],[42,42],[18,17]];
const FRUIT_SPECIES=['apple','raspberry','cherry','blackberry','blueberries'];
const point=p=>({x:p[0],y:p[1]});
const sameGroup=(a,b)=>a.kind===b.kind&&(a.kind==='field'||a.configId===b.configId);
const order=(a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true});
const indexOf=(state,e)=>state.entities.filter(o=>o.id!==e.id&&sameGroup(o,e)).length;
export function farmGrowthStage(state){
  const owned=state.entities.filter(e=>!e.stored),machines=owned.filter(e=>e.kind==='machine'),fields=owned.filter(e=>e.kind==='field').length;
  const animals=new Set(owned.filter(e=>e.kind==='shelter').map(e=>e.configId)).size;
  const fruits=new Set(owned.filter(e=>e.kind==='fruit').map(e=>e.configId)).size;
  const n=machines.length>=12||(fields>=48&&fruits===5)?5:
    machines.length>=9||(fruits>0&&animals>=3)?4:machines.length>=5||animals>=3?3:machines.length>0||fields>6?2:1;
  return {...GROWTH_STAGES[n-1],counts:{fields,machines:machines.length,animalKinds:animals,fruitKinds:fruits}};
}
/** Stable slots expand in six-field beds with a one-cell service aisle. */
export function preferredGrowthPosition(state,e){
  const n=indexOf(state,e);
  if(e.kind==='house')return {x:20,y:20};
  if(e.kind==='barn')return {x:24,y:20};
  if(e.kind==='silo')return {x:28,y:20};
  if(e.kind==='field')return {x:28+(Math.floor(n/6)%2)*4+n%3,y:28+Math.floor(n/12)*3+Math.floor((n%6)/3)};
  if(e.kind==='machine'&&MACHINE_SLOTS[e.configId])return point(MACHINE_SLOTS[e.configId]);
  if(e.kind==='shelter')return point(SHELTER_SLOTS[(SPECIES.indexOf(e.configId)+Math.max(0,e.tier??n)*5)%SHELTER_SLOTS.length]);
  if(e.kind==='fruit')return {x:36+(FRUIT_SPECIES.indexOf(e.configId)%3)*3,y:35+Math.floor(FRUIT_SPECIES.indexOf(e.configId)/3)*3+n*3};
  if(e.kind==='decoration'&&/windmill/.test(e.configId))return {x:18,y:18};
  return {x:25,y:26};
}
/** Only the proposed/new entity moves. Owned neighbours and custom layouts never do. */
export function suggestGrowthPlacement(state,e,{originalEntity=state.entities.find(o=>o.id===e.id)}={}){
  if(isFixedEntity(e))return {x:e.x,y:e.y};
  const preferred=preferredGrowthPosition(state,e),candidate={...e,...preferred,rotation:e.rotation||0};
  const other=state.entities.filter(o=>o.id!==e.id);
  const ground=new Set(other.filter(o=>!o.stored&&isGround(o)).flatMap(entityCells).map(p=>`${p.x},${p.y}`));
  // Keep a deliberately underlaid road under its original building, but never cover
  // a visible custom path with a newly moved/new solid footprint.
  const alreadyUnder=new Set(originalEntity?entityCells(originalEntity).map(p=>`${p.x},${p.y}`):[]);
  const legal=p=>{
    const placed={...candidate,...p};
    if(!isPassable(placed)&&entityCells(placed).some(c=>ground.has(`${c.x},${c.y}`)&&!alreadyUnder.has(`${c.x},${c.y}`)))return false;
    return validateLayout({...state,entities:[...other,placed]}).ok;
  };
  if(legal(preferred))return preferred;
  const candidates=[];for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(isCellOpen(state,x,y))candidates.push({x,y});
  candidates.sort((a,b)=>Math.abs(a.x-preferred.x)+Math.abs(a.y-preferred.y)-Math.abs(b.x-preferred.x)-Math.abs(b.y-preferred.y)||a.y-b.y||a.x-b.x);
  return candidates.find(legal)||null;
}
/** Pure full-map adoption preview, suitable for the existing cancel/undo/apply workflow.
 * Failure returns the original full positions, never a partially rearranged farm.
 */
export function previewGrowthLayout(state){
  const original=state.entities.map(positionOf),fixed=state.entities.filter(e=>isFixedEntity(e)||e.stored||isGround(e));
  const rank=e=>({barn:0,silo:1,field:2,shelter:3,machine:4,fruit:5,road:7,decoration:8}[e.kind]??6);
  const movable=state.entities.filter(e=>!isFixedEntity(e)&&!e.stored&&!isGround(e)).sort((a,b)=>rank(a)-rank(b)||
    (a.kind==='shelter'?(a.tier||0)-(b.tier||0)||SPECIES.indexOf(a.configId)-SPECIES.indexOf(b.configId):a.kind==='machine'?Object.keys(MACHINE_SLOTS).indexOf(a.configId)-Object.keys(MACHINE_SLOTS).indexOf(b.configId):0)||order(a,b));
  const planning={...state,entities:fixed.map(e=>({...e}))};
  for(const entity of movable){
    const next={...entity,rotation:0},p=suggestGrowthPlacement(planning,next,{originalEntity:entity});
    if(!p)return {ok:false,positions:original,stage:farmGrowthStage(state),changed:0,errors:[{code:'NO_BLUEPRINT_SPACE',message:'已开放土地不足以容纳完整方案；请保留现状或先整理/开垦'}]};
    planning.entities.push({...next,...p});
  }
  const byId=new Map(planning.entities.map(e=>[e.id,e])),positions=state.entities.map(e=>positionOf(byId.get(e.id))),check=validateLayout(state,positions);
  const paths=check.ok?planGrowthRoads(planning):{ok:false,proposedRoads:[],errors:check.errors};
  const ok=check.ok&&paths.ok,displayed=ok?positions:original,proposedRoads=ok?paths.proposedRoads:[];
  return {ok,positions:displayed,proposedRoads,signature:JSON.stringify([displayed,proposedRoads]),stage:farmGrowthStage(state),changed:ok?positions.filter((p,i)=>JSON.stringify(p)!==JSON.stringify(original[i])).length:0,errors:paths.errors};
}


// A bounded shortest-path tree, not a decorative carpet. Existing roads are never moved.
export const MAX_GROWTH_ROAD_ADDITIONS=256;
const cellKey=({x,y})=>`${x},${y}`;
const parseCell=k=>{const [x,y]=k.split(',').map(Number);return {x,y};};
const neighbors=({x,y})=>[{x,y:y-1},{x:x-1,y},{x:x+1,y},{x,y:y+1}];
export function planGrowthRoads(state,{reserveGrowthBeds=true}={}){
  const blocked=new Set(),ground=new Set(),existingRoads=new Set();
  for(const e of state.entities.filter(e=>!e.stored))for(const p of entityCells(e)){
    const key=cellKey(p);
    if(!isPassable(e))blocked.add(key);
    if(isGround(e))ground.add(key);
    if(e.kind==='road')existingRoads.add(key);
  }
  // Keep the next six-field beds free of newly drawn trunk roads. Existing custom
  // roads/doors take precedence; unusual custom layouts can fall back to open cells.
  if(reserveGrowthBeds){
    const doors=new Set(state.entities.filter(e=>!e.stored&&needsDoor(e)).map(e=>cellKey(operationDoor(e))));
    for(let n=0;n<48;n++){const p={x:28+(Math.floor(n/6)%2)*4+n%3,y:28+Math.floor(n/12)*3+Math.floor((n%6)/3)},k=cellKey(p);if(!ground.has(k)&&!doors.has(k))blocked.add(k);}
  }
  const free=p=>isCellOpen(state,p.x,p.y)&&!blocked.has(cellKey(p));
  const bad=message=>reserveGrowthBeds?planGrowthRoads(state,{reserveGrowthBeds:false}):({ok:false,proposedRoads:[],errors:[{code:'GROWTH_PATH_BLOCKED',message}]});
  const root=FARM_MAP.houseDoor;if(!free(root))return bad('小屋门口被挡住，无法预览连接小路');
  const network=new Set(),added=new Map();
  function join(points){
    const pending=points.slice();
    for(let i=0;i<pending.length;i++){
      const p=pending[i],k=cellKey(p);if(network.has(k))continue;network.add(k);
      if(!ground.has(k))added.set(k,p);
      // Reuse only road components actually connected to this path.
      for(const n of neighbors(p))if(free(n)&&existingRoads.has(cellKey(n))&&!network.has(cellKey(n)))pending.push(n);
    }
  }
  join([root]);
  const targets=[[FARM_MAP.exit]];
  const facilities=state.entities.filter(e=>!e.stored&&needsDoor(e)&&e.kind!=='house').sort((a,b)=>{
    const p=operationDoor(a),q=operationDoor(b);return Math.abs(p.x-root.x)+Math.abs(p.y-root.y)-Math.abs(q.x-root.x)-Math.abs(q.y-root.y)||a.id.localeCompare(b.id);
  });
  for(const e of facilities)targets.push([operationDoor(e)]);
  // One access branch per connected field bed, not one road around each tile.
  const fields=new Set(state.entities.filter(e=>e.kind==='field'&&!e.stored).flatMap(entityCells).map(cellKey));
  while(fields.size){
    const first=fields.values().next().value,queue=[parseCell(first)],boundary=new Map();fields.delete(first);
    for(let i=0;i<queue.length;i++)for(const n of neighbors(queue[i])){
      const k=cellKey(n);if(fields.delete(k))queue.push(n);else if(free(n))boundary.set(k,n);
    }
    targets.push([...boundary.values()].sort((a,b)=>a.y-b.y||a.x-b.x));
  }
  if(targets.length>96)return bad('当前布局需要的小路分支过多，请先合并田区');
  for(const choices of targets){
    const queue=choices.filter(free),parent=new Map(queue.map(p=>[cellKey(p),null]));let end=null;
    for(let i=0;i<queue.length;i++){
      const p=queue[i],k=cellKey(p);if(network.has(k)){end=k;break;}
      for(const n of neighbors(p)){const nk=cellKey(n);if(free(n)&&!parent.has(nk)){parent.set(nk,k);queue.push(n);}}
    }
    if(end===null)return bad('有设施或田区无法连接，未生成任何小路');
    const path=[];for(let k=end;k!==null;k=parent.get(k))path.push(parseCell(k));join(path);
    if(added.size>MAX_GROWTH_ROAD_ADDITIONS)return bad('连接小路超过256格上限，请先整理布局');
  }
  const proposedRoads=[...added.values()].sort((a,b)=>a.y-b.y||a.x-b.x);
  if(state.entities.filter(e=>e.kind==='road').length+proposedRoads.length>4096)return bad('道路总量超过4096格上限');
  return {ok:true,proposedRoads,errors:[]};
}
/** Stable IDs do not consume nextId; moved/stored old road IDs get a safe suffix. */
export function growthRoadEntities(state,proposedRoads){
  const ids=new Set(state.entities.flatMap(e=>[e.id,...(e.animals||[]).map(a=>a.id),...(e.queue||[]).map(j=>j.id),...(e.completed||[]).map(j=>j.id)]));
  return proposedRoads.map(({x,y})=>{
    const base=`growth_road_${x}_${y}`;let id=base,n=2;while(ids.has(id))id=`${base}_${n++}`;ids.add(id);
    return {id,kind:'road',configId:'road',x,y,w:1,h:1,rotation:0,footprintLayer:'ground',walkable:true,stored:false};
  });
}
