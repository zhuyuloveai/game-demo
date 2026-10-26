/** Runtime adapter for the approved terrain kit at docs/art-packs/sumikko-farm-v1/terrain.
 * These assets already use 2:1 projection: never apply a second skew/rotation.
 * Saved logical positions, ownership and economy are not changed here.
 */
export const TERRAIN_DIRECTIONS=Object.freeze([{dx:0,dy:-1,bit:1},{dx:1,dy:0,bit:2},{dx:0,dy:1,bit:4},{dx:-1,dy:0,bit:8}]);
export const isWoodFence=e=>e?.kind==='decoration'&&e.configId==='wood_fence';
export const isFlowerFence=e=>e?.kind==='decoration'&&e.configId==='flower_fence';
export const isConnectedFence=e=>isWoodFence(e)||isFlowerFence(e);
export function terrainConnectionMask(entity,entities,kind=entity.kind==='road'?'road':'fence'){
 const occupied=new Set(entities.filter(e=>!e.stored&&(kind==='road'?e.kind==='road':kind==='flower-fence'?isFlowerFence(e):isWoodFence(e))).map(e=>`${e.x},${e.y}`));
 return TERRAIN_DIRECTIONS.reduce((mask,d)=>mask|(occupied.has(`${entity.x+d.dx},${entity.y+d.dy}`)?d.bit:0),0);
}
export function fieldTerrainState(entity,state){return (state.fertilizerUntil||0)>state.now?'fertilized':entity.crop?'sown':'empty';}
export function resolveTerrainArt(entity,entities=[],state={now:0}){
 let path,width,height,anchor,mask;
 if(entity.kind==='road'){mask=terrainConnectionMask(entity,entities,'road');path=`roads/road-${mask.toString(16)}.svg`;width=128;height=64;anchor=[64,32];}
 else if(isWoodFence(entity)){mask=terrainConnectionMask(entity,entities,'fence');path=`fences/fence-${mask.toString(16)}.svg`;width=128;height=136;anchor=[64,100];}
 else if(isFlowerFence(entity)){mask=terrainConnectionMask(entity,entities,'flower-fence');path=`flower-fences/flower-fence-${mask.toString(16)}.svg`;width=128;height=136;anchor=[64,100];}
 else if(entity.kind==='field'){path=`fields/field-${fieldTerrainState(entity,state)}.svg`;width=128;height=72;anchor=[64,36];}
 else return null;
 return {path,src:new URL(`./assets/farm-terrain/${path}`,import.meta.url).href,width,height,anchor,mask};
}
