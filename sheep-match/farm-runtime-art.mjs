/** State-aware, presentation-only runtime adapter. Never writes into saved entities. */
import {CROPS,FRUITS} from './farm-config.mjs';
import {RUNTIME_ART_METADATA} from './farm-runtime-art-metadata.mjs';
export {RUNTIME_ART_METADATA};
const machineKey = {feed_mill_1:'feed-mill',feed_mill_2:'feed-mill'};
const decorKey = {sign:'wood-sign',flowerpot:'flower-pot',haystack:'hay-bales',stone_stool:'stone-seat',flagpole:'flag',flower_fence:'flower-fence',wood_fence:'wood-fence',water_trough:'trough',flowerbed:'flower-bed',statue:'stone-statue',picnic_mat:'picnic',decor_flag:'meadow-banner',decor_windmill:'festival-windmill',decor_memorial:'land-memorial',decor_bridge:'reward-bridge'};
const dash = value => String(value||'').replaceAll('_','-');
const resolved = new Map();
function descriptor(key){
  const data=RUNTIME_ART_METADATA[key];if(!data)return null;
  if(!resolved.has(key))resolved.set(key,Object.freeze({...data,key,src:new URL(data.path,import.meta.url).href,aspect:(data.bounds[2]-data.bounds[0])/(data.bounds[3]-data.bounds[1]),animation:'static'}));
  return resolved.get(key);
}
/** null deliberately asks the existing SVG state/skin renderer to remain in use. */
export function resolveWorldArt(entity,now=0){
  if(!entity)return null;
  const {kind,configId}=entity;
  if(kind==='field'){
    const crop=entity.crop;if(!crop)return null;
    const plant=dash(crop.itemId);if(crop.readyAt<=now)return descriptor('crops/'+plant);
    const duration=Number.isFinite(crop.plantedAt)?crop.readyAt-crop.plantedAt:CROPS[crop.itemId]?.durationMs;
    const state=crop.readyAt-now>duration/2?'sprout':'grown';
    return descriptor('plant-states/crops/'+plant+'-'+state);
  }
  if(kind==='fruit'){
    if(entity.status==='ready')return descriptor('fruit-plants/'+dash(configId));
    let state=({revive:'wilt_help',withered:'wilt_final'})[entity.status];
    if(entity.status==='growing')state=entity.harvestStage===0&&entity.readyAt-now>(FRUITS[configId]?.durationMs||0)/2?'young':'growing';
    return state?descriptor('plant-states/fruit-plants/'+dash(configId)+'-'+state):null;
  }
  if(kind==='animal')return descriptor('animals/'+dash(configId));
  if(kind==='shelter')return entity.skinId?null:descriptor('buildings/'+dash(configId)+'-shelter');
  if(kind==='house')return descriptor('buildings/farmhouse');
  if(kind==='barn'||kind==='silo')return descriptor('buildings/'+kind);
  if(kind==='machine')return descriptor('buildings/'+(machineKey[configId]||dash(configId)));
  if(kind==='decoration')return descriptor('decor/'+(decorKey[configId]||dash(configId)));
  return null;
}
const escaped=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
/** SVG is only an image viewport here: no flattening, stretching or skewing the PNG. */
export function renderRuntimeArt(art,{className='',alt=''}={}){
  if(!art)return '';
  const [x0,y0,x1,y1]=art.bounds;
  return `<svg class="${escaped(className)} fw-runtime-png" viewBox="${x0} ${y0} ${x1-x0} ${y1-y0}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${escaped(alt)}" focusable="false" style="pointer-events:none"><image href="${escaped(art.src)}" x="0" y="0" width="${art.width}" height="${art.height}" /></svg>`;
}
const bitRows=new WeakMap();
/** u/v are coordinates in the CROPPED visual rectangle, not the logical footprint. */
export function runtimeArtHit(art,u,v){
  if(!art||!Number.isFinite(u)||!Number.isFinite(v)||u<0||v<0||u>=1||v>=1)return false;
  if(!art.mask)return true;
  let rows=bitRows.get(art);if(!rows){rows=art.mask.rows.map(row=>BigInt('0x'+row));bitRows.set(art,rows);}
  const n=art.mask.size,x=Math.floor(u*n),y=Math.floor(v*n);
  return !!(rows[y]&(1n<<BigInt(x)));
}
export function runtimeArtInventory(){return Object.keys(RUNTIME_ART_METADATA).sort();}
